import { cva } from "class-variance-authority";
import {
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  Show,
  useContext,
} from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { getSharedAudioContext } from "@/hooks/use-audio-context";
import { clamp } from "@/lib/audio/decibels";
import { linearTaper, logTaper } from "@/lib/audio/taper";
import type { Taper } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  GroupDOMProps,
  LineDOMProps,
  PathDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

const VIEWBOX = 100;

const CENTER = 50;

const RADIUS = 40;

const FINE_FACTOR = 0.1;

const PRECISION = 1e6;

const DEGREES_TO_RADIANS = Math.PI / 180;

const HALF_TURN = 180;

const WIDTH_SAMPLES = 24;

const NUMBER = /[-+]?(?:\\d+\\.?\\d*|\\.\\d+)/u;

const THOUSANDS = /\\d\\s*k/iu;

const THOUSAND = 1000;

const COORDINATE_PRECISION = 1e4;

const DEAD_ZONE = 0.25;

const SCALE = {
  label: 47.5,
  labelSize: 4.5,
  majorInner: 34.5,
  majorOuter: 43.5,
  minorInner: 35.5,
  minorOuter: 40.5,
} as const;

const CAP = {
  default: {
    bezel: 25.5,
    face: 22.5,
    halo: 34,
    haloFrom: 0.6,
    rim: 23.3,
  },
  mini: {
    bezel: 32,
    face: 28.2,
    halo: 36,
    haloFrom: 0.8,
    rim: 29.2,
  },
} as const;

const CAP_DOT = {
  distance: 17,
  radius: 1.6,
} as const;

const CAP_LINE = {
  inner: 8.5,
  lip: 0.6,
  outer: 23,
  width: 3.4,
} as const;

const TICK_EPSILON = 1e-9;

const CLICK_INTERVAL_MS = 30;

const CLICK_SECONDS = 0.006;

const CLICK_VOLUME = 0.12;

const CLICK_PITCH_SPREAD = 0.04;

const CLICK_PARTS = [
  { decay: 0.0004, gain: 0.6, hz: 0 },
  { decay: 0.0012, gain: 0.4, hz: 4200 },
] as const;

const DETENT_EPSILON = 1e-9;

export type KnobChangeReason =
  | "drag"
  | "keyboard"
  | "wheel"
  | "reset"
  | "input";

export interface KnobChangeDetails {
  reason: KnobChangeReason;
  event?: Event;
}

type KnobDragDirection =
  | "vertical"
  | "horizontal"
  | "circular";

interface KnobContextValue {
  arc: () => number;
  disabled: () => boolean;
  editing: () => boolean;
  format: () => (value: number) => string;
  labelId: string;
  originPosition: () => number;
  parse: () => (text: string) => number | null;
  position: () => number;
  setEditing: (editing: boolean) => void;
  value: () => number;
  valueWidth: () => number;
}

interface KnobDialContextValue {
  allowWheel: () => boolean;
  change: (
    value: number,
    details: KnobChangeDetails
  ) => void;
  commit: (value: number) => void;
  dragDirection: () => KnobDragDirection;
  fineStep: () => number;
  largeStep: () => number;
  latest: () => number;
  max: () => number;
  min: () => number;
  quantize: (
    value: number,
    increment: number
  ) => number;
  resetValue: () => number;
  sensitivity: () => number;
  setDetents: (
    positions: readonly number[] | null
  ) => void;
  step: () => number;
  taper: () => Taper;
}

const KnobContext =
  createContext<KnobContextValue | null>(null);

const KnobDialContext =
  createContext<KnobDialContextValue | null>(null);

const useKnob = (part: string): KnobContextValue => {
  const context = useContext(KnobContext);

  if (!context) {
    throw new Error(`${part} must be used inside Knob.`);
  }

  return context;
};

const useKnobDial = (): KnobDialContextValue => {
  const context = useContext(KnobDialContext);

  if (!context) {
    throw new Error("KnobDial must be used inside Knob.");
  }

  return context;
};

const roundValue = (value: number): number =>
  Math.round(value * PRECISION) / PRECISION;

const widestValue = (
  format: (value: number) => string,
  taper: Taper,
  snap: (value: number) => number
): number => {
  let widest = 0;

  for (
    let index = 0;
    index <= WIDTH_SAMPLES;
    index += 1
  ) {
    const sample = snap(
      taper.toValue(index / WIDTH_SAMPLES)
    );

    widest = Math.max(
      widest,
      format(sample).length
    );
  }

  return widest;
};

/**
 * Reads the first number in text. Unicode minus is accepted and
 * "k" means thousands.
 */
export const parseKnobValue = (
  text: string
): number | null => {
  const normalized = text.replaceAll("\u2212", "-");
  const match = NUMBER.exec(normalized);

  if (!match) {
    return null;
  }

  const number = Number(match[0]);

  return THOUSANDS.test(normalized)
    ? number * THOUSAND
    : number;
};

const angleFor = (
  position: number,
  arc: number
): number => -arc / 2 + position * arc;

const roundCoordinate = (value: number): number =>
  Math.round(value * COORDINATE_PRECISION) /
  COORDINATE_PRECISION;

const pointAt = (
  angle: number,
  radius: number
) => {
  const radians = angle * DEGREES_TO_RADIANS;

  return {
    x: roundCoordinate(
      CENTER + radius * Math.sin(radians)
    ),
    y: roundCoordinate(
      CENTER - radius * Math.cos(radians)
    ),
  };
};

