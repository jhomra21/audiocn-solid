import * as SliderPrimitive from "@kobalte/core/slider";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import {
  createContext,
  createMemo,
  createSignal,
  Show,
  useContext,
} from "solid-js";

import { DbScale } from "@/components/ui/db-scale";
import type { DbScaleProps } from "@/components/ui/db-scale";
import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { clamp, formatDb, SILENCE_DB } from "@/lib/audio/decibels";
import { resolveTaper } from "@/lib/audio/taper";
import type { TaperInput } from "@/lib/audio/taper";
import type { Orientation, Taper } from "@/lib/audio/types";
import { roundValue } from "@/lib/number";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { useKobalteSliderCompat } from "@/lib/solid/kobalte-slider";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

const DEFAULT_MIN_DB = -60;

const DEFAULT_MAX_DB = 6;

const POSITION_STEP = 0.0005;

const DETENT_SNAP = 0.012;

const DEFAULT_DETENTS = [0] as const;

const DB_SUFFIX = /db/iu;

const INFINITY_TEXT = /^-?(?:inf|infinity|∞)$/iu;

export type FaderChangeReason =
  | "drag"
  | "track-press"
  | "keyboard"
  | "wheel"
  | "reset"
  | "input";

export interface FaderChangeDetails {
  reason: FaderChangeReason;
  event?: Event;
}

interface FaderContextValue {
  ariaLabel: () => string | undefined;
  ariaLabelledBy: () => string | undefined;
  change: (db: number, details: FaderChangeDetails) => void;
  commit: (db: number) => void;
  disabled: () => boolean;
  format: () => (db: number) => string;
  handleKeyDown: (event: KeyboardEvent) => void;
  max: () => number;
  min: () => number;
  orientation: () => Orientation;
  originPosition: () => number;
  pointer: (reason: "drag" | "track-press", event: PointerEvent) => void;
  position: () => number;
  resetValue: () => number;
  size: () => AudioSize;
  taper: () => Taper;
  value: () => number;
  variant: () => "console" | "default";
}

const FaderContext = createContext<FaderContextValue | null>(null);

const useFader = (part: string): FaderContextValue => {
  const context = useContext(FaderContext);

  if (!context) {
    throw new Error(`${part} must be used inside Fader.`);
  }

  return context;
};

const defaultFormat = (db: number): string =>
  db === SILENCE_DB ? "Silent" : formatDb(db);

const parseDb = (text: string): number | null => {
  const normalized = text.replaceAll("−", "-").replace(DB_SUFFIX, "").trim();

  if (INFINITY_TEXT.test(normalized)) {
    return SILENCE_DB;
  }

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? null : parsed;
};

const incrementFor = (
  event: KeyboardEvent,
  step: number,
  fineStep: number,
  largeStep: number
): number => {
  if (event.altKey) {
    return fineStep;
  }

  return event.shiftKey ? largeStep : step;
};

const SliderCompat = (props: { onChangeEnd: () => void }) => {
  const context = SliderPrimitive.useSliderContext();
  useKobalteSliderCompat(context, {
    onChangeEnd: () => props.onChangeEnd(),
    suppressStep: true,
  });

  return null;
};

type SliderLabelProps = Parameters<typeof SliderPrimitive.Label>[0];

type FaderLabelProps = Omit<
  SliderLabelProps,
  "children" | "class" | "className"
> & {
  class?: string;
  className?: string;
  children?: SpanDOMProps["children"];
};

const LABEL_OWN = ["children", "class", "className"] as const;

export const FaderLabel = (props: FaderLabelProps) => {
  const rest = omitProps(props, LABEL_OWN);

  return (
    <SliderPrimitive.Label
      class={cn("text-sm font-medium", props.class, props.className)}
      data-slot="fader-label"
      {...rest}
    >
      {props.children}
    </SliderPrimitive.Label>
  );
};

type SliderTrackProps = Parameters<typeof SliderPrimitive.Track>[0];

type FaderTrackProps = Omit<
  SliderTrackProps,
  | "children"
  | "class"
  | "className"
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
> & {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
};

const TRACK_OWN = ["children", "class", "className"] as const;

