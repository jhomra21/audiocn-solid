import * as SliderPrimitive from "@kobalte/core/slider";
import { cva } from "class-variance-authority";
import { createMemo, createSignal } from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { clamp } from "@/lib/audio/decibels";
import { roundValue } from "@/lib/number";
import { createCompatEffect } from "@/lib/solid/effect";
import { useKobalteSliderCompat } from "@/lib/solid/kobalte-slider";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const PERCENT = 100;

const DETENT_RANGE = 0.08;

const CENTER_TEXT = /^c(?:enter|entre)?$/iu;

const SIDE_PREFIX = /^[LR]/iu;

/** "L30", "C", "R30". */
export const formatPan = (value: number): string => {
  const amount = Math.round(Math.abs(value) * PERCENT);

  if (amount === 0) {
    return "C";
  }

  return `${value < 0 ? "L" : "R"}${amount}`;
};

/**
 * Reads "L30", "R15", "C" or a number from −100 to 100.
 * This is the inverse of formatPan.
 */
export const parsePan = (text: string): number | null => {
  const trimmed = text.trim().replaceAll("\u2212", "-");

  if (CENTER_TEXT.test(trimmed)) {
    return 0;
  }

  const side = SIDE_PREFIX.test(trimmed) ? trimmed[0]?.toUpperCase() : null;

  const digits = (side ? trimmed.slice(1) : trimmed).trim();

  const amount = Number(digits) / PERCENT;

  if (digits === "" || Number.isNaN(amount)) {
    return null;
  }

  return side === "L" ? -Math.abs(amount) : amount;
};

export const describePan = (value: number): string => {
  const amount = Math.round(Math.abs(value) * PERCENT);

  if (amount === 0) {
    return "Center";
  }

  return `${amount}% ${value < 0 ? "left" : "right"}`;
};

const panControlVariants = cva(
  "group/pan-control relative flex w-full touch-none items-center select-none data-disabled:opacity-50",
  {
    defaultVariants: {
      size: "default",
    },
    variants: {
      size: {
        default: "[--pan-thumb-size:0.875rem] [--pan-track-size:0.25rem]",
        lg: "[--pan-thumb-size:1rem] [--pan-track-size:0.375rem]",
        sm: "[--pan-thumb-size:0.75rem] [--pan-track-size:0.1875rem]",
      },
    },
  }
);

interface SliderCompatProps {
  changeFromPointer: (value: number) => number;
  commitPointer: (value: number) => void;
  currentValue: () => number;
}

const SliderCompat = (props: SliderCompatProps) => {
  const context = SliderPrimitive.useSliderContext();

  let dragPosition = props.currentValue();

  let pointerValue = props.currentValue();

  useKobalteSliderCompat(context, {
    onSlideEnd: (originalSlideEnd) => {
      originalSlideEnd?.();
      props.commitPointer(pointerValue);
    },
    onSlideMove: (originalSlideMove, { deltaX }) => {
      if (context.state.isDisabled()) {
        return;
      }

      const track = context.trackRef();

      if (!track) {
        originalSlideMove?.({ deltaX, deltaY: 0 });

        return;
      }

      const { width } = track.getBoundingClientRect();

      if (width <= 0) {
        return;
      }

      const direction = context.isSlidingFromLeft() ? 1 : -1;
      dragPosition = clamp(
        dragPosition + direction * (deltaX / width) * 2,
        -1,
        1
      );
      pointerValue = props.changeFromPointer(dragPosition);
    },
    onSlideStart: (originalSlideStart, index, value) => {
      originalSlideStart?.(index, value);

      if (context.state.isDisabled()) {
        return;
      }

      dragPosition = clamp(value, -1, 1);
      pointerValue = props.changeFromPointer(dragPosition);
    },
    suppressStep: true,
  });

  return null;
};

type SliderRootProps = Parameters<typeof SliderPrimitive.Root>[0];

export type PanControlProps = Omit<
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
  defaultValue?: number;
  detent?: boolean;
  disabled?: boolean;
  format?: (value: number) => string;
  largeStep?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  size?: AudioSize;
  step?: number;
  value?: number;
};

const PAN_CONTROL_OWN = [
  "class",
  "className",
  "defaultValue",
  "detent",
  "disabled",
  "format",
  "largeStep",
  "onValueChange",
  "onValueCommitted",
  "size",
  "step",
  "value",
] as const;

