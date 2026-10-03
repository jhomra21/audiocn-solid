import {
  For,
  createContext,
  createMemo,
  createSignal,
  untrack,
  useContext,
} from "solid-js";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { ClipIndicator } from "@/components/ui/clip-indicator";
import type { DivDOMProps } from "@compat/jsx-types";
import type { ClipIndicatorProps } from "@/components/ui/clip-indicator";
import { DbReadout, readChannel } from "@/components/ui/db-readout";
import type { DbReadoutProps } from "@/components/ui/db-readout";
import { DbScale } from "@/components/ui/db-scale";
import type { DbScaleProps } from "@/components/ui/db-scale";
import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { createBallistics, resolveBallistics } from "@/lib/audio/ballistics";
import type { Ballistics, BallisticsInput } from "@/lib/audio/ballistics";
import {
  DEFAULT_MAX_DB,
  DEFAULT_MIN_DB,
  formatDb,
  SILENCE_DB,
} from "@/lib/audio/decibels";
import { createFrameTask, createPainterClock } from "@/lib/audio/frame-loop";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import { resolveTaper } from "@/lib/audio/taper";
import type { TaperInput } from "@/lib/audio/taper";
import type {
  ChannelLevel,
  FrameSource,
  MeterFrame,
  MeterZone,
  Orientation,
  Taper,
} from "@/lib/audio/types";
import {
  CLIP_HOLD_MS,
  CLIP_THRESHOLD_DB,
  DEFAULT_ZONES,
  zoneForDb,
} from "@/lib/audio/zones";
import { omitProps } from "@/lib/props";
import { setRefValue } from "@/lib/ref";
import type { MutableRef, RefTarget } from "@/lib/ref";
import { provideContext } from "@/lib/solid-context";
import { createCompatEffect } from "@/lib/solid-effect";
import { mergeStyleVars } from "@/lib/style";
import type { StyleValue } from "@/lib/style";
import { cn } from "@/lib/utils";

const ARIA_INTERVAL_MS = 250;

const REDUCED_MOTION_INTERVAL_MS = 250;

const DEFAULT_SEGMENTS = 24;

const POSITION_EPSILON = 0.0005;

const SETTLE_EPSILON = 0.001;

export type LevelMeterVariant = "solid" | "segmented" | "gradient";

export interface LevelMeterActions {
  /** Paint a frame directly, for callers that own their own frame loop. */
  paint: (frame: MeterFrame) => void;
  /** Drop the level and the peak hold to silence. */
  reset: () => void;
}

interface LevelMeterContextValue {
  orientation: () => Orientation;
  variant: () => LevelMeterVariant;
  minDb: () => number;
  maxDb: () => number;
  taper: () => Taper;
  frames: FrameSource<MeterFrame>;
  declared: () => MeterFrame | null;
  registerChannel: (index: number, element: HTMLElement | null) => void;
}

const LevelMeterContext = createContext<LevelMeterContextValue | null>(null);

const useLevelMeter = (part: string) => {
  const context = useContext(LevelMeterContext);

  if (!context) {
    throw new Error(`${part} must be used inside LevelMeter.`);
  }

  return context;
};

const byFromDb = (zones: MeterZone[]): MeterZone[] => {
  const sorted: MeterZone[] = [];

  for (const zone of zones) {
    const index = sorted.findIndex((other) => other.fromDb > zone.fromDb);

    if (index === -1) {
      sorted.push(zone);
    } else {
      sorted.splice(index, 0, zone);
    }
  }

  return sorted;
};