export const FaderTrack = (props: FaderTrackProps) => {
  const context = useFader("FaderTrack");
  const rest = omitProps(props, TRACK_OWN);
  const horizontal = () => context.orientation() === "horizontal";

  return (
    <div
      class={cn(
        "relative flex min-h-0 min-w-0 items-center",
        horizontal()
          ? "h-(--fader-thumb-size) w-full"
          : "h-full w-(--fader-thumb-size) flex-col"
      )}
      data-slot="fader-control"
    >
      <SliderPrimitive.Track
        class={cn(
          "bg-input/90 relative grow rounded-full",
          horizontal()
            ? "h-(--fader-track-size) w-full"
            : "h-full w-(--fader-track-size)",
          props.class,
          props.className
        )}
        data-slot="fader-track"
        onPointerDown={(event: PointerEvent) => {
          context.pointer("track-press", event);
        }}
        onPointerMove={(event: PointerEvent) => {
          context.pointer("track-press", event);
        }}
        {...rest}
      >
        {props.children}
      </SliderPrimitive.Track>
    </div>
  );
};

type FaderRangeProps = Omit<
  DivDOMProps,
  "children" | "class" | "className" | "ref" | "style"
> & {
  class?: string;
  className?: string;
  style?: StyleValue;
};

const RANGE_OWN = ["class", "className", "style"] as const;

export const FaderRange = (props: FaderRangeProps) => {
  const context = useFader("FaderRange");
  const rest = omitProps(props, RANGE_OWN);

  const start = () =>
    Math.min(context.originPosition(), context.position()) * 100;

  const end = () =>
    Math.max(context.originPosition(), context.position()) * 100;

  return (
    <div
      aria-hidden="true"
      class={cn(
        "bg-primary pointer-events-none absolute rounded-full",
        context.orientation() === "horizontal"
          ? "inset-y-0 left-(--fader-range-start) w-(--fader-range-size)"
          : "inset-x-0 bottom-(--fader-range-start) h-(--fader-range-size)",
        props.class,
        props.className
      )}
      data-slot="fader-range"
      style={mergeStyleVars(props.style, {
        "--fader-range-size": `${end() - start()}%`,
        "--fader-range-start": `${start()}%`,
      })}
      {...rest}
    />
  );
};

const thumbVariants = cva(
  "bg-background ring-foreground/15 hover:ring-ring/30 focus-visible:ring-ring/40 data-dragging:ring-ring/30 block shrink-0 shadow-sm ring-1 outline-hidden transition-[box-shadow] hover:ring-4 focus-visible:ring-4 data-disabled:pointer-events-none data-dragging:ring-4",
  {
    compoundVariants: [
      {
        className:
          "h-[calc(var(--fader-thumb-size)*1.6)] w-[calc(var(--fader-thumb-size)*0.7)] bg-[linear-gradient(to_right,transparent_calc(50%-0.5px),var(--foreground)_calc(50%-0.5px),var(--foreground)_calc(50%+0.5px),transparent_calc(50%+0.5px))]",
        orientation: "horizontal",
        variant: "console",
      },
      {
        className:
          "h-[calc(var(--fader-thumb-size)*0.7)] w-[calc(var(--fader-thumb-size)*1.8)] bg-[linear-gradient(to_bottom,transparent_calc(50%-0.5px),var(--foreground)_calc(50%-0.5px),var(--foreground)_calc(50%+0.5px),transparent_calc(50%+0.5px))]",
        orientation: "vertical",
        variant: "console",
      },
    ],
    defaultVariants: {
      orientation: "horizontal",
      variant: "default",
    },
    variants: {
      orientation: {
        horizontal: "",
        vertical: "",
      },
      variant: {
        console: "border-border rounded-sm border",
        default: "size-(--fader-thumb-size) rounded-full",
      },
    },
  }
);

type SliderThumbProps = Parameters<typeof SliderPrimitive.Thumb>[0];

export type FaderThumbProps = Omit<
  SliderThumbProps,
  | "class"
  | "className"
  | "onDoubleClick"
  | "onKeyDown"
  | "onPointerDown"
  | "onPointerMove"
