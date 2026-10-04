import * as SliderPrimitive from "@kobalte/core/slider";
import {
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  For,
  onCleanup,
  Show,
  useContext,
} from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import { clamp } from "@/lib/audio/decibels";
import { linearTaper, logTaper } from "@/lib/audio/taper";
import type { Taper } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  InputDOMProps,
  ParagraphDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

const POSITION_STEP = 0.0005;

const PRECISION = 1e6;

const WIDTH_SAMPLES = 24;

const SCRUB_PIXELS_PER_STEP = 4;

export type ParameterChangeReason =
  | "drag"
  | "keyboard"
  | "input"
  | "reset";

export interface ParameterChangeDetails {
  reason: ParameterChangeReason;
  event?: Event;
}

export interface ParameterMark {
  value: number;
  label?: string;
}

interface ParameterSliderContextValue {
  change: (value: number, details: ParameterChangeDetails) => void;
  commit: (value: number) => void;
  commitLatest: () => void;
  decimals: () => number;
  descriptionId: string;
  disabled: () => boolean;
  format: () => (value: number) => string;
  handleKeyDown: (event: KeyboardEvent) => void;
  labelId: string;
  largeStep: () => number;
  marks: () => readonly ParameterMark[] | undefined;
  max: () => number;
  min: () => number;
  originPosition: () => number;
  position: () => number;
  quantize: (value: number) => number;
  resetValue: () => number;
  step: () => number;
  taper: () => Taper;
  unit: () => string | undefined;
  value: () => number;
}

const ParameterSliderContext =
  createContext<ParameterSliderContextValue | null>(null);

const useParameterSlider = (
  part: string
): ParameterSliderContextValue => {
  const context = useContext(ParameterSliderContext);

  if (!context) {
    throw new Error(`${part} must be used inside ParameterSlider.`);
  }

  return context;
};

const decimalsOf = (step: number): number => {
  const text = String(step);
  const dot = text.indexOf(".");

  return dot === -1 ? 0 : text.length - dot - 1;
};

const roundValue = (value: number): number =>
  Math.round(value * PRECISION) / PRECISION;

const widestValue = (
  format: (value: number) => string,
  taper: Taper,
  snap: (value: number) => number
): number => {
  let widest = 0;

  for (let index = 0; index <= WIDTH_SAMPLES; index += 1) {
    const sample = snap(taper.toValue(index / WIDTH_SAMPLES));

    widest = Math.max(widest, format(sample).length);
  }

  return widest;
};

const SliderCompat = () => {
  const context = SliderPrimitive.useSliderContext();
  const originalStepHandler = context.onStepKeyDown;

  context.onStepKeyDown = () => undefined;

  onCleanup(() => {
    context.onStepKeyDown = originalStepHandler;
  });

  createCompatEffect(
    () => [context.thumbs().length, context.state.isDisabled()] as const,
    ([thumbCount, isDisabled]) => {
      for (let index = 0; index < thumbCount; index += 1) {
        context.state.setThumbEditable(index, !isDisabled);
      }
    }
  );

  return null;
};

type SliderRootProps = Parameters<typeof SliderPrimitive.Root>[0];

type ParameterSliderDOMProps = Omit<
  DivDOMProps,
  | "children"
  | "class"
  | "className"
  | "onChange"
  | "ref"
>;

export interface ParameterSliderProps extends ParameterSliderDOMProps {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
  decimals?: number;
  defaultValue?: number;
  disabled?: boolean;
  format?: (value: number) => string;
  largeStep?: number;
  marks?: ParameterMark[];
  max?: number;
  min?: number;
  onValueChange?: (
    value: number,
    details: ParameterChangeDetails
  ) => void;
  onValueCommitted?: (value: number) => void;
  origin?: number;
  resetValue?: number;
  scale?: "linear" | "log";
  step?: number;
  unit?: string;
  value?: number;
}

const PARAMETER_SLIDER_OWN = [
  "children",
  "class",
  "className",
  "decimals",
  "defaultValue",
  "disabled",
  "format",
  "largeStep",
  "marks",
  "max",
  "min",
  "onValueChange",
  "onValueCommitted",
  "origin",
  "resetValue",
  "scale",
  "step",
  "unit",
  "value",
] as const;