const buildZoneFill = (
  zones: MeterZone[],
  taper: Taper,
  orientation: Orientation,
  variant: LevelMeterVariant
) => {
  const direction = orientation === "horizontal" ? "to right" : "to top";
  const sorted = byFromDb(zones);

  const starts = sorted.map((zone) =>
    Number((taper.toPosition(zone.fromDb) * 100).toFixed(3))
  );

  if (variant === "gradient") {
    const stops = sorted.map(
      (zone, index) => `var(--meter-${zone.zone}) ${starts[index] ?? 0}%`
    );

    const last = sorted.at(-1);

    return `linear-gradient(${direction}, ${stops.join(", ")}, var(--meter-${last?.zone ?? "ok"}) 100%)`;
  }

  const stops = sorted.map((zone, index) => {
    const start = starts[index] ?? 0;
    const end = starts[index + 1] ?? 100;

    return `var(--meter-${zone.zone}) ${start}% ${end}%`;
  });

  return `linear-gradient(${direction}, ${stops.join(", ")})`;
};

const buildSegmentMask = (orientation: Orientation, segments: number) => {
  const direction = orientation === "horizontal" ? "to right" : "to top";
  const size = `calc(100% / ${segments})`;

  return `repeating-linear-gradient(${direction}, black 0 calc(${size} - 2px), transparent calc(${size} - 2px) ${size})`;
};

const serializeLevels = (
  channels: ChannelLevel[] | undefined,
  peakDb: number | undefined,
  rmsDb: number | undefined
): string => {
  if (channels) {
    return channels.map((level) => `${level.peakDb}:${level.rmsDb}`).join("|");
  }

  if (peakDb === undefined && rmsDb === undefined) {
    return "";
  }

  return `${peakDb ?? SILENCE_DB}:${rmsDb}`;
};

const parseNumber = (text: string | undefined): number | undefined => {
  const value = Number(text);

  return Number.isNaN(value) ? undefined : value;
};

const parseLevels = (key: string): MeterFrame | null => {
  if (key === "") {
    return null;
  }

  return {
    channels: key.split("|").map((entry) => {
      const [peak, rms] = entry.split(":");

      return {
        peakDb: parseNumber(peak) ?? SILENCE_DB,
        rmsDb: parseNumber(rms),
      };
    }),
  };
};

interface ChannelState {
  element: HTMLElement;
  peak: Ballistics;
  rms: Ballistics;
  level: number;
  rmsLevel: number;
  hold: number;
  zone: string;
  active: boolean | null;
}

interface MeterScale {
  maxDb: number;
  minDb: number;
  taper: Taper;
  zones: MeterZone[];
}

interface PainterOptions {
  ballistics: BallisticsInput;
  channels: Map<number, HTMLElement>;
  latest: MutableRef<MeterFrame | null>;
  reducedMotion: boolean;
  root: MutableRef<HTMLElement | null>;
  scale: MeterScale;
  visible: MutableRef<boolean>;
}

interface MeterPainter {
  paint: (frameMs: number) => boolean;
  setScale: (scale: MeterScale) => void;
}

const silentLevel: ChannelLevel = { peakDb: SILENCE_DB };

const noop = () => {};

const writePosition = (
  element: HTMLElement,
  property: string,
  previous: number,
  next: number
) => {
  if (Math.abs(previous - next) > POSITION_EPSILON) {
    element.style.setProperty(property, next.toFixed(4));

    return next;
  }

  return previous;
};

interface ChannelPaint {
  db: number;
  settled: boolean;
}