> & {
  class?: string;
  className?: string;
  onDoubleClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerMove?: (event: PointerEvent) => void;
};

const THUMB_OWN = [
  "class",
  "className",
  "onDoubleClick",
  "onKeyDown",
  "onPointerDown",
  "onPointerMove",
] as const;

export const FaderThumb = (props: FaderThumbProps) => {
  const context = useFader("FaderThumb");
  const rest = omitProps(props, THUMB_OWN);

  return (
    <SliderPrimitive.Thumb
      aria-label={context.ariaLabel()}
      aria-labelledby={context.ariaLabelledBy()}
      aria-valuetext={context.format()(context.value())}
      class={cn(
        context.orientation() === "vertical"
          ? "left-1/2 -translate-x-1/2"
          : "top-1/2 -translate-y-1/2",
        thumbVariants({
          orientation: context.orientation(),
          variant: context.variant(),
        }),
        props.class,
        props.className
      )}
      data-slot="fader-thumb"
      onDblClick={(event: MouseEvent) => {
        props.onDoubleClick?.(event);
        context.change(context.resetValue(), {
          event,
          reason: "reset",
        });
        context.commit(context.resetValue());
      }}
      onKeyDown={(event: KeyboardEvent) => {
        props.onKeyDown?.(event);

        if (!event.defaultPrevented) {
          context.handleKeyDown(event);
        }
      }}
      onPointerDown={(event: PointerEvent) => {
        props.onPointerDown?.(event);
        context.pointer("drag", event);
      }}
      onPointerMove={(event: PointerEvent) => {
        props.onPointerMove?.(event);
        context.pointer("drag", event);
      }}
      {...rest}
    >
      <SliderPrimitive.Input />
    </SliderPrimitive.Thumb>
  );
};

export type FaderScaleProps = Omit<
  DbScaleProps,
  "maxDb" | "minDb" | "orientation" | "taper"
>;

export const FaderScale = (props: FaderScaleProps) => {
  const context = useFader("FaderScale");
  const rest = omitProps(props, ["class", "className"] as const);
  const horizontal = () => context.orientation() === "horizontal";

  return (
    <div
      class={cn(
        horizontal()
          ? "px-[calc(var(--fader-thumb-size)/2)]"
          : "py-[calc(var(--fader-thumb-size)/2)]",
        props.class,
        props.className
      )}
      data-slot="fader-scale"
    >
      <DbScale
        maxDb={context.max()}
        minDb={context.min()}
        orientation={context.orientation()}
        taper={context.taper()}
        {...rest}
      />
    </div>
  );
};

export interface FaderValueProps extends Omit<
  SpanDOMProps,
  "children" | "class" | "className" | "ref" | "style"
> {
  class?: string;
  className?: string;
  editable?: boolean;
  style?: StyleValue;
}

const VALUE_OWN = ["class", "className", "editable", "style"] as const;

const WIDTH_SAMPLES_DB = [-88.8, -8.8, 8.8, 88.8];

const widestValue = (
  format: (db: number) => string,
  min: number,
  max: number
): number =>
  Math.max(
    ...[
      SILENCE_DB,
      min,
      min + 0.1,
      max,
      max - 0.1,
      ...WIDTH_SAMPLES_DB.filter((db) => db > min && db < max),
    ].map((db) => format(db).length)
  );