const arcPath = (
  fromAngle: number,
  toAngle: number,
  radius = RADIUS
): string => {
  const start = Math.min(fromAngle, toAngle);
  const end = Math.max(fromAngle, toAngle);

  if (end - start < 0.01) {
    return "";
  }

  const from = pointAt(start, radius);

  const to = pointAt(end, radius);

  const largeArc =
    end - start > HALF_TURN ? 1 : 0;

  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${largeArc} 1 ${to.x} ${to.y}`;
};

const keyTarget = (
  key: string,
  current: number,
  increment: number,
  dial: KnobDialContextValue
): number | null => {
  switch (key) {
    case "ArrowDown":
    case "ArrowLeft": {
      return current - increment;
    }

    case "ArrowRight":
    case "ArrowUp": {
      return current + increment;
    }

    case "End": {
      return dial.max();
    }

    case "Home": {
      return dial.min();
    }

    case "PageDown": {
      return current - dial.largeStep();
    }

    case "PageUp": {
      return current + dial.largeStep();
    }

    default: {
      return null;
    }
  }
};

const incrementFor = (
  event: {
    altKey: boolean;
    shiftKey: boolean;
  },
  dial: KnobDialContextValue
): number => {
  if (event.altKey) {
    return dial.fineStep();
  }

  return event.shiftKey
    ? dial.largeStep()
    : dial.step();
};

interface DragState {
  angle: number | null;
  position: number;
  x: number;
  y: number;
}

const pointerAngle = (
  event: {
    clientX: number;
    clientY: number;
  },
  element: HTMLElement
): number | null => {
  const rect = element.getBoundingClientRect();

  const x =
    event.clientX -
    (rect.left + rect.width / 2);

  const y =
    event.clientY -
    (rect.top + rect.height / 2);

  if (
    Math.hypot(x, y) <
    (rect.width / 2) * DEAD_ZONE
  ) {
    return null;
  }

  return (
    Math.atan2(x, -y) /
    DEGREES_TO_RADIANS
  );
};

const dragAngle = (
  event: PointerEvent,
  element: HTMLDivElement,
  dial: KnobDialContextValue
): number | null =>
  dial.dragDirection() === "circular"
    ? pointerAngle(event, element)
    : null;

const turnBetween = (
  from: number,
  to: number
): number =>
  ((to - from + HALF_TURN * 3) %
    (HALF_TURN * 2)) -
  HALF_TURN;

const dragPosition = (
  event: PointerEvent,
  last: DragState,
  angle: number | null,
  dial: KnobDialContextValue,
  arc: number
): number => {
  const fine = event.shiftKey
    ? FINE_FACTOR
    : 1;

  if (dial.dragDirection() === "circular") {
    if (
      last.angle === null ||
      angle === null
    ) {
      return last.position;
    }

    const turn = turnBetween(
      last.angle,
      angle
    );

    return clamp(
      last.position +
        (turn / arc) * fine,
      0,
      1
    );
  }

  const delta =
    dial.dragDirection() === "vertical"
      ? last.y - event.clientY
      : event.clientX - last.x;

  return clamp(
    last.position +
      (delta / dial.sensitivity()) *
        fine,
    0,
    1
  );
};

const reachesDetent = (
  detents: readonly number[],
  from: number,
  to: number
): boolean =>
  detents.some((detent) =>
    from < to
      ? detent >
          from + DETENT_EPSILON &&
        detent <= to + DETENT_EPSILON
      : detent <
          from - DETENT_EPSILON &&
        detent >= to - DETENT_EPSILON
  );

const reachesMultiple = (
  from: number,
  to: number,
  min: number,
  every: number
): boolean => {
  const start = roundValue(
    (from - min) / every
  );

  const end = roundValue(
    (to - min) / every
  );

  return from < to
    ? Math.floor(end) >
        Math.floor(start)
    : Math.ceil(start) >
        Math.ceil(end);
};

const clickBuffers = new WeakMap<
  BaseAudioContext,
  AudioBuffer
>();

let lastClickAt =
  Number.NEGATIVE_INFINITY;

const clickBuffer = (
  context: BaseAudioContext
): AudioBuffer => {
  const cached = clickBuffers.get(context);

  if (cached) {
    return cached;
  }

  const { sampleRate } = context;

  const buffer = context.createBuffer(
    1,
    Math.ceil(
      CLICK_SECONDS * sampleRate
    ),
    sampleRate
  );

  const samples = buffer.getChannelData(0);

  for (
    let index = 0;
    index < samples.length;
    index += 1
  ) {
    const time = index / sampleRate;
    let sample = 0;

    for (const part of CLICK_PARTS) {
      const wave =
        part.hz === 0
          ? Math.random() * 2 - 1
          : Math.sin(
              2 *
                Math.PI *
                part.hz *
                time
            );

      sample +=
        part.gain *
        wave *
        Math.exp(-time / part.decay);
    }

    samples[index] = sample;
  }

  clickBuffers.set(context, buffer);

  return buffer;
};

const resumeContext = async (
  context: AudioContext
): Promise<void> => {
  try {
    await context.resume();
  } catch {
    // A later user gesture can try again.
  }
};

const playClick = (): void => {
  const now = performance.now();

  const context =
    getSharedAudioContext();

  if (
    !context ||
    now - lastClickAt <
      CLICK_INTERVAL_MS
  ) {
    return;
  }

  lastClickAt = now;

  if (context.state === "suspended") {
    void resumeContext(context);
  }

  const source =
    context.createBufferSource();

  source.buffer = clickBuffer(context);
  source.playbackRate.value =
    1 +
    (Math.random() - 0.5) *
      CLICK_PITCH_SPREAD *
      2;

  const gain = context.createGain();

  gain.gain.value = CLICK_VOLUME;

  source
    .connect(gain)
    .connect(context.destination);

  source.addEventListener(
    "ended",
    () => {
      source.disconnect();
      gain.disconnect();
    }
  );

  source.start();
};

const knobVariants = cva(
  "group/knob inline-flex flex-col items-center gap-1.5 select-none data-disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
    },
    variants: {
      size: {
        default:
          "[--knob-size:3rem]",
        lg: "[--knob-size:4rem]",
        sm: "[--knob-size:2.25rem]",
      },
    },
  }
);

const knobCapVariants = cva(
  "[--knob-cap-metal:var(--color-white)] [--knob-cap-shade:var(--color-black)]",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "[--knob-cap-pitch:0.3px]",
        mini:
          "[--knob-cap-pitch:0.9px]",
      },
    },
  }
);

export interface KnobProps
  extends Omit<
    DivDOMProps,
    | "children"
    | "class"
    | "className"
    | "onChange"
    | "ref"
  > {
  allowWheel?: boolean;
  arc?: number;
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
  clickSound?: boolean;
  defaultValue?: number;
  disabled?: boolean;
  dragDirection?: KnobDragDirection;
  fineStep?: number;
  format?: (value: number) => string;
  largeStep?: number;
  max?: number;
  min?: number;
  onValueChange?: (
    value: number,
    details: KnobChangeDetails
  ) => void;
  onValueCommitted?: (
    value: number
  ) => void;
  origin?: number;
  parse?: (
    text: string
  ) => number | null;
  resetValue?: number;
  scale?: "linear" | "log";
  sensitivity?: number;
  size?: AudioSize;
  step?: number;
  value?: number;
}

const KNOB_OWN = [
  "allowWheel",
  "arc",
  "children",
  "class",
  "className",
  "clickSound",
  "defaultValue",
  "disabled",
  "dragDirection",
  "fineStep",
  "format",
  "largeStep",
  "max",
  "min",
  "onValueChange",
  "onValueCommitted",
  "origin",
  "parse",
  "resetValue",
  "scale",
  "sensitivity",
  "size",
  "step",
  "value",
] as const;

export const Knob = (
  props: KnobProps
) => {
  const rest = omitProps(
    props,
    KNOB_OWN
  );

  const config = useAudioConfig();

  const labelId =
    `knob-${createUniqueId()}-label`;

  const min = () => props.min ?? 0;
  const max = () => props.max ?? 100;
  const step = () => props.step ?? 1;

  const largeStep = () =>
    props.largeStep ?? 10;

  const fineStep = () =>
    props.fineStep ??
    step() * FINE_FACTOR;

  const resetValue = () =>
    props.resetValue ??
    props.defaultValue ??
    min();

  const originValue = () =>
    clamp(
      props.origin ?? min(),
      min(),
      max()
    );

  const arc = () =>
    props.arc ?? 270;

  const dragDirection = () =>
    props.dragDirection ??
    "vertical";

  const sensitivity = () =>
    props.sensitivity ?? 200;

  const scale = () =>
    props.scale ?? "linear";

  const allowWheel = () =>
    props.allowWheel ?? false;

  const clickSound = () =>
    props.clickSound ?? false;

  const format = () =>
    props.format ?? String;

  const parse = () =>
    props.parse ?? parseKnobValue;

  const size = () =>
    props.size ??
    config.size ??
    "default";

  const disabled = () =>
    props.disabled ??
    config.disabled ??
    false;

  const [uncontrolled, setUncontrolled] =
    createSignal(
      clamp(
        props.defaultValue ??
          resetValue(),
        min(),
        max()
      )
    );

  const value = () =>
    props.value ?? uncontrolled();

  let latestValue = value();

  createCompatEffect(
    value,
    (next) => {
      latestValue = next;
    }
  );

  const taper = createMemo<Taper>(() =>
    scale() === "log"
      ? logTaper(min(), max())
      : linearTaper(min(), max())
  );

  const quantize = (
    next: number,
    increment: number
  ): number => {
    const stepped =
      min() +
      Math.round(
        (next - min()) / increment
      ) *
        increment;

    return roundValue(
      clamp(
        stepped,
        min(),
        max()
      )
    );
  };

  const [detents, setDetents] =
    createSignal<
      readonly number[] | null
    >(null);

  const clicksBetween = createMemo<
    | ((
        from: number,
        to: number
      ) => boolean)
    | null
  >(() => {
    if (!clickSound()) {
      return null;
    }

    const positions = detents();

    if (positions) {
      return (
        from: number,
        to: number
      ) =>
        reachesDetent(
          positions,
          taper().toPosition(from),
          taper().toPosition(to)
        );
    }

    return (
      from: number,
      to: number
    ) =>
      reachesMultiple(
        from,
        to,
        min(),
        largeStep()
      );
  });

  const change = (
    next: number,
    details: KnobChangeDetails
  ) => {
    const previous = latestValue;

    if (next === previous) {
      return;
    }

    latestValue = next;

    if (props.value === undefined) {
      setUncontrolled(next);
    }

    props.onValueChange?.(
      next,
      details
    );

    if (
      clicksBetween()?.(
        previous,
        next
      )
    ) {
      playClick();
    }

    if (props.value !== undefined) {
      queueMicrotask(() => {
        latestValue = value();
      });
    }
  };

  const commit = (next: number) => {
    props.onValueCommitted?.(next);
  };

  const position = () =>
    taper().toPosition(value());

  const originPosition = () =>
    taper().toPosition(
      originValue()
    );

  const [editing, setEditing] =
    createSignal(false);

  const valueWidth = createMemo(() =>
    widestValue(
      format(),
      taper(),
      (next) =>
        quantize(next, step())
    )
  );

  const context: KnobContextValue = {
    arc,
    disabled,
    editing,
    format,
    labelId,
    originPosition,
    parse,
    position,
    setEditing,
    value,
    valueWidth,
  };

  const dial: KnobDialContextValue = {
    allowWheel,
    change,
    commit,
    dragDirection,
    fineStep,
    largeStep,
    latest: () => latestValue,
    max,
    min,
    quantize,
    resetValue,
    sensitivity,
    setDetents: (positions) => {
      setDetents(positions);
    },
    step,
    taper,
  };

  return provideContext(
    KnobContext,
    context,
    () =>
      provideContext(
        KnobDialContext,
        dial,
        () => (
          <div
            class={cn(
              knobVariants({
                size: size(),
              }),
              props.class,
              props.className
            )}
            data-at-origin={
              value() === originValue()
                ? ""
                : undefined
            }
            data-disabled={
              disabled()
                ? ""
                : undefined
            }
            data-size={size()}
            data-slot="knob"
            {...rest}
          >
            {props.children ?? (
              <KnobDial>
                <KnobTrack />
                <KnobRange />
                <KnobPointer />
              </KnobDial>
            )}
          </div>
        )
      )
  );
};

export interface KnobDialProps
  extends Omit<
    DivDOMProps,
    | "children"
    | "class"
    | "className"
    | "onDoubleClick"
    | "style"
  > {
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
  onDoubleClick?: (
    event: MouseEvent
  ) => void;
  style?: StyleValue;
}

const DIAL_OWN = [
  "children",
  "class",
  "className",
  "onDoubleClick",
  "style",
] as const;

export const KnobDial = (
  props: KnobDialProps
) => {
  const context = useKnob(
    "KnobDial"
  );

  const dial = useKnobDial();

  const rest = omitProps(
    props,
    DIAL_OWN
  );

  const [dragging, setDragging] =
    createSignal(false);

  let dialElement:
    | HTMLDivElement
    | undefined;

  let drag:
    | DragState
    | null = null;

  const reset = (
    event?: Event
  ) => {
    dial.change(
      dial.resetValue(),
      {
        event,
        reason: "reset",
      }
    );

    dial.commit(
      dial.resetValue()
    );
  };

  createCompatEffect(
    () =>
      [
        dial.allowWheel(),
        context.disabled(),
      ] as const,
    ([wheel, disabled]) => {
      const element = dialElement;

      if (!element || !wheel) {
        return;
      }

      const listener = (
        event: WheelEvent
      ) => {
        const delta =
          event.deltaY ||
          event.deltaX;

        if (
          disabled ||
          document.activeElement !==
            element ||
          delta === 0
        ) {
          return;
        }

        event.preventDefault();

        const fine =
          event.shiftKey ||
          event.altKey;

        const increment = fine
          ? dial.fineStep()
          : dial.step();

        const direction =
          delta < 0 ? 1 : -1;

        const next =
          dial.quantize(
            dial.latest() +
              direction *
                increment,
            increment
          );

        dial.change(next, {
          event,
          reason: "wheel",
        });

        dial.commit(next);
      };

      element.addEventListener(
        "wheel",
        listener,
        {
          passive: false,
        }
      );

      return () => {
        element.removeEventListener(
          "wheel",
          listener
        );
      };
    }
  );

  const endDrag = (
    event: PointerEvent
  ) => {
    const target =
      event.currentTarget;

    if (
      !drag ||
      !(
        target instanceof
        HTMLDivElement
      )
    ) {
      return;
    }

    drag = null;
    setDragging(false);

    if (
      target.hasPointerCapture(
        event.pointerId
      )
    ) {
      target.releasePointerCapture(
        event.pointerId
      );
    }

    dial.commit(
      dial.latest()
    );
  };

  return (
    <div
      aria-disabled={
        context.disabled()
          ? "true"
          : undefined
      }
      aria-labelledby={
        context.labelId
      }
      aria-valuemax={dial.max()}
      aria-valuemin={dial.min()}
      aria-valuenow={
        context.value()
      }
      aria-valuetext={context
        .format()(context.value())}
      class={cn(
        "relative size-(--knob-size) cursor-grab touch-none rounded-full outline-none aria-disabled:cursor-default data-dragging:cursor-grabbing",
        props.class,
        props.className
      )}
      data-dragging={
        dragging()
          ? ""
          : undefined
      }
      data-slot="knob-dial"
      onDblClick={(
        event: MouseEvent
      ) => {
        props.onDoubleClick?.(
          event
        );

        if (
          !context.disabled()
        ) {
          reset(event);
        }
      }}
      onKeyDown={(
        event: KeyboardEvent
      ) => {
        if (
          context.disabled()
        ) {
          return;
        }

        if (
          event.key === "Enter"
        ) {
          event.preventDefault();
          context.setEditing(true);

          return;
        }

        const increment =
          incrementFor(
            event,
            dial
          );

        const next = keyTarget(
          event.key,
          dial.latest(),
          increment,
          dial
        );

        if (next === null) {
          return;
        }

        event.preventDefault();

        const quantized =
          dial.quantize(
            next,
            Math.min(
              increment,
              dial.step()
            )
          );

        dial.change(
          quantized,
          {
            event,
            reason:
              "keyboard",
          }
        );

        dial.commit(
          quantized
        );
      }}
      onLostPointerCapture={
        endDrag
      }
      onPointerDown={(
        event: PointerEvent
      ) => {
        const target =
          event.currentTarget;

        if (
          context.disabled() ||
          event.button !== 0 ||
          !(
            target instanceof
            HTMLDivElement
          )
        ) {
          return;
        }

        if (event.altKey) {
          event.preventDefault();
          reset(event);

          return;
        }

        target.setPointerCapture(
          event.pointerId
        );

        target.focus();

        drag = {
          angle: dragAngle(
            event,
            target,
            dial
          ),
          position: dial
            .taper()
            .toPosition(
              dial.latest()
            ),
          x: event.clientX,
          y: event.clientY,
        };

        setDragging(true);
      }}
      onPointerMove={(
        event: PointerEvent
      ) => {
        const target =
          event.currentTarget;

        const last = drag;

        if (
          !last ||
          !(
            target instanceof
            HTMLDivElement
          )
        ) {
          return;
        }

        const angle =
          dragAngle(
            event,
            target,
            dial
          );

        const next =
          dragPosition(
            event,
            last,
            angle,
            dial,
            context.arc()
          );

        drag = {
          angle,
          position: next,
          x: event.clientX,
          y: event.clientY,
        };

        const increment =
          event.shiftKey
            ? dial.fineStep()
            : dial.step();

        dial.change(
          dial.quantize(
            dial
              .taper()
              .toValue(next),
            increment
          ),
          {
            event,
            reason: "drag",
          }
        );
      }}
      onPointerUp={endDrag}
      ref={(node) => {
        dialElement = node;
      }}
      role="slider"
      style={mergeStyleVars(
        props.style,
        {
          "--knob-angle":
            `${angleFor(
              context.position(),
              context.arc()
            )}deg`,
        }
      )}
      tabindex={
        context.disabled()
          ? -1
          : 0
      }
      {...rest}
    >
      <svg
        aria-hidden="true"
        class="size-full overflow-visible"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      >
        {props.children}
      </svg>
    </div>
  );
};

export interface KnobTrackProps
  extends Omit<
    PathDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
}

const TRACK_OWN = [
  "class",
  "className",
] as const;

export const KnobTrack = (
  props: KnobTrackProps
) => {
  const context = useKnob(
    "KnobTrack"
  );

  const rest = omitProps(
    props,
    TRACK_OWN
  );

  return (
    <path
      class={cn(
        "stroke-input",
        props.class,
        props.className
      )}
      d={arcPath(
        -context.arc() / 2,
        context.arc() / 2
      )}
      data-slot="knob-track"
      fill="none"
      stroke-linecap="round"
      stroke-width={8}
      {...rest}
    />
  );
};

export interface KnobRangeProps
  extends Omit<
    PathDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
}

const RANGE_OWN = [
  "class",
  "className",
] as const;

export const KnobRange = (
  props: KnobRangeProps
) => {
  const context = useKnob(
    "KnobRange"
  );

  const rest = omitProps(
    props,
    RANGE_OWN
  );

  return (
    <path
      class={cn(
        "stroke-primary",
        props.class,
        props.className
      )}
      d={arcPath(
        angleFor(
          context.originPosition(),
          context.arc()
        ),
        angleFor(
          context.position(),
          context.arc()
        )
      )}
      data-slot="knob-range"
      fill="none"
      stroke-linecap="round"
      stroke-width={8}
      {...rest}
    />
  );
};

export interface KnobPointerProps
  extends Omit<
    LineDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
}

const POINTER_OWN = [
  "class",
  "className",
] as const;

export const KnobPointer = (
  props: KnobPointerProps
) => {
  const context = useKnob(
    "KnobPointer"
  );

  const rest = omitProps(
    props,
    POINTER_OWN
  );

  const angle = () =>
    angleFor(
      context.position(),
      context.arc()
    );

  const inner = () =>
    pointAt(
      angle(),
      RADIUS * 0.3
    );

  const outer = () =>
    pointAt(
      angle(),
      RADIUS * 0.72
    );

  return (
    <>
      <circle
        class="fill-muted stroke-border"
        cx={CENTER}
        cy={CENTER}
        r={RADIUS * 0.8}
        stroke-width={1}
      />

      <line
        class={cn(
          "stroke-foreground",
          props.class,
          props.className
        )}
        data-slot="knob-pointer"
        stroke-linecap="round"
        stroke-width={6}
        x1={inner().x}
        x2={outer().x}
        y1={inner().y}
        y2={outer().y}
        {...rest}
      />
    </>
  );
};

export interface KnobScaleProps
  extends Omit<
    GroupDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
  format?: (
    value: number
  ) => string;
  labelEvery?: number;
  majorEvery?: number;
  ticks?: number;
}

const SCALE_OWN = [
  "class",
  "className",
  "format",
  "labelEvery",
  "majorEvery",
  "ticks",
] as const;

export const KnobScale = (
  props: KnobScaleProps
) => {
  const context = useKnob(
    "KnobScale"
  );

  const dial = useKnobDial();

  const rest = omitProps(
    props,
    SCALE_OWN
  );

  const count = () =>
    Math.max(
      1,
      Math.round(
        props.ticks ?? 50
      )
    );

  const majorStep = () =>
    Math.max(
      1,
      Math.round(
        props.majorEvery ?? 5
      )
    );

  const labelEvery = () =>
    props.labelEvery ?? 10;

  const formatLabel = () =>
    props.format ??
    context.format();

  createCompatEffect(
    () =>
      [
        count(),
        majorStep(),
      ] as const,
    ([currentCount, currentMajor]) => {
      const majors: number[] = [];

      for (
        let index = 0;
        index <= currentCount;
        index += currentMajor
      ) {
        majors.push(
          index / currentCount
        );
      }

      dial.setDetents(majors);

      return () => {
        dial.setDetents(null);
      };
    }
  );

  const litFrom = () =>
    Math.min(
      context.originPosition(),
      context.position()
    ) - TICK_EPSILON;

  const litTo = () =>
    Math.max(
      context.originPosition(),
      context.position()
    ) + TICK_EPSILON;

  const marks = createMemo(() =>
    Array.from(
      {
        length:
          count() + 1,
      },
      (_, index) => {
        const tickPosition =
          index / count();

        const angle =
          angleFor(
            tickPosition,
            context.arc()
          );

        const major =
          index %
            majorStep() ===
          0;

        const inner =
          pointAt(
            angle,
            major
              ? SCALE.majorInner
              : SCALE.minorInner
          );

        const outer =
          pointAt(
            angle,
            major
              ? SCALE.majorOuter
              : SCALE.minorOuter
          );

        return {
          index,
          inner,
          major,
          outer,
          tickPosition,
        };
      }
    )
  );

  const labels = createMemo(() => {
    const every = labelEvery();

    if (every <= 0) {
      return [];
    }

    return Array.from(
      {
        length:
          Math.floor(
            count() / every
          ) + 1,
      },
      (_, index) => {
        const tickPosition =
          (index * every) /
          count();

        const angle =
          angleFor(
            tickPosition,
            context.arc()
          );

        const point =
          pointAt(
            angle,
            SCALE.label
          );

        return {
          angle,
          point,
          tickPosition,
        };
      }
    );
  });

  return (
    <g
      class={cn(
        props.class,
        props.className
      )}
      data-slot="knob-scale"
      {...rest}
    >
      <For each={marks()}>
        {(mark) => {
          const lit = () =>
            mark.tickPosition >=
              litFrom() &&
            mark.tickPosition <=
              litTo();

          return (
            <line
              class="stroke-muted-foreground/45 data-active:stroke-foreground data-major:stroke-muted-foreground data-major:data-active:stroke-foreground"
              data-active={
                lit()
                  ? ""
                  : undefined
              }
              data-major={
                mark.major
                  ? ""
                  : undefined
              }
              data-slot="knob-tick"
              stroke-width={
                mark.major
                  ? 1.1
                  : 0.55
              }
              x1={mark.inner.x}
              x2={mark.outer.x}
              y1={mark.inner.y}
              y2={mark.outer.y}
            />
          );
        }}
      </For>

      <For each={labels()}>
        {(label) => (
          <text
            class="fill-muted-foreground"
            data-slot="knob-scale-label"
            dominant-baseline="central"
            font-size={String(
              SCALE.labelSize
            )}
            text-anchor="middle"
            transform={`rotate(${label.angle} ${label.point.x} ${label.point.y})`}
            x={label.point.x}
            y={label.point.y}
          >
            {formatLabel()(
              roundValue(
                dial
                  .taper()
                  .toValue(
                    label.tickPosition
                  )
              )
            )}
          </text>
        )}
      </For>
    </g>
  );
};

type KnobCapVariant =
  | "default"
  | "mini";

const KnobCapIndicator = (
  props: {
    angle: () => number;
    variant: () => KnobCapVariant;
  }
) => {
  const dot = () =>
    pointAt(
      props.angle(),
      CAP_DOT.distance
    );

  const inner = () =>
    pointAt(
      props.angle(),
      CAP_LINE.inner
    );

  const outer = () =>
    pointAt(
      props.angle(),
      CAP_LINE.outer
    );

  return (
    <Show
      fallback={
        <>
          <line
            class="stroke-(--knob-cap-metal)/70"
            stroke-linecap="round"
            stroke-width={
              CAP_LINE.width
            }
            x1={inner().x}
            x2={outer().x}
            y1={
              inner().y +
              CAP_LINE.lip
            }
            y2={
              outer().y +
              CAP_LINE.lip
            }
          />

          <line
            class="stroke-(--knob-cap-shade)/80"
            data-slot="knob-cap-pointer"
            stroke-linecap="round"
            stroke-width={
              CAP_LINE.width
            }
            x1={inner().x}
            x2={outer().x}
            y1={inner().y}
            y2={outer().y}
          />
        </>
      }
      when={
        props.variant() ===
        "default"
      }
    >
      <circle
        class="fill-(--knob-cap-shade)/85 stroke-(--knob-cap-shade)/45"
        cx={dot().x}
        cy={dot().y}
        data-slot="knob-cap-dot"
        r={CAP_DOT.radius}
        stroke-width={0.35}
      />
    </Show>
  );
};

export interface KnobCapProps
  extends Omit<
    GroupDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
  variant?: KnobCapVariant;
}

const CAP_OWN = [
  "class",
  "className",
  "variant",
] as const;

export const KnobCap = (
  props: KnobCapProps
) => {
  const context = useKnob(
    "KnobCap"
  );

  const rest = omitProps(
    props,
    CAP_OWN
  );

  const variant = () =>
    props.variant ?? "default";

  const id =
    `knob${createUniqueId().replaceAll(
      /[^\\w-]/gu,
      ""
    )}`;

  const angle = () =>
    angleFor(
      context.position(),
      context.arc()
    );

  const cap = () =>
    CAP[variant()];

  return (
    <g
      class={cn(
        knobCapVariants({
          variant: variant(),
        }),
        props.class,
        props.className
      )}
      data-slot="knob-cap"
      data-variant={variant()}
      {...rest}
    >
      <defs>
        <filter
          height="100%"
          id={`${id}-grain`}
          width="100%"
          x="0"
          y="0"
        >
          <feTurbulence
            baseFrequency={0.9}
            numOctaves={3}
            seed={7}
            type="fractalNoise"
          />

          <feColorMatrix
            type="saturate"
            values="0"
          />

          <feComposite
            in2="SourceGraphic"
            operator="in"
          />
        </filter>

        <radialGradient
          id={`${id}-halo`}
        >
          <stop
            class="[stop-color:var(--knob-cap-shade)]"
            offset={
              cap().haloFrom
            }
            stop-opacity={0.55}
          />

          <stop
            class="[stop-color:var(--knob-cap-shade)]"
            offset="1"
            stop-opacity={0}
          />
        </radialGradient>

        <linearGradient
          id={`${id}-bezel`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            class="[stop-color:var(--knob-cap-metal)]"
            offset="0"
            stop-opacity={0.16}
          />

          <stop
            class="[stop-color:var(--knob-cap-metal)]"
            offset="1"
            stop-opacity={0}
          />
        </linearGradient>

        <linearGradient
          id={`${id}-rim`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
        >
          <stop
            class="[stop-color:var(--knob-cap-shade)]"
            offset="0"
            stop-opacity={0.62}
          />

          <stop
            class="[stop-color:var(--knob-cap-shade)]"
            offset="1"
            stop-opacity={0.08}
          />
        </linearGradient>
      </defs>

      <circle
        cx={CENTER}
        cy={CENTER}
        fill={`url(#${id}-halo)`}
        r={cap().halo}
      />

      <circle
        class="fill-(--knob-cap-shade)/85 stroke-(--knob-cap-metal)/15"
        cx={CENTER}
        cy={CENTER}
        r={cap().bezel}
        stroke-width={0.4}
      />

      <circle
        cx={CENTER}
        cy={CENTER}
        fill={`url(#${id}-bezel)`}
        r={cap().bezel}
      />

      <circle
        class="fill-(--knob-cap-metal)"
        cx={CENTER}
        cy={CENTER}
        r={cap().rim}
      />

      <circle
        cx={CENTER}
        cy={CENTER}
        fill={`url(#${id}-rim)`}
        r={cap().rim}
      />

      <foreignObject
        height={
          cap().face * 2
        }
        width={
          cap().face * 2
        }
        x={
          CENTER -
          cap().face
        }
        y={
          CENTER -
          cap().face
        }
      >
        <div
          class="size-full rounded-full bg-(--knob-cap-metal) bg-[repeating-radial-gradient(circle,var(--knob-cap-brush)_0_var(--knob-cap-pitch),transparent_var(--knob-cap-pitch)_calc(var(--knob-cap-pitch)*2)),conic-gradient(from_15deg,var(--knob-cap-sheen),transparent_9%,var(--knob-cap-sheen)_21%,transparent_32%,var(--knob-cap-sheen-deep)_46%,transparent_58%,var(--knob-cap-sheen)_70%,transparent_83%,var(--knob-cap-sheen))] [--knob-cap-brush:color-mix(in_oklab,var(--knob-cap-shade)_7%,transparent)] [--knob-cap-sheen-deep:color-mix(in_oklab,var(--knob-cap-shade)_50%,transparent)] [--knob-cap-sheen:color-mix(in_oklab,var(--knob-cap-shade)_34%,transparent)]"
          data-slot="knob-cap-face"
        />
      </foreignObject>

      <circle
        cx={CENTER}
        cy={CENTER}
        data-slot="knob-cap-grain"
        filter={`url(#${id}-grain)`}
        opacity={0.25}
        pointer-events="none"
        r={cap().face}
        transform={`rotate(${angle()} ${CENTER} ${CENTER})`}
      />

      <KnobCapIndicator
        angle={angle}
        variant={variant}
      />
    </g>
  );
};