const createMeterPainter = (options: PainterOptions): MeterPainter => {
  const ballisticsOptions: BallisticsInput = options.reducedMotion
    ? "instant"
    : options.ballistics;

  const states = new Map<number, ChannelState>();
  const clock = createPainterClock();
  let { scale } = options;
  let clipUntil = 0;
  let clippingShown: boolean | null = null;
  let lastAriaMs = Number.NEGATIVE_INFINITY;
  let ariaShown: string | null = null;
  let rootZoneShown: string | null = null;
  let lastPaintMs = Number.NEGATIVE_INFINITY;

  const stateFor = (index: number, element: HTMLElement) => {
    const existing = states.get(index);

    if (existing && existing.element === element) {
      return existing;
    }

    const created: ChannelState = {
      active: null,
      element,
      hold: -1,
      level: -1,
      peak: createBallistics(ballisticsOptions),
      rms: createBallistics({
        ...resolveBallistics(ballisticsOptions),
        peakHoldMs: 0,
      }),
      rmsLevel: -1,
      zone: "",
    };

    states.set(index, created);

    return created;
  };

  const paintChannel = (
    index: number,
    element: HTMLElement,
    input: ChannelLevel,
    nowMs: number
  ): ChannelPaint => {
    const state = stateFor(index, element);
    const inputRmsDb = input.rmsDb ?? input.peakDb;
    const peak = state.peak.step(input.peakDb, nowMs);
    const rms = state.rms.step(inputRmsDb, nowMs);
    const { taper } = scale;
    const level = taper.toPosition(peak.db);
    const rmsLevel = taper.toPosition(rms.db);
    const hold = taper.toPosition(peak.holdDb);

    state.level = writePosition(element, "--meter-level", state.level, level);
    state.rmsLevel = writePosition(
      element,
      "--meter-rms",
      state.rmsLevel,
      rmsLevel
    );
    state.hold = writePosition(element, "--meter-hold", state.hold, hold);

    const zone = zoneForDb(peak.db, scale.zones);

    if (zone !== state.zone) {
      state.zone = zone;
      element.dataset.zone = zone;
    }

    const active = state.level > 0;

    if (active !== state.active) {
      state.active = active;
      element.toggleAttribute("data-active", active);
    }

    const settled =
      Math.abs(level - taper.toPosition(input.peakDb)) <= SETTLE_EPSILON &&
      Math.abs(rmsLevel - taper.toPosition(inputRmsDb)) <= SETTLE_EPSILON &&
      Math.abs(hold - level) <= SETTLE_EPSILON;

    return { db: peak.db, settled };
  };

  const paintRoot = (
    root: HTMLElement,
    loudest: number,
    nowMs: number,
    settled: boolean
  ) => {
    const clipping = nowMs < clipUntil;

    if (clipping !== clippingShown) {
      clippingShown = clipping;
      root.toggleAttribute("data-clipping", clipping);
    }

    const text = formatDb(loudest, { floorDb: scale.minDb });
    const zone = zoneForDb(loudest, scale.zones);

    if (text === ariaShown && zone === rootZoneShown) {
      return;
    }

    if (!settled && nowMs - lastAriaMs < ARIA_INTERVAL_MS) {
      return;
    }

    lastAriaMs = nowMs;
    ariaShown = text;
    rootZoneShown = zone;
    const clamped = Math.min(scale.maxDb, Math.max(scale.minDb, loudest));
    root.setAttribute("aria-valuenow", clamped.toFixed(1));
    root.setAttribute("aria-valuetext", text);
    root.dataset.zone = zone;
  };

  const paint = (frameMs: number): boolean => {
    if (!options.visible.current) {
      return false;
    }

    const nowMs = clock(frameMs);

    if (
      options.reducedMotion &&
      nowMs - lastPaintMs < REDUCED_MOTION_INTERVAL_MS
    ) {
      return true;
    }

    lastPaintMs = nowMs;

    const frame = options.latest.current;
    let loudest = SILENCE_DB;
    let settled = true;
    let inputClipping = false;

    for (const [index, element] of options.channels) {
      const input = frame?.channels[index] ?? silentLevel;

      if (input.peakDb >= CLIP_THRESHOLD_DB) {
        clipUntil = nowMs + CLIP_HOLD_MS;
        inputClipping = true;
      }

      const painted = paintChannel(index, element, input, nowMs);
      loudest = Math.max(loudest, painted.db);
      settled &&= painted.settled;
    }

    const root = options.root.current;

    if (root) {
      paintRoot(root, loudest, nowMs, settled);
    }

    const releasingClip = nowMs < clipUntil && !inputClipping;

    return !settled || releasingClip;
  };

  return {
    paint,
    setScale: (next) => {
      scale = next;
    },
  };
};