export const FaderValue = (props: FaderValueProps) => {
  const context = useFader("FaderValue");
  const rest = omitProps(props, VALUE_OWN);
  const [editing, setEditing] = createSignal(false);
  const [draft, setDraft] = createSignal("");

  const width = () =>
    widestValue(context.format(), context.min(), context.max());

  const valueStyle = () =>
    mergeStyleVars(props.style, {
      "--fader-value-width": `${width()}ch`,
    });

  const finish = (apply: boolean) => {
    setEditing(false);

    if (!apply) {
      return;
    }

    const parsed = parseDb(draft());

    if (parsed === null) {
      return;
    }

    const next =
      parsed === SILENCE_DB
        ? context.min()
        : clamp(parsed, context.min(), context.max());

    context.change(next, { reason: "input" });
    context.commit(next);
  };

  const text = () => context.format()(context.value());

  const readout = () => (
    <Show
      fallback={
        <span
          class={cn(
            "text-muted-foreground inline-block w-(--fader-value-width) shrink-0 text-end font-mono text-xs whitespace-nowrap tabular-nums",
            props.class,
            props.className
          )}
          data-slot="fader-value"
          style={valueStyle()}
          {...rest}
        >
          {text()}
        </span>
      }
      when={props.editable ?? false}
    >
      <button
        class={cn(
          "text-muted-foreground hover:bg-muted focus-visible:ring-ring/30 h-6 w-[calc(var(--fader-value-width)+0.75rem)] shrink-0 rounded-md px-1.5 text-end font-mono text-xs tabular-nums outline-none focus-visible:ring-3",
          props.class,
          props.className
        )}
        data-slot="fader-value"
        disabled={context.disabled()}
        onClick={() => {
          setDraft(
            context.value() === SILENCE_DB ? "-inf" : String(context.value())
          );
          setEditing(true);
        }}
        style={valueStyle()}
        type="button"
      >
        {text()}
      </button>
    </Show>
  );

  return (
    <Show fallback={readout()} when={editing()}>
      <input
        aria-label="Value in dB"
        class={cn(
          "bg-background focus-visible:ring-ring/30 h-6 w-[calc(var(--fader-value-width)+0.75rem)] rounded-md border px-[calc(0.375rem-1px)] text-end font-mono text-xs tabular-nums outline-none focus-visible:ring-3",
          props.class,
          props.className
        )}
        data-slot="fader-value-input"
        onBlur={() => finish(true)}
        onInput={(event) => setDraft(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            finish(true);
          } else if (event.key === "Escape") {
            finish(false);
          }
        }}
        ref={(node) => {
          queueMicrotask(() => {
            node.focus();
            node.select();
          });
        }}
        style={valueStyle()}
        value={draft()}
      />
    </Show>
  );
};

export interface FaderResetProps extends Omit<
  ButtonDOMProps,
  "children" | "class" | "className" | "onClick" | "ref" | "type"
> {
  class?: string;
  className?: string;
  children?: ButtonDOMProps["children"];
  onClick?: (event: MouseEvent) => void;
}

const RESET_OWN = ["children", "class", "className", "onClick"] as const;

export const FaderReset = (props: FaderResetProps) => {
  const context = useFader("FaderReset");
  const rest = omitProps(props, RESET_OWN);
  const modified = () => context.value() !== context.resetValue();

  return (
    <button
      aria-label="Reset"
      class={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 inline-flex h-6 items-center rounded-md px-1.5 text-xs outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-0",
        props.class,
        props.className
      )}
      data-modified={modified() ? "" : undefined}
      data-slot="fader-reset"
      disabled={context.disabled() || !modified()}
      onClick={(event) => {
        props.onClick?.(event);
        context.change(context.resetValue(), { event, reason: "reset" });
        context.commit(context.resetValue());
      }}
      type="button"
      {...rest}
    >
      {props.children ?? "Reset"}
    </button>
  );
};

export const faderVariants = cva(
  "group/fader relative flex touch-none gap-2 select-none data-disabled:opacity-50",
  {
    defaultVariants: {
      orientation: "horizontal",
      size: "default",
    },
    variants: {
      orientation: {
        horizontal: "w-full flex-col",
        vertical: "h-full min-h-32 flex-row justify-center",
      },
      size: {
        default: "[--fader-thumb-size:1rem] [--fader-track-size:0.25rem]",
        lg: "[--fader-thumb-size:1.25rem] [--fader-track-size:0.375rem]",
        sm: "[--fader-thumb-size:0.75rem] [--fader-track-size:0.1875rem]",
      },
    },
  }
);

type SliderRootProps = Parameters<typeof SliderPrimitive.Root>[0];

type FaderDOMProps = Omit<
  SliderRootProps,
  | "aria-label"
  | "aria-labelledby"
  | "children"
  | "class"
  | "className"
  | "defaultValue"
  | "getValueLabel"
  | "maxValue"
  | "minValue"
  | "onChange"
  | "onChangeEnd"
  | "orientation"
  | "ref"
  | "step"
  | "value"