const focusDial = (
  from: HTMLElement
): void => {
  const root = from.closest(
    "[data-slot='knob']"
  );

  queueMicrotask(() => {
    root
      ?.querySelector<HTMLElement>(
        "[data-slot='knob-dial']"
      )
      ?.focus();
  });
};

interface KnobValueInputProps {
  class?: string;
  className?: string;
  style?: StyleValue;
}

const KnobValueInput = (
  props: KnobValueInputProps
) => {
  const context = useKnob(
    "KnobValue"
  );

  const dial = useKnobDial();

  const [draft, setDraft] =
    createSignal(
      context
        .format()(
          context.value()
        )
    );

  let done = false;

  const finish = (
    apply: boolean
  ) => {
    if (done) {
      return;
    }

    done = true;
    context.setEditing(false);

    const parsed = apply
      ? context.parse()(draft())
      : null;

    if (
      parsed === null ||
      Number.isNaN(parsed)
    ) {
      return;
    }

    const next =
      dial.quantize(
        clamp(
          parsed,
          dial.min(),
          dial.max()
        ),
        Math.min(
          dial.fineStep(),
          dial.step()
        )
      );

    dial.change(next, {
      reason: "input",
    });

    dial.commit(next);
  };

  return (
    <input
      aria-label="Value"
      class={cn(
        "bg-background ring-ring/50 focus-visible:ring-foreground h-4 w-(--knob-value-width) min-w-0 rounded-sm p-0 text-center font-mono text-xs tabular-nums ring-1 outline-none focus-visible:ring-2",
        props.class,
        props.className
      )}
      data-slot="knob-value-input"
      onBlur={() => {
        finish(true);
      }}
      onInput={(event) => {
        setDraft(
          event.currentTarget.value
        );
      }}
      onKeyDown={(event) => {
        if (
          event.key !==
            "Enter" &&
          event.key !==
            "Escape"
        ) {
          return;
        }

        event.preventDefault();

        const input =
          event.currentTarget;

        finish(
          event.key ===
            "Enter"
        );

        focusDial(input);
      }}
      ref={(node) => {
        queueMicrotask(() => {
          node.focus();
          node.select();
        });
      }}
      style={props.style}
      value={draft()}
    />
  );
};