type DivProps = Omit<
  DivDOMProps,
  "children" | "class" | "className" | "ref" | "style"
> & {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
  style?: StyleValue;
  ref?: RefTarget<HTMLDivElement>;
};

const DIV_OWN = ["class", "className", "children", "style", "ref"] as const;

export const LevelMeterChannels = (props: DivProps) => {
  const context = useLevelMeter("LevelMeterChannels");
  const rest = omitProps(props, DIV_OWN);

  return (
    <div
      class={cn(
        "relative flex min-h-0 min-w-0 flex-1 gap-(--meter-gap)",
        context.orientation() === "horizontal"
          ? "flex-col"
          : "h-full flex-row",
        props.class,
        props.className
      )}
      data-orientation={context.orientation()}
      data-slot="level-meter-channels"
      ref={(node) => setRefValue(props.ref, node)}
      style={props.style}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export interface LevelMeterChannelProps extends DivProps {
  index?: number;
}

const CHANNEL_OWN = [...DIV_OWN, "index"] as const;

export const LevelMeterChannel = (props: LevelMeterChannelProps) => {
  const context = useLevelMeter("LevelMeterChannel");
  const rest = omitProps(props, CHANNEL_OWN);
  const index = () => props.index ?? 0;

  let element: HTMLDivElement | null = null;

  const setRef = (node: HTMLDivElement) => {
    element = node;
    context.registerChannel(index(), node);
    setRefValue(props.ref, node);
  };

  createCompatEffect(
    () => index(),
    (currentIndex) => {
      if (element) {
        context.registerChannel(currentIndex, element);
      }

      return () => context.registerChannel(currentIndex, null);
    }
  );

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 [--meter-hold:0] [--meter-level:0] [--meter-rms:0]",
        context.orientation() === "horizontal" ? "w-full" : "h-full",
        props.class,
        props.className
      )}
      data-index={index()}
      data-orientation={context.orientation()}
      data-slot="level-meter-channel"
      ref={setRef}
      style={props.style}
      {...rest}
    >
      {props.children}
    </div>
  );
};

export const LevelMeterTrack = (props: DivProps) => {
  const context = useLevelMeter("LevelMeterTrack");
  const rest = omitProps(props, DIV_OWN);
  const horizontal = () => context.orientation() === "horizontal";

  return (
    <div
      class={cn(
        "bg-muted relative overflow-hidden rounded-full",
        horizontal()
          ? "h-(--meter-thickness) w-full"
          : "h-full w-(--meter-thickness)",
        props.class,
        props.className
      )}
      data-orientation={context.orientation()}
      data-slot="level-meter-track"
      ref={(node) => setRefValue(props.ref, node)}
      style={props.style}
      {...rest}
    >
      {context.variant() === "segmented" ? (
        <div
          aria-hidden={"true"}
          class="absolute inset-0 bg-(image:--meter-fill) mask-(--meter-mask) opacity-20"
          data-slot="level-meter-segments"
        />
      ) : null}
      {props.children}
    </div>
  );
};

export interface LevelMeterBarProps extends DivProps {
  measure?: "peak" | "rms";
}

const BAR_OWN = [...DIV_OWN, "measure"] as const;