>;

export interface FaderProps
  extends
    FaderDOMProps,
    Omit<VariantProps<typeof faderVariants>, "orientation"> {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  allowWheel?: boolean;
  defaultValue?: number;
  detents?: number[];
  fineStep?: number;
  format?: (db: number) => string;
  largeStep?: number;
  max?: number;
  min?: number;
  name?: string;
  onValueChange?: (value: number, details: FaderChangeDetails) => void;
  onValueCommitted?: (value: number) => void;
  orientation?: Orientation;
  origin?: number;
  readOnly?: boolean;
  ref?: RefTarget<HTMLDivElement>;
  required?: boolean;
  resetValue?: number;
  silenceAtMin?: boolean;
  step?: number;
  taper?: TaperInput;
  value?: number;
  variant?: "console" | "default";
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
}

const FADER_OWN = [
  "allowWheel",
  "aria-label",
  "aria-labelledby",
  "children",
  "class",
  "className",
  "defaultValue",
  "detents",
  "disabled",
  "fineStep",
  "format",
  "largeStep",
  "max",
  "min",
  "name",
  "onValueChange",
  "onValueCommitted",
  "orientation",
  "origin",
  "readOnly",
  "ref",
  "required",
  "resetValue",
  "silenceAtMin",
  "size",
  "step",
  "taper",
  "value",
  "variant",
] as const;