export const PanControl = (props: PanControlProps) => {
  const rest = omitProps(props, PAN_CONTROL_OWN);

  const config = useAudioConfig();

  const size = () => props.size ?? config.size ?? "default";

  const disabled = () => props.disabled ?? config.disabled ?? false;

  const step = () => props.step ?? 0.05;

  const largeStep = () => props.largeStep ?? 0.25;

  const detent = () => props.detent ?? true;

  const format = () => props.format ?? formatPan;

  const [uncontrolled, setUncontrolled] = createSignal(
    clamp(props.defaultValue ?? 0, -1, 1)
  );

  const value = () => props.value ?? uncontrolled();

  let latestValue = value();

  createCompatEffect(value, (next) => {
    latestValue = next;
  });

  const quantize = (next: number, increment = step()): number => {
    const stepped = -1 + Math.round((next + 1) / increment) * increment;

    return roundValue(clamp(stepped, -1, 1));
  };

  const snapDrag = (next: number): number =>
    detent() && Math.abs(next) < DETENT_RANGE ? 0 : next;

  const change = (next: number) => {
    if (next === latestValue) {
      return;
    }

    latestValue = next;

    if (props.value === undefined) {
      setUncontrolled(next);
    }

    props.onValueChange?.(next);

    if (props.value !== undefined) {
      queueMicrotask(() => {
        latestValue = value();
      });
    }
  };

  const commit = (next: number) => {
    props.onValueCommitted?.(
      detent() && Math.abs(next) < DETENT_RANGE ? 0 : next
    );
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
        next = -1;

        break;
      }

      case "End": {
        next = 1;

        break;
      }

      default: {
        return;
      }
    }

    event.preventDefault();

    const quantized = quantize(next, Math.min(increment, step()));

    change(quantized);
    commit(quantized);
  };

  const start = () => Math.min(0, value());

  const end = () => Math.max(0, value());

  const sliderValue = createMemo(() => [value()]);

  return (
    <SliderPrimitive.Root
      class={cn(
        panControlVariants({
          size: size(),
        }),
        props.class,
        props.className
      )}
      data-centered={value() === 0 ? "" : undefined}
      data-size={size()}
      data-slot="pan-control"
      disabled={disabled()}
      getValueLabel={() => format()(value())}
      maxValue={1}
      minValue={-1}
      onChange={(next) => {
        const current = next[0];

        if (current === undefined) {
          return;
        }

        change(snapDrag(current));
      }}
      orientation="horizontal"
      step={step()}
      value={sliderValue()}
      {...rest}
    >
      <SliderCompat
        changeFromPointer={(next) => {
          const changed = snapDrag(quantize(next));

          change(changed);

          return changed;
        }}
        commitPointer={commit}
        currentValue={value}
      />

      <SliderPrimitive.Track class="relative flex h-(--pan-thumb-size) w-full items-center px-[calc(var(--pan-thumb-size)/2)] before:absolute before:inset-x-0 before:-inset-y-1.5 pointer-coarse:before:-inset-y-3">
        <div
          class="bg-input/90 relative h-(--pan-track-size) w-full grow rounded-full"
          data-slot="pan-control-track"
        >
          <span
            aria-hidden="true"
            class="bg-border absolute top-1/2 left-1/2 h-[calc(var(--pan-track-size)*3)] w-px -translate-x-1/2 -translate-y-1/2"
            data-slot="pan-control-center"
          />

          <div
            aria-hidden="true"
            class="bg-primary absolute inset-y-0 left-(--pan-range-start) w-(--pan-range-size) rounded-full"
            data-slot="pan-control-range"
            style={{
              "--pan-range-size": `${((end() - start()) / 2) * PERCENT}%`,
              "--pan-range-start": `${((start() + 1) / 2) * PERCENT}%`,
            }}
          />
        </div>

        <SliderPrimitive.Thumb
          aria-label="Pan"
          aria-valuetext={describePan(value())}
          class="bg-background ring-foreground/15 hover:ring-ring/30 focus-visible:ring-ring/40 data-dragging:ring-ring/30 block size-(--pan-thumb-size) shrink-0 rounded-full shadow-sm ring-1 outline-hidden transition-[box-shadow] hover:ring-4 focus-visible:ring-4 data-dragging:ring-4"
          data-slot="pan-control-thumb"
          onDblClick={(event: MouseEvent) => {
            event.preventDefault();
            change(0);
            commit(0);
          }}
          onKeyDown={handleKeyDown}
        >
          <SliderPrimitive.Input />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Track>

      <span class="sr-only">{format()(value())}</span>
    </SliderPrimitive.Root>
  );
};

export { panControlVariants };