export const LevelMeterBar = (props: LevelMeterBarProps) => {
  const context = useLevelMeter("LevelMeterBar");
  const rest = omitProps(props, BAR_OWN);
  const measure = () => props.measure ?? "peak";
  const horizontal = () => context.orientation() === "horizontal";

  return (
    <div
      aria-hidden={"true"}
      class={cn(
        "absolute inset-0 overflow-hidden",
        measure() === "rms"
          ? "[--meter-bar-level:var(--meter-rms)]"
          : "[--meter-bar-level:var(--meter-level)]",
        horizontal()
          ? "translate-x-[calc((var(--meter-bar-level)_-_1)_*_100%)]"
          : "translate-y-[calc((1_-_var(--meter-bar-level))_*_100%)]",
        props.class,
        props.className
      )}
      data-measure={measure()}
      data-slot="level-meter-bar"
      ref={(node) => setRefValue(props.ref, node)}
      style={props.style}
      {...rest}
    >
      <div
        class={cn(
          "absolute inset-0 bg-(image:--meter-fill) mask-(--meter-mask)",
          horizontal()
            ? "translate-x-[calc((1_-_var(--meter-bar-level))_*_100%)]"
            : "translate-y-[calc((var(--meter-bar-level)_-_1)_*_100%)]"
        )}
        data-slot="level-meter-fill"
      />
    </div>
  );
};

export const LevelMeterHold = (props: DivProps) => {
  const context = useLevelMeter("LevelMeterHold");
  const rest = omitProps(props, DIV_OWN);
  const horizontal = () => context.orientation() === "horizontal";

  return (
    <div
      aria-hidden={"true"}
      class={cn(
        "pointer-events-none absolute inset-0 opacity-[calc(var(--meter-hold)_*_50)]",
        horizontal()
          ? "translate-x-[calc((var(--meter-hold)_-_1)_*_100%)]"
          : "translate-y-[calc((1_-_var(--meter-hold))_*_100%)]"
      )}
      data-slot="level-meter-hold"
      ref={(node) => setRefValue(props.ref, node)}
      style={props.style}
      {...rest}
    >
      <div
        class={cn(
          "bg-foreground/80 absolute",
          horizontal() ? "inset-y-0 right-0 w-0.5" : "inset-x-0 top-0 h-0.5",
          props.class,
          props.className
        )}
      />
    </div>
  );
};

export interface LevelMeterScaleProps extends DbScaleProps {
  minDb?: never;
  maxDb?: never;
  taper?: never;
  orientation?: never;
}

export const LevelMeterScale = (props: LevelMeterScaleProps) => {
  const context = useLevelMeter("LevelMeterScale");
  const rest = omitProps(props, ["class", "className"] as const);

  return (
    <DbScale
      class={cn(
        context.orientation() === "horizontal" &&
          "absolute top-[calc(100%+var(--meter-gap))] left-0 h-(--meter-scale-size)",
        props.class,
        props.className
      )}
      maxDb={context.maxDb()}
      minDb={context.minDb()}
      orientation={context.orientation()}
      taper={context.taper()}
      {...rest}
    />
  );
};

export interface LevelMeterValueProps extends DbReadoutProps {
  source?: never;
  value?: never;
}

export const LevelMeterValue = (props: LevelMeterValueProps) => {
  const context = useLevelMeter("LevelMeterValue");
  const rest = omitProps(props, ["class", "className"] as const);

  const value = createMemo(() => {
    const declared = context.declared();

    return declared
      ? readChannel(
          declared,
          props.measure ?? "peak",
          props.channel ?? "max"
        )
      : undefined;
  });

  return (
    <DbReadout
      class={props.class ?? props.className ?? "text-muted-foreground text-xs"}
      floorDb={context.minDb()}
      source={context.declared() ? null : context.frames}
      value={value()}
      {...rest}
    />
  );
};

export interface LevelMeterClipProps extends ClipIndicatorProps {
  source?: never;
}

export const LevelMeterClip = (props: LevelMeterClipProps) => {
  const context = useLevelMeter("LevelMeterClip");

  return <ClipIndicator source={context.frames} {...props} />;
};

export const levelMeterVariants = cva(
  "group/level-meter flex gap-2 [--meter-gap:0.25rem] [overflow-anchor:none] data-dimmed:opacity-50",
  {
    defaultVariants: {
      orientation: "horizontal",
      size: "default",
    },
    variants: {
      orientation: {
        horizontal:
          "w-full flex-row items-center [--meter-scale-size:1rem] has-[[data-slot=db-scale]]:pb-[calc(var(--meter-scale-size)+var(--meter-gap))]",
        vertical: "min-h-32 flex-col items-center",
      },
      size: {
        default: "[--meter-thickness:0.5rem]",
        lg: "[--meter-thickness:0.75rem]",
        sm: "[--meter-thickness:0.25rem]",
      },
    },
  }
);