export const Fader = (props: FaderProps) => {
  const rest = omitProps(props, FADER_OWN);
  const config = useAudioConfig();

  const min = () => props.min ?? DEFAULT_MIN_DB;
  const max = () => props.max ?? DEFAULT_MAX_DB;
  const resetValue = () => props.resetValue ?? 0;
  const step = () => props.step ?? 0.5;
  const largeStep = () => props.largeStep ?? 6;
  const fineStep = () => props.fineStep ?? 0.1;

  const detents = (): readonly number[] => props.detents ?? DEFAULT_DETENTS;

  const silenceAtMin = () => props.silenceAtMin ?? false;
  const disabled = () => props.disabled ?? config.disabled ?? false;

  const orientation = () =>
    props.orientation ?? config.orientation ?? "horizontal";

  const size = () => props.size ?? config.size ?? "default";
  const variant = () => props.variant ?? "default";
  const format = () => props.format ?? defaultFormat;
  const taperInput = () => props.taper ?? "linear";

  const [uncontrolled, setUncontrolled] = createSignal(
    props.defaultValue ?? clamp(resetValue(), min(), max())
  );

  const value = () => props.value ?? uncontrolled();
  let latestValue = value();
  let pointerReason: "drag" | "track-press" = "drag";
  let pointerEvent: PointerEvent | undefined;

  createCompatEffect(value, (next) => {
    latestValue = next;
  });

  const change = (db: number, details: FaderChangeDetails) => {
    if (db === latestValue) {
      return;
    }

    latestValue = db;

    if (props.value === undefined) {
      setUncontrolled(db);
    }

    props.onValueChange?.(db, details);

    if (props.value !== undefined) {
      queueMicrotask(() => {
        latestValue = value();
      });
    }
  };

  const commit = (db: number) => {
    props.onValueCommitted?.(db);
  };

  const taper = createMemo(() => resolveTaper(taperInput(), min(), max()));

  const toPosition = (db: number): number =>
    db === SILENCE_DB ? 0 : taper().toPosition(db);

  const quantize = (db: number, increment: number): number => {
    if (db === SILENCE_DB) {
      return silenceAtMin() ? SILENCE_DB : min();
    }

    const stepped = min() + Math.round((db - min()) / increment) * increment;

    return roundValue(clamp(stepped, min(), max()));
  };

  const fromPosition = (position: number, fine: boolean): number => {
    if (silenceAtMin() && position <= 0) {
      return SILENCE_DB;
    }

    for (const detent of detents()) {
      if (Math.abs(position - toPosition(detent)) < DETENT_SNAP) {
        return detent;
      }
    }

    return quantize(taper().toValue(position), fine ? fineStep() : step());
  };

  const nudge = (direction: number, increment: number): number => {
    const current = latestValue;

    if (current === SILENCE_DB) {
      return direction > 0 ? min() : SILENCE_DB;
    }

    if (silenceAtMin() && direction < 0 && current <= min()) {
      return SILENCE_DB;
    }

    return quantize(
      current + direction * increment,
      Math.min(increment, step())
    );
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const increment = incrementFor(event, step(), fineStep(), largeStep());

    let next: number | undefined;

    switch (event.key) {
      case "ArrowDown":
      case "ArrowLeft": {
        next = nudge(-1, increment);

        break;
      }

      case "ArrowRight":
      case "ArrowUp": {
        next = nudge(1, increment);

        break;
      }

      case "End": {
        next = max();

        break;
      }

      case "Home": {
        next = silenceAtMin() ? SILENCE_DB : min();

        break;
      }

      case "PageDown": {
        next = nudge(-1, largeStep());

        break;
      }

      case "PageUp": {
        next = nudge(1, largeStep());

        break;
      }

      default: {
        return;
      }
    }

    event.preventDefault();

    change(next, { event, reason: "keyboard" });
    commit(next);
  };

  const position = () => toPosition(value());

  const originPosition = () =>
    toPosition(clamp(props.origin ?? min(), min(), max()));

  const [rootElement, setRootElement] = createSignal<HTMLDivElement | null>(
    null
  );

  createCompatEffect(
    () => [rootElement(), props.allowWheel ?? false] as const,
    ([root, enabled]) => {
      if (!(root && enabled)) {
        return;
      }

      const listener = (event: WheelEvent) => {
        const focused = root.contains(document.activeElement);

        if (disabled() || !focused || event.deltaY === 0) {
          return;
        }

        event.preventDefault();

        const next = nudge(
          event.deltaY < 0 ? 1 : -1,
          event.altKey ? fineStep() : step()
        );

        change(next, { event, reason: "wheel" });
        commit(next);
      };

      root.addEventListener("wheel", listener, { passive: false });

      return () => {
        root.removeEventListener("wheel", listener);
      };
    }
  );

  const context: FaderContextValue = {
    ariaLabel: () => props["aria-label"],
    ariaLabelledBy: () => props["aria-labelledby"],
    change,
    commit,
    disabled,
    format,
    handleKeyDown,
    max,
    min,
    orientation,
    originPosition,
    pointer: (reason, event) => {
      pointerReason = reason;
      pointerEvent = event;
    },
    position,
    resetValue,
    size,
    taper,
    value,
    variant,
  };

  const sliderValue = createMemo(() => [position()]);

  return provideContext(FaderContext, context, () => (
    <SliderPrimitive.Root
      class={cn(
        faderVariants({
          orientation: orientation(),
          size: size(),
        }),
        props.class,
        props.className
      )}
      data-at-detent={detents().includes(value()) ? "" : undefined}
      data-silent={value() === SILENCE_DB ? "" : undefined}
      data-size={size()}
      data-slot="fader"
      data-variant={variant()}
      disabled={disabled()}
      getValueLabel={() => format()(value())}
      maxValue={1}
      minValue={0}
      name={props.name}
      onChange={(next) => {
        const nextPosition = next[0];

        if (nextPosition === undefined) {
          return;
        }

        change(fromPosition(nextPosition, pointerEvent?.altKey ?? false), {
          event: pointerEvent,
          reason: pointerReason,
        });
      }}
      onChangeEnd={() => {
        commit(latestValue);
      }}
      orientation={orientation()}
      readOnly={props.readOnly}
      ref={(node) => {
        if (node instanceof HTMLDivElement) {
          setRootElement(node);
          setRefValue(props.ref, node);
        }
      }}
      required={props.required}
      step={POSITION_STEP}
      value={sliderValue()}
      {...rest}
    >
      <SliderCompat onChangeEnd={() => commit(latestValue)} />

      {props.children ?? (
        <FaderTrack>
          <FaderRange />
          <FaderThumb />
        </FaderTrack>
      )}
    </SliderPrimitive.Root>
  ));
};