export const ParameterSlider = (props: ParameterSliderProps) => {
  const rest = omitProps(props, PARAMETER_SLIDER_OWN);
  const config = useAudioConfig();
  const id = createUniqueId();
  const labelId = `parameter-slider-${id}-label`;
  const descriptionId = `parameter-slider-${id}-description`;

  const min = () => props.min ?? 0;
  const max = () => props.max ?? 100;
  const step = () => props.step ?? 1;
  const largeStep = () => props.largeStep ?? 10;
  const decimals = () => props.decimals ?? decimalsOf(step());
  const resetValue = () =>
    props.resetValue ?? props.defaultValue ?? min();
  const disabled = () => props.disabled ?? config.disabled ?? false;
  const unit = () => props.unit;
  const marks = () => props.marks;
  const scale = () => props.scale ?? "linear";

  const [uncontrolled, setUncontrolled] = createSignal(
    clamp(
      props.defaultValue ?? resetValue(),
      min(),
      max()
    )
  );

  const value = () => props.value ?? uncontrolled();
  let latestValue = value();

  createCompatEffect(value, (next) => {
    latestValue = next;
  });

  const taper = createMemo(() =>
    scale() === "log"
      ? logTaper(min(), max())
      : linearTaper(min(), max())
  );

  const format = () => {
    if (props.format) {
      return props.format;
    }

    return (next: number) => {
      const text = next.toFixed(decimals());

      return unit() ? `${text} ${unit()}` : text;
    };
  };

  const quantize = (next: number): number => {
    const stepped =
      min() + Math.round((next - min()) / step()) * step();

    return roundValue(clamp(stepped, min(), max()));
  };

  const change = (
    next: number,
    details: ParameterChangeDetails
  ) => {
    if (next === latestValue) {
      return;
    }

    latestValue = next;

    if (props.value === undefined) {
      setUncontrolled(next);
    }

    props.onValueChange?.(next, details);

    if (props.value !== undefined) {
      latestValue = value();
    }
  };

  const commit = (next: number) => {
    props.onValueCommitted?.(next);
  };

  const commitLatest = () => {
    props.onValueCommitted?.(latestValue);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const increment = event.shiftKey ? largeStep() : step();
    let next: number | undefined;

    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight": {
        next = latestValue + increment;

        break;
      }

      case "ArrowDown":
      case "ArrowLeft": {
        next = latestValue - increment;

        break;
      }

      case "PageUp": {
        next = latestValue + largeStep();

        break;
      }

      case "PageDown": {
        next = latestValue - largeStep();

        break;
      }

      case "Home": {
        next = min();

        break;
      }

      case "End": {
        next = max();

        break;
      }

      default: {
        return;
      }
    }

    event.preventDefault();

    const quantized = quantize(next);

    change(quantized, {
      event,
      reason: "keyboard",
    });
    commit(quantized);
  };

  const position = () => taper().toPosition(value());

  const originPosition = () =>
    taper().toPosition(
      clamp(props.origin ?? min(), min(), max())
    );

  const context: ParameterSliderContextValue = {
    change,
    commit,
    commitLatest,
    decimals,
    descriptionId,
    disabled,
    format,
    handleKeyDown,
    labelId,
    largeStep,
    marks,
    max,
    min,
    originPosition,
    position,
    quantize,
    resetValue,
    step,
    taper,
    unit,
    value,
  };

  return provideContext(ParameterSliderContext, context, () => (
    <div
      aria-labelledby={labelId}
      class={cn(
        "group/parameter-slider flex w-full flex-col gap-2 data-disabled:opacity-50",
        props.class,
        props.className
      )}
      data-disabled={disabled() ? "" : undefined}
      data-modified={value() === resetValue() ? undefined : ""}
      data-slot="parameter-slider"
      role="group"
      {...rest}
    >
      {props.children}
    </div>
  ));
};

export interface ParameterSliderHeaderProps
  extends Omit<
    DivDOMProps,
    "children" | "class" | "className"
  > {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
}

const HEADER_OWN = ["children", "class", "className"] as const;