export interface LevelMeterProps
  extends DivProps,
    Omit<VariantProps<typeof levelMeterVariants>, "orientation"> {
  source?: FrameSource<MeterFrame> | null;
  peakDb?: number;
  rmsDb?: number;
  channels?: ChannelLevel[];
  channelCount?: number;
  minDb?: number;
  maxDb?: number;
  zones?: MeterZone[];
  ballistics?: BallisticsInput;
  taper?: TaperInput;
  orientation?: Orientation;
  variant?: LevelMeterVariant;
  segments?: number;
  size?: AudioSize;
  actionsRef?: RefTarget<LevelMeterActions>;
}

const METER_OWN = [
  ...DIV_OWN,
  "source",
  "peakDb",
  "rmsDb",
  "channels",
  "channelCount",
  "minDb",
  "maxDb",
  "zones",
  "ballistics",
  "taper",
  "orientation",
  "variant",
  "segments",
  "size",
  "actionsRef",
] as const;

const styleWithMeterVars = (
  style: DivProps["style"],
  fill: string,
  mask: string
): StyleValue =>
  mergeStyleVars(style, {
    "--meter-fill": fill,
    "--meter-mask": mask,
  });

export const LevelMeter = (props: LevelMeterProps) => {
  const config = useAudioConfig();
  const rest = omitProps(props, METER_OWN);

  const ballistics = () => props.ballistics ?? config.ballistics ?? "peak";
  const dimmed = () => config.dimmed ?? false;
  const maxDb = () => props.maxDb ?? config.maxDb ?? DEFAULT_MAX_DB;
  const minDb = () => props.minDb ?? config.minDb ?? DEFAULT_MIN_DB;

  const orientation = () =>
    props.orientation ?? config.orientation ?? "horizontal";

  const size = () => props.size ?? config.size ?? "default";
  const zones = () => props.zones ?? config.zones ?? DEFAULT_ZONES;
  const variant = () => props.variant ?? "solid";
  const segments = () => props.segments ?? DEFAULT_SEGMENTS;
  const taperInput = () => props.taper ?? "linear";

  const reducedMotion = useReducedMotion();
  const frames = createFrameEmitter<MeterFrame>();
  const latestRef: MutableRef<MeterFrame | null> = { current: null };
  const rootRef: MutableRef<HTMLElement | null> = { current: null };
  const channelsRef = new Map<number, HTMLElement>();
  let wake = noop;
  const [rootElement, setRootElement] = createSignal<HTMLElement | null>(null);

  const visibleRef = useVisibility(rootElement, (visible) => {
    if (visible) {
      wake();
    }
  });

  const [observedCount, setObservedCount] = createSignal<number | null>(null);

  const accept = (frame: MeterFrame) => {
    latestRef.current = frame;
    frames.emit(frame);

    if (visibleRef.current) {
      wake();
    }
  };

  const acceptAndCount = (frame: MeterFrame) => {
    accept(frame);
    const count = frame.channels.length;

    if (count > 0) {
      setObservedCount((previous) => (previous === count ? previous : count));
    }
  };

  useFrameSource(() => props.source, acceptAndCount);

  const declarativeKey = createMemo(() =>
    serializeLevels(props.channels, props.peakDb, props.rmsDb)
  );

  const declaredCount = createMemo<number | null>(() => {
    if (props.channels) {
      return props.channels.length;
    }

    return declarativeKey() === "" ? null : 1;
  });

  const channelCount = createMemo(
    () => declaredCount() ?? observedCount() ?? props.channelCount ?? 1
  );

  const declared = createMemo(() =>
    props.source ? null : parseLevels(declarativeKey())
  );

  createCompatEffect(
    () => parseLevels(declarativeKey()),
    (frame) => {
      if (frame) {
        accept(frame);
      }
    }
  );

  const taperFn = createMemo(() =>
    resolveTaper(taperInput(), minDb(), maxDb())
  );

  const registerChannel = (index: number, element: HTMLElement | null) => {
    if (element) {
      channelsRef.set(index, element);
    } else {
      channelsRef.delete(index);
    }

    wake();
  };

  const resolvedBallistics = createMemo(() => resolveBallistics(ballistics()));

  const ballisticsKey = createMemo(() =>
    JSON.stringify(resolvedBallistics())
  );

  const scale = createMemo<MeterScale>(() => ({
    maxDb: maxDb(),
    minDb: minDb(),
    taper: taperFn(),
    zones: zones(),
  }));

  let painter: MeterPainter | null = null;

  createCompatEffect(
    () => ({
      ballisticsKey: ballisticsKey(),
      reducedMotion: reducedMotion(),
    }),
    ({ ballisticsKey: _ballisticsKey, reducedMotion: reduce }) => {
      const nextPainter = createMeterPainter({
        ballistics: untrack(resolvedBallistics),
        channels: channelsRef,
        latest: latestRef,
        reducedMotion: reduce,
        root: rootRef,
        scale: untrack(scale),
        visible: visibleRef,
      });

      const task = createFrameTask(nextPainter.paint);
      painter = nextPainter;
      wake = task.wake;

      return () => {
        if (painter === nextPainter) {
          painter = null;
        }

        if (wake === task.wake) {
          wake = noop;
        }

        task.stop();
      };
    }
  );

  createCompatEffect(scale, (nextScale) => {
    painter?.setScale(nextScale);
    wake();
  });

  const actions: LevelMeterActions = {
    paint: acceptAndCount,
    reset: () => accept({ channels: [] }),
  };

  createCompatEffect(
    () => props.actionsRef,
    (ref) => {
      setRefValue(ref, actions);

      return () => setRefValue(ref, null);
    }
  );

  const zoneFill = createMemo(() =>
    buildZoneFill(zones(), taperFn(), orientation(), variant())
  );

  const segmentMask = createMemo(() =>
    variant() === "segmented"
      ? buildSegmentMask(orientation(), segments())
      : "none"
  );

  const context: LevelMeterContextValue = {
    declared,
    frames,
    maxDb,
    minDb,
    orientation,
    registerChannel,
    taper: taperFn,
    variant,
  };

  const setRootRef = (node: HTMLDivElement) => {
    rootRef.current = node;
    setRootElement(node);
    setRefValue(props.ref, node);
  };

  createCompatEffect(
    () => rootElement(),
    () => () => {
      rootRef.current = null;
      setRefValue(props.ref, null);
    }
  );

  return provideContext(LevelMeterContext, context, () => (
    <div
      aria-valuemax={maxDb()}
      aria-valuemin={minDb()}
      aria-valuenow={minDb()}
      class={cn(
        levelMeterVariants({ orientation: orientation(), size: size() }),
        props.class,
        props.className
      )}
      data-dimmed={dimmed() ? "" : undefined}
      data-orientation={orientation()}
      data-size={size()}
      data-slot="level-meter"
      data-variant={variant()}
      ref={setRootRef}
      role="meter"
      style={styleWithMeterVars(props.style, zoneFill(), segmentMask())}
      {...rest}
    >
      {props.children ?? (
        <LevelMeterChannels>
          <For each={Array.from({ length: channelCount() }, (_, index) => index)}>
            {(index) => (
              <LevelMeterChannel index={index}>
                <LevelMeterTrack>
                  <LevelMeterBar />
                  <LevelMeterHold />
                </LevelMeterTrack>
              </LevelMeterChannel>
            )}
          </For>
        </LevelMeterChannels>
      )}
    </div>
  ));
};
