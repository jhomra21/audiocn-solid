import * as SliderPrimitive from "@kobalte/core/slider";
import {
  createContext,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { clamp } from "@/lib/audio/decibels";
import type { Orientation } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const PERCENT = 100;

const LOW_LEVEL = 0.34;

const MEDIUM_LEVEL = 0.67;

const PERCEPTUAL_EXPONENT = 2;

const PRECISION = 1e6;

export type VolumeLevel =
  | "muted"
  | "low"
  | "medium"
  | "high";

const curves = {
  linear: {
    toPosition: (volume: number) => volume,
    toVolume: (position: number) => position,
  },
  perceptual: {
    toPosition: (volume: number) =>
      volume ** (1 / PERCEPTUAL_EXPONENT),
    toVolume: (position: number) =>
      position ** PERCEPTUAL_EXPONENT,
  },
} as const;

interface VolumeControlContextValue {
  commit: (volume: number) => void;
  disabled: () => boolean;
  handleKeyDown: (event: KeyboardEvent) => void;
  level: () => VolumeLevel;
  muted: () => boolean;
  orientation: () => Orientation;
  position: () => number;
  setPosition: (position: number) => number;
  shownPosition: () => number;
  step: () => number;
  toggleMuted: () => void;
  volume: () => number;
}

const VolumeControlContext =
  createContext<VolumeControlContextValue | null>(null);

const useVolumeControl = (
  part: string
): VolumeControlContextValue => {
  const context =
    useContext(VolumeControlContext);

  if (!context) {
    throw new Error(
      `${part} must be used inside VolumeControl.`
    );
  }

  return context;
};

const roundValue = (value: number): number =>
  Math.round(value * PRECISION) / PRECISION;

const levelFor = (
  volume: number,
  muted: boolean
): VolumeLevel => {
  if (muted || volume <= 0) {
    return "muted";
  }

  if (volume < LOW_LEVEL) {
    return "low";
  }

  if (volume < MEDIUM_LEVEL) {
    return "medium";
  }

  return "high";
};

interface VolumeSliderCompatProps {
  changeFromPointer: (position: number) => number;
  commitPointer: (volume: number) => void;
  currentPosition: () => number;
  orientation: () => Orientation;
}

const VolumeSliderCompat = (
  props: VolumeSliderCompatProps
) => {
  const context =
    SliderPrimitive.useSliderContext();

  const originalSlideStart =
    context.onSlideStart;

  const originalSlideMove =
    context.onSlideMove;

  const originalSlideEnd =
    context.onSlideEnd;

  const originalStepHandler =
    context.onStepKeyDown;

  let dragPosition =
    props.currentPosition();

  let pointerVolume = 0;

  context.onStepKeyDown =
    () => undefined;

  context.onSlideStart = (
    index,
    position
  ) => {
    originalSlideStart?.(
      index,
      position
    );

    if (
      context.state.isDisabled()
    ) {
      return;
    }

    dragPosition = clamp(
      position,
      0,
      1
    );

    pointerVolume =
      props.changeFromPointer(
        dragPosition
      );
  };

  context.onSlideMove = ({
    deltaX,
    deltaY,
  }) => {
    if (
      context.state.isDisabled()
    ) {
      return;
    }

    const track =
      context.trackRef();

    if (!track) {
      originalSlideMove?.({
        deltaX,
        deltaY,
      });

      return;
    }

    const rect =
      track.getBoundingClientRect();

    const horizontal =
      props.orientation() ===
      "horizontal";

    const size = horizontal
      ? rect.width
      : rect.height;

    if (size <= 0) {
      return;
    }

    const delta = horizontal
      ? deltaX
      : deltaY;

    const direction = horizontal
      ? context.isSlidingFromLeft()
        ? 1
        : -1
      : context.isSlidingFromBottom()
        ? -1
        : 1;

    dragPosition = clamp(
      dragPosition +
        direction *
          (delta / size),
      0,
      1
    );

    pointerVolume =
      props.changeFromPointer(
        dragPosition
      );
  };

  context.onSlideEnd = () => {
    originalSlideEnd?.();

    props.commitPointer(
      pointerVolume
    );
  };

  onCleanup(() => {
    context.onSlideStart =
      originalSlideStart;

    context.onSlideMove =
      originalSlideMove;

    context.onSlideEnd =
      originalSlideEnd;

    context.onStepKeyDown =
      originalStepHandler;
  });

  createCompatEffect(
    () => [
      context.thumbs().length,
      context.state.isDisabled(),
    ] as const,
    ([thumbCount, isDisabled]) => {
      for (
        let index = 0;
        index < thumbCount;
        index += 1
      ) {
        context.state.setThumbEditable(
          index,
          !isDisabled
        );
      }
    }
  );

  return null;
};

export interface VolumeControlProps
  extends Omit<
    DivDOMProps,
    | "children"
    | "class"
    | "className"
    | "onChange"
  > {
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
  curve?: "linear" | "perceptual";
  defaultMuted?: boolean;
  defaultValue?: number;
  disabled?: boolean;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  orientation?: Orientation;
  size?: AudioSize;
  step?: number;
  value?: number;
}

const VOLUME_CONTROL_OWN = [
  "children",
  "class",
  "className",
  "curve",
  "defaultMuted",
  "defaultValue",
  "disabled",
  "muted",
  "onMutedChange",
  "onValueChange",
  "onValueCommitted",
  "orientation",
  "size",
  "step",
  "value",
] as const;

export const VolumeControl = (
  props: VolumeControlProps
) => {
  const rest = omitProps(
    props,
    VOLUME_CONTROL_OWN
  );

  const config = useAudioConfig();

  const orientation = () =>
    props.orientation ??
    "horizontal";

  const size = () =>
    props.size ??
    config.size ??
    "default";

  const disabled = () =>
    props.disabled ??
    config.disabled ??
    false;

  const step = () =>
    props.step ?? 0.05;

  const mapping = () =>
    curves[
      props.curve ??
        "perceptual"
    ];

  const [uncontrolledVolume, setUncontrolledVolume] =
    createSignal(
      clamp(
        props.defaultValue ?? 1,
        0,
        1
      )
    );

  const [uncontrolledMuted, setUncontrolledMuted] =
    createSignal(
      props.defaultMuted ?? false
    );

  const volume = () =>
    props.value ??
    uncontrolledVolume();

  const muted = () =>
    props.muted ??
    uncontrolledMuted();

  let lastAudible =
    volume() > 0
      ? volume()
      : 1;

  createCompatEffect(
    volume,
    (next) => {
      if (next > 0) {
        lastAudible = next;
      }
    }
  );

  const setVolume = (
    next: number
  ): number => {
    const clamped =
      roundValue(
        clamp(next, 0, 1)
      );

    if (clamped > 0) {
      lastAudible =
        clamped;
    }

    if (
      props.value ===
      undefined
    ) {
      setUncontrolledVolume(
        clamped
      );
    }

    props.onValueChange?.(
      clamped
    );

    return clamped;
  };

  const setMuted = (
    next: boolean
  ) => {
    if (
      props.muted ===
      undefined
    ) {
      setUncontrolledMuted(
        next
      );
    }

    props.onMutedChange?.(
      next
    );
  };

  const position = () =>
    mapping().toPosition(
      volume()
    );

  const shownPosition = () =>
    muted()
      ? 0
      : position();

  const quantizePosition = (
    next: number
  ): number => {
    const increment =
      step();

    return roundValue(
      clamp(
        Math.round(
          next / increment
        ) * increment,
        0,
        1
      )
    );
  };

  const setPosition = (
    next: number
  ): number => {
    const quantized =
      quantizePosition(next);

    const changed =
      setVolume(
        mapping().toVolume(
          quantized
        )
      );

    if (
      muted() &&
      quantized > 0
    ) {
      setMuted(false);
    }

    return changed;
  };

  const commit = (
    next: number
  ) => {
    props.onValueCommitted?.(
      next
    );
  };

  const toggleMuted = () => {
    if (
      muted() &&
      volume() <= 0
    ) {
      setVolume(
        lastAudible
      );
    }

    setMuted(
      !muted()
    );
  };

  const pageStep = () =>
    Math.max(
      step(),
      0.1
    );

  const handleKeyDown = (
    event: KeyboardEvent
  ) => {
    const current =
      shownPosition();

    let next:
      | number
      | undefined;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp": {
        next =
          current +
          (event.shiftKey
            ? pageStep()
            : step());

        break;
      }

      case "ArrowLeft":
      case "ArrowDown": {
        next =
          current -
          (event.shiftKey
            ? pageStep()
            : step());

        break;
      }

      case "PageUp": {
        next =
          current +
          pageStep();

        break;
      }

      case "PageDown": {
        next =
          current -
          pageStep();

        break;
      }

      case "Home": {
        next = 0;

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

    const changed =
      setPosition(next);

    commit(changed);
  };

  const level = () =>
    levelFor(
      volume(),
      muted()
    );

  const context: VolumeControlContextValue = {
    commit,
    disabled,
    handleKeyDown,
    level,
    muted,
    orientation,
    position,
    setPosition,
    shownPosition,
    step,
    toggleMuted,
    volume,
  };

  return provideContext(
    VolumeControlContext,
    context,
    () => (
      <div
        aria-label="Volume"
        class={cn(
          "group/volume-control flex items-center gap-2 data-disabled:opacity-50",
          orientation() ===
            "vertical"
            ? "flex-col-reverse"
            : undefined,
          size() === "sm"
            ? "[--volume-thumb-size:0.75rem] [--volume-track-size:0.1875rem]"
            : undefined,
          size() === "default"
            ? "[--volume-thumb-size:0.875rem] [--volume-track-size:0.25rem]"
            : undefined,
          size() === "lg"
            ? "[--volume-thumb-size:1rem] [--volume-track-size:0.375rem]"
            : undefined,
          props.class,
          props.className
        )}
        data-disabled={
          disabled()
            ? ""
            : undefined
        }
        data-level={level()}
        data-muted={
          muted()
            ? ""
            : undefined
        }
        data-orientation={
          orientation()
        }
        data-slot="volume-control"
        role="group"
        {...rest}
      >
        {props.children ?? (
          <>
            <VolumeControlMute />
            <VolumeControlSlider />
          </>
        )}
      </div>
    )
  );
};

export interface VolumeControlMuteProps
  extends Omit<
    ButtonDOMProps,
    | "children"
    | "class"
    | "className"
    | "disabled"
    | "onClick"
    | "type"
  > {
  children?: ButtonDOMProps["children"];
  class?: string;
  className?: string;
  onClick?: (event: MouseEvent) => void;
  type?: "button" | "submit" | "reset";
}

const MUTE_OWN = [
  "children",
  "class",
  "className",
  "onClick",
  "type",
] as const;

export const VolumeControlMute = (
  props: VolumeControlMuteProps
) => {
  const context =
    useVolumeControl(
      "VolumeControlMute"
    );

  const rest = omitProps(
    props,
    MUTE_OWN
  );

  const label = () =>
    context.muted()
      ? "Unmute"
      : "Mute";

  return (
    <button
      aria-label={label()}
      aria-pressed={
        context.muted()
          ? "true"
          : "false"
      }
      class={cn(
        "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/30 inline-flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
        props.children
          ? undefined
          : "w-auto px-2",
        props.class,
        props.className
      )}
      data-level={
        context.level()
      }
      data-muted={
        context.muted()
          ? ""
          : undefined
      }
      data-slot="volume-control-mute"
      disabled={
        context.disabled()
      }
      onClick={(event) => {
        props.onClick?.(
          event
        );

        if (
          event.defaultPrevented
        ) {
          return;
        }

        context.toggleMuted();
      }}
      type={
        props.type ??
        "button"
      }
      {...rest}
    >
      {props.children ?? (
        <span class="text-xs">
          {label()}
        </span>
      )}
    </button>
  );
};

type SliderRootProps =
  Parameters<typeof SliderPrimitive.Root>[0];

export type VolumeControlSliderProps =
  Omit<
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

const SLIDER_OWN = [
  "class",
  "className",
] as const;

export const VolumeControlSlider = (
  props: VolumeControlSliderProps
) => {
  const context =
    useVolumeControl(
      "VolumeControlSlider"
    );

  const rest = omitProps(
    props,
    SLIDER_OWN
  );

  const horizontal = () =>
    context.orientation() ===
    "horizontal";

  const sliderValue =
    createMemo(() => [
      context.shownPosition(),
    ]);

  return (
    <SliderPrimitive.Root
      class={cn(
        "relative flex touch-none items-center select-none",
        horizontal()
          ? "w-full min-w-20"
          : "h-24 flex-col",
        props.class,
        props.className
      )}
      data-slot="volume-control-slider"
      disabled={
        context.disabled()
      }
      getValueLabel={() =>
        context.muted()
          ? "Muted"
          : `${Math.round(
              context.volume() *
                PERCENT
            )}%`
      }
      maxValue={1}
      minValue={0}
      onChange={() => undefined}
      orientation={
        context.orientation()
      }
      step={context.step()}
      value={sliderValue()}
      {...rest}
    >
      <VolumeSliderCompat
        changeFromPointer={
          context.setPosition
        }
        commitPointer={
          context.commit
        }
        currentPosition={
          context.shownPosition
        }
        orientation={
          context.orientation
        }
      />

      <SliderPrimitive.Track
        class={cn(
          "relative flex items-center",
          horizontal()
            ? "h-(--volume-thumb-size) w-full px-[calc(var(--volume-thumb-size)/2)] before:absolute before:inset-x-0 before:-inset-y-1.5 pointer-coarse:before:-inset-y-3"
            : "h-full w-(--volume-thumb-size) flex-col py-[calc(var(--volume-thumb-size)/2)] before:absolute before:-inset-x-1.5 before:inset-y-0 pointer-coarse:before:-inset-x-3"
        )}
      >
        <div
          class={cn(
            "bg-input/90 relative grow rounded-full",
            horizontal()
              ? "h-(--volume-track-size) w-full"
              : "h-full w-(--volume-track-size)"
          )}
          data-slot="volume-control-track"
        >
          <div
            aria-hidden="true"
            class={cn(
              "bg-primary absolute rounded-full",
              horizontal()
                ? "inset-y-0 left-0"
                : "inset-x-0 bottom-0"
            )}
            data-slot="volume-control-range"
            style={
              horizontal()
                ? {
                    width:
                      `${context.shownPosition() * PERCENT}%`,
                  }
                : {
                    height:
                      `${context.shownPosition() * PERCENT}%`,
                  }
            }
          />
        </div>

        <SliderPrimitive.Thumb
          aria-label="Volume"
          aria-valuetext={
            context.muted()
              ? "Muted"
              : `${Math.round(
                  context.volume() *
                    PERCENT
                )}%`
          }
          class="bg-background ring-foreground/15 hover:ring-ring/30 focus-visible:ring-ring/40 data-dragging:ring-ring/30 block size-(--volume-thumb-size) shrink-0 rounded-full shadow-sm ring-1 outline-hidden transition-[box-shadow] hover:ring-4 focus-visible:ring-4 data-dragging:ring-4"
          data-slot="volume-control-thumb"
          onKeyDown={
            context.handleKeyDown
          }
        >
          <SliderPrimitive.Input />
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Track>
    </SliderPrimitive.Root>
  );
};

export interface VolumeControlValueProps
  extends Omit<
    SpanDOMProps,
    "children" | "class" | "className"
  > {
  class?: string;
  className?: string;
}

const VALUE_OWN = [
  "class",
  "className",
] as const;

export const VolumeControlValue = (
  props: VolumeControlValueProps
) => {
  const context =
    useVolumeControl(
      "VolumeControlValue"
    );

  const rest = omitProps(
    props,
    VALUE_OWN
  );

  return (
    <span
      class={cn(
        "text-muted-foreground w-9 shrink-0 text-end font-mono text-xs tabular-nums",
        props.class,
        props.className
      )}
      data-slot="volume-control-value"
      {...rest}
    >
      {context.muted()
        ? "0%"
        : `${Math.round(
            context.position() *
              PERCENT
          )}%`}
    </span>
  );
};
