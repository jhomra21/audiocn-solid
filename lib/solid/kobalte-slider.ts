import type { SliderContextValue } from "@kobalte/core/slider";
import { onCleanup } from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";

interface SliderCallbacks {
  onSlideEnd?: (original: SliderContextValue["onSlideEnd"]) => void;
  onSlideMove?: (
    original: SliderContextValue["onSlideMove"],
    delta: { deltaX: number; deltaY: number }
  ) => void;
  onSlideStart?: (
    original: SliderContextValue["onSlideStart"],
    index: number,
    value: number
  ) => void;
  suppressStep?: boolean;
}

/**
 * Kobalte 0.13.14 and 2.0.0-alpha.2 call these context methods dynamically.
 * SliderContextValue exposes them, but method replacement is not a documented
 * extension point, so keep the Solid 2 thumb-editability workaround and all
 * required pointer remapping in one adapter.
 */
export const useKobalteSliderCompat = (
  context: SliderContextValue,
  callbacks: SliderCallbacks = {}
): void => {
  const originals = {
    onSlideEnd: context.onSlideEnd,
    onSlideMove: context.onSlideMove,
    onSlideStart: context.onSlideStart,
    onStepKeyDown: context.onStepKeyDown,
  };

  if (callbacks.onSlideStart) {
    context.onSlideStart = (index, value) =>
      callbacks.onSlideStart?.(originals.onSlideStart, index, value);
  }

  if (callbacks.onSlideMove) {
    context.onSlideMove = (delta) =>
      callbacks.onSlideMove?.(originals.onSlideMove, delta);
  }

  if (callbacks.onSlideEnd) {
    context.onSlideEnd = () => callbacks.onSlideEnd?.(originals.onSlideEnd);
  }

  if (callbacks.suppressStep) {
    context.onStepKeyDown = () => undefined;
  }

  onCleanup(() => {
    context.onSlideEnd = originals.onSlideEnd;
    context.onSlideMove = originals.onSlideMove;
    context.onSlideStart = originals.onSlideStart;
    context.onStepKeyDown = originals.onStepKeyDown;
  });

  createCompatEffect(
    () => [context.thumbs().length, context.state.isDisabled()] as const,
    ([thumbCount, isDisabled]) => {
      for (let index = 0; index < thumbCount; index += 1) {
        context.state.setThumbEditable(index, !isDisabled);
      }
    }
  );
};