export interface KnobValueProps
  extends Omit<
    SpanDOMProps,
    | "children"
    | "class"
    | "className"
    | "onDoubleClick"
    | "style"
  > {
  class?: string;
  className?: string;
  editable?: boolean;
  onDoubleClick?: (
    event: MouseEvent
  ) => void;
  style?: StyleValue;
}

const VALUE_OWN = [
  "class",
  "className",
  "editable",
  "onDoubleClick",
  "style",
] as const;

export const KnobValue = (
  props: KnobValueProps
) => {
  const context = useKnob(
    "KnobValue"
  );

  const rest = omitProps(
    props,
    VALUE_OWN
  );

  const editable = () =>
    props.editable ?? true;

  const widthStyle = () =>
    mergeStyleVars(
      props.style,
      {
        "--knob-value-width":
          `${context.valueWidth()}ch`,
      }
    );

  return (
    <Show
      fallback={
        <span
          class={cn(
            "text-muted-foreground inline-block min-w-(--knob-value-width) text-center font-mono text-xs whitespace-nowrap tabular-nums",
            editable() &&
              !context.disabled()
              ? "cursor-text"
              : undefined,
            props.class,
            props.className
          )}
          data-slot="knob-value"
          onDblClick={(
            event: MouseEvent
          ) => {
            props.onDoubleClick?.(
              event
            );

            if (
              editable() &&
              !context.disabled()
            ) {
              context.setEditing(
                true
              );
            }
          }}
          style={widthStyle()}
          {...rest}
        >
          {context
            .format()(
              context.value()
            )}
        </span>
      }
      when={
        editable() &&
        context.editing()
      }
    >
      <KnobValueInput
        class={props.class}
        className={
          props.className
        }
        style={widthStyle()}
      />
    </Show>
  );
};

export interface KnobLabelProps
  extends Omit<
    SpanDOMProps,
    | "children"
    | "class"
    | "className"
    | "onDoubleClick"
  > {
  children?: SpanDOMProps["children"];
  class?: string;
  className?: string;
  onDoubleClick?: (
    event: MouseEvent
  ) => void;
}

const LABEL_OWN = [
  "children",
  "class",
  "className",
  "id",
  "onDoubleClick",
] as const;

export const KnobLabel = (
  props: KnobLabelProps
) => {
  const context = useKnob(
    "KnobLabel"
  );

  const rest = omitProps(
    props,
    LABEL_OWN
  );

  return (
    <span
      class={cn(
        "text-xs font-medium",
        props.class,
        props.className
      )}
      data-slot="knob-label"
      id={context.labelId}
      onDblClick={(
        event: MouseEvent
      ) => {
        props.onDoubleClick?.(
          event
        );

        if (
          !context.disabled()
        ) {
          context.setEditing(
            true
          );
        }
      }}
      {...rest}
    >
      {props.children}
    </span>
  );
};

export {
  knobCapVariants,
  knobVariants,
};