export const ParameterSliderHeader = (
  props: ParameterSliderHeaderProps
) => {
  const rest = omitProps(props, HEADER_OWN);

  return (
    <div
      class={cn(
        "flex min-h-6 items-center gap-2",
        props.class,
        props.className
      )}
      data-slot="parameter-slider-header"
      {...rest}
    >
      {props.children}
    </div>
  );
};

export interface ParameterSliderLabelProps
  extends Omit<
    SpanDOMProps,
    "children" | "class" | "className"
  > {
  class?: string;
  className?: string;
  children?: SpanDOMProps["children"];
}

const LABEL_OWN = ["children", "class", "className", "id"] as const;

export const ParameterSliderLabel = (
  props: ParameterSliderLabelProps
) => {
  const context = useParameterSlider("ParameterSliderLabel");
  const rest = omitProps(props, LABEL_OWN);

  return (
    <span
      class={cn(
        "mr-auto text-sm font-medium",
        props.class,
        props.className
      )}
      data-slot="parameter-slider-label"
      id={context.labelId}
      {...rest}
    >
      {props.children}
    </span>
  );
};

export interface ParameterSliderInputProps
  extends Omit<
    InputDOMProps,
    | "class"
    | "className"
    | "defaultValue"
    | "max"
    | "min"
    | "onChange"
    | "onInput"
    | "step"
    | "type"
    | "value"
  > {
  class?: string;
  className?: string;
  scrub?: boolean;
}

const INPUT_OWN = [
  "class",
  "className",
  "scrub",
] as const;

export const ParameterSliderInput = (
  props: ParameterSliderInputProps
) => {
  const context = useParameterSlider("ParameterSliderInput");
  const rest = omitProps(props, INPUT_OWN);
  const [draft, setDraft] = createSignal<string | null>(null);
  let scrubStartX = 0;
  let scrubStartValue = 0;

  const numericText = () =>
    context.value().toFixed(context.decimals());

  const displayValue = () => draft() ?? numericText();

  const applyDraft = (
    reason: ParameterChangeReason,
    event?: Event
  ) => {
    const current = draft();

    if (current === null) {
      return;
    }

    const parsed = Number(current);

    if (Number.isFinite(parsed)) {
      context.change(context.quantize(parsed), {
        event,
        reason,
      });
    }
  };

  const finish = (event?: Event) => {
    applyDraft("input", event);
    context.commitLatest();
    setDraft(null);
  };

  const unit = () => context.unit();

  const suffix = () => (
    <span
      aria-hidden="true"
      class={cn(
        "text-muted-foreground px-1.5 text-xs",
        (props.scrub ?? true) &&
          unit() &&
          !context.disabled()
          ? "cursor-ew-resize select-none"
          : undefined
      )}
      data-slot="parameter-slider-unit"
      onPointerDown={(event: PointerEvent) => {
        if (
          !(props.scrub ?? true) ||
          !unit() ||
          context.disabled()
        ) {
          return;
        }

        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        scrubStartX = event.clientX;
        scrubStartValue = context.value();
        setDraft(null);
      }}
      onPointerMove={(event: PointerEvent) => {
        if (
          !event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          return;
        }

        const steps = Math.round(
          (event.clientX - scrubStartX) /
            SCRUB_PIXELS_PER_STEP
        );
        const next = context.quantize(
          scrubStartValue + steps * context.step()
        );

        context.change(next, {
          event,
          reason: "input",
        });
      }}
      onPointerUp={(event: PointerEvent) => {
        if (
          !event.currentTarget.hasPointerCapture(event.pointerId)
        ) {
          return;
        }

        event.currentTarget.releasePointerCapture(event.pointerId);
        context.commitLatest();
      }}
    >
      {unit()}
    </span>
  );

  return (
    <div
      class="bg-input/50 focus-within:ring-ring/30 flex h-7 shrink-0 items-center rounded-lg focus-within:ring-3"
      data-slot="parameter-slider-input-group"
    >
      <input
        aria-labelledby={context.labelId}
        aria-valuemax={context.max()}
        aria-valuemin={context.min()}
        aria-valuenow={context.value()}
        aria-valuetext={context.format()(context.value())}
        class={cn(
          "h-full w-16 bg-transparent px-2 text-end font-mono text-xs tabular-nums outline-hidden",
          props.class,
          props.className
        )}
        data-slot="parameter-slider-input"
        disabled={context.disabled()}
        inputMode="decimal"
        max={context.max()}
        min={context.min()}
        onBlur={(event) => finish(event)}
        onFocus={() => {
          setDraft(numericText());
        }}
        onInput={(event) => {
          setDraft(event.currentTarget.value);
          applyDraft("input", event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            finish(event);
          } else if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
        step={context.step()}
        type="number"
        value={displayValue()}
        {...rest}
      />
      <Show when={unit()}>{suffix()}</Show>
    </div>
  );
};

export interface ParameterSliderValueProps
  extends Omit<
    SpanDOMProps,
    "children" | "class" | "className" | "style"
  > {
  class?: string;
  className?: string;
  style?: StyleValue;
}

const VALUE_OWN = ["class", "className", "style"] as const;

export const ParameterSliderValue = (
  props: ParameterSliderValueProps
) => {
  const context = useParameterSlider("ParameterSliderValue");
  const rest = omitProps(props, VALUE_OWN);

  const valueWidth = createMemo(() =>
    widestValue(
      context.format(),
      context.taper(),
      context.quantize
    )
  );

  return (
    <span
      class={cn(
        "text-muted-foreground inline-block min-w-(--parameter-value-width) text-end font-mono text-xs whitespace-nowrap tabular-nums",
        props.class,
        props.className
      )}
      data-slot="parameter-slider-value"
      style={mergeStyleVars(props.style, {
        "--parameter-value-width": `${valueWidth()}ch`,
      })}
      {...rest}
    >
      {context.format()(context.value())}
    </span>
  );
};

export interface ParameterSliderResetProps
  extends Omit<
    ButtonDOMProps,
    "children" | "class" | "className" | "onClick" | "type"
  > {
  class?: string;
  className?: string;
  children?: ButtonDOMProps["children"];
  onClick?: (event: MouseEvent) => void;
}

const RESET_OWN = [
  "children",
  "class",
  "className",
  "onClick",
] as const;

export const ParameterSliderReset = (
  props: ParameterSliderResetProps
) => {
  const context = useParameterSlider("ParameterSliderReset");
  const rest = omitProps(props, RESET_OWN);
  const modified = () =>
    context.value() !== context.resetValue();

  return (
    <button
      aria-label="Reset"
      class={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 inline-flex h-6 items-center rounded-md px-1.5 text-xs outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-0",
        props.class,
        props.className
      )}
      data-modified={modified() ? "" : undefined}
      data-slot="parameter-slider-reset"
      disabled={context.disabled() || !modified()}
      onClick={(event) => {
        props.onClick?.(event);
        context.change(context.resetValue(), {
          event,
          reason: "reset",
        });
        context.commit(context.resetValue());
      }}
      type="button"
      {...rest}
    >
      {props.children ?? "Reset"}
    </button>
  );
};

export type ParameterSliderControlProps = Omit<
  SliderRootProps,
  | "children"
  | "class"
  | "className"
  | "defaultValue"
  | "disabled"
  | "getValueLabel"
  | "maxValue"
  | "minValue"
  | "onChange"
  | "onChangeEnd"
  | "orientation"
  | "step"
  | "value"
> & {
  class?: string;
  className?: string;
};

const CONTROL_OWN = ["class", "className"] as const;

export const ParameterSliderControl = (
  props: ParameterSliderControlProps
) => {
  const context = useParameterSlider("ParameterSliderControl");
  const rest = omitProps(props, CONTROL_OWN);
  let pointerEvent: PointerEvent | undefined;

  const quantizeFromPosition = (position: number): number =>
    context.quantize(
      context.taper().toValue(position)
    );

  const start = () =>
    Math.min(
      context.originPosition(),
      context.position()
    ) * 100;

  const end = () =>
    Math.max(
      context.originPosition(),
      context.position()
    ) * 100;

  const sliderValue = createMemo(() => [context.position()]);

  return (
    <SliderPrimitive.Root
      class={cn(
        "relative flex w-full touch-none items-center select-none",
        props.class,
        props.className
      )}
      data-slot="parameter-slider-control"
      disabled={context.disabled()}
      getValueLabel={() =>
        context.format()(context.value())
      }
      maxValue={1}
      minValue={0}
      onChange={(next) => {
        const position = next[0];

        if (position === undefined) {
          return;
        }

        context.change(
          quantizeFromPosition(position),
          {
            event: pointerEvent,
            reason: "drag",
          }
        );
      }}
      onChangeEnd={context.commitLatest}
      orientation="horizontal"
      step={POSITION_STEP}
      value={sliderValue()}
      {...rest}
    >
      <SliderCompat />

      <SliderPrimitive.Track
        class="relative flex h-4 w-full items-center px-2 before:absolute before:inset-x-0 before:-inset-y-1.5 pointer-coarse:before:-inset-y-3"
        onPointerDown={(event: PointerEvent) => {
          pointerEvent = event;
        }}
        onPointerMove={(event: PointerEvent) => {
          pointerEvent = event;
        }}
      >
        <div
          class="bg-input/90 relative h-1 w-full grow rounded-full"
          data-slot="parameter-slider-track"
        >
          <div
            aria-hidden="true"
            class="bg-primary absolute inset-y-0 left-(--parameter-range-start) w-(--parameter-range-size) rounded-full"
            data-slot="parameter-slider-range"
            style={{
              "--parameter-range-size": `${end() - start()}%`,
              "--parameter-range-start": `${start()}%`,
            }}
          />
        </div>

        <SliderPrimitive.Thumb
          aria-describedby={context.descriptionId}
          aria-labelledby={context.labelId}
          aria-valuetext={context.format()(context.value())}
          class="bg-background ring-foreground/15 hover:ring-ring/30 focus-visible:ring-ring/40 data-dragging:ring-ring/30 block size-4 shrink-0 rounded-full shadow-sm ring-1 outline-hidden transition-[box-shadow] hover:ring-4 focus-visible:ring-4 data-dragging:ring-4"
          data-slot="parameter-slider-thumb"
          onDblClick={(event: MouseEvent) => {
            context.change(context.resetValue(), {
              event,
              reason: "reset",
            });
            context.commit(context.resetValue());
          }}
          onKeyDown={context.handleKeyDown}
          onPointerDown={(event: PointerEvent) => {
            pointerEvent = event;
          }}
          onPointerMove={(event: PointerEvent) => {
            pointerEvent = event;
          }}
        >
          <SliderPrimitive.Input />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
};

export interface ParameterSliderMarksProps
  extends Omit<
    DivDOMProps,
    "children" | "class" | "className"
  > {
  class?: string;
  className?: string;
}

const MARKS_OWN = ["class", "className"] as const;

export const ParameterSliderMarks = (
  props: ParameterSliderMarksProps
) => {
  const context = useParameterSlider("ParameterSliderMarks");
  const rest = omitProps(props, MARKS_OWN);

  return (
    <Show when={(context.marks()?.length ?? 0) > 0}>
      <div
        aria-hidden="true"
        class={cn(
          "text-muted-foreground relative mx-2 h-4 text-[0.625rem]",
          props.class,
          props.className
        )}
        data-slot="parameter-slider-marks"
        {...rest}
      >
        <For each={context.marks() ?? []}>
          {(mark) => (
            <span
              class="absolute top-0 left-(--mark-position) -translate-x-1/2 whitespace-nowrap tabular-nums"
              style={{
                "--mark-position": `${context
                  .taper()
                  .toPosition(mark.value) * 100}%`,
              }}
            >
              {mark.label ??
                context.format()(mark.value)}
            </span>
          )}
        </For>
      </div>
    </Show>
  );
};

export interface ParameterSliderDescriptionProps
  extends Omit<
    ParagraphDOMProps,
    "children" | "class" | "className"
  > {
  class?: string;
  className?: string;
  children?: ParagraphDOMProps["children"];
}

const DESCRIPTION_OWN = [
  "children",
  "class",
  "className",
  "id",
] as const;

export const ParameterSliderDescription = (
  props: ParameterSliderDescriptionProps
) => {
  const context =
    useParameterSlider("ParameterSliderDescription");
  const rest = omitProps(props, DESCRIPTION_OWN);

  return (
    <p
      class={cn(
        "text-muted-foreground text-xs",
        props.class,
        props.className
      )}
      data-slot="parameter-slider-description"
      id={context.descriptionId}
      {...rest}
    >
      {props.children}
    </p>
  );
};
