import type { SliderContextValue } from "@kobalte/core/slider";
import * as Solid from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";

interface SliderCallbacks {
  onChangeEnd?: () => void;
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
 * required pointer remapping in one adapter. Alpha.2's move handler calls
 * onChange twice: setThumbPercent emits the new value, then onChange(values())
 * replays the previous controlled value before Solid 2's queued update settles.
 * Its end handler likewise reads the old dragging array after writing it and
 * misses onChangeEnd. Adapt those two synchronous-read assumptions here, while
 * leaving vendor pointer capture, focus, keyboard and input handling intact.
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

  const queuedUpdates = "onSettled" in Solid;
  let activeIndex: number | undefined;
  let currentPosition: number | null = null;

  const move: SliderContextValue["onSlideMove"] = (delta) => {
    if (!queuedUpdates) {
      // 0.13.14 uses inversion alone for horizontal deltas, although thumb
      // placement and track presses also use locale. Correct RTL before delegation.
      const rtl = context.isSlidingFromLeft() === context.inverted();
      originals.onSlideMove?.({
        deltaX: rtl ? -delta.deltaX : delta.deltaX,
        deltaY: delta.deltaY,
      });

      return;
    }

    if (activeIndex === undefined || context.state.isDisabled()) return;
    const rect = context.trackRef()!.getBoundingClientRect();
    const vertical = context.state.orientation() === "vertical";
    const size = vertical ? rect.height : rect.width;

    if (size <= 0) return;
    currentPosition ??= context.state.getThumbPercent(activeIndex) * size;

    const direction = vertical
      ? context.isSlidingFromBottom()
        ? -1
        : 1
      : context.isSlidingFromLeft()
        ? 1
        : -1;

    currentPosition += (vertical ? delta.deltaY : delta.deltaX) * direction;
    context.state.setThumbPercent(
      activeIndex,
      Math.min(1, Math.max(0, currentPosition / size))
    );
  };

  context.onSlideStart = (index, value) => {
    activeIndex = index;
    currentPosition = null;

    if (callbacks.onSlideStart)
      callbacks.onSlideStart(originals.onSlideStart, index, value);
    else originals.onSlideStart?.(index, value);
  };

  context.onSlideMove = (delta) => {
    if (callbacks.onSlideMove) callbacks.onSlideMove(move, delta);
    else move(delta);
  };

  context.onSlideEnd = () => {
    if (callbacks.onSlideEnd) callbacks.onSlideEnd(originals.onSlideEnd);
    else {
      originals.onSlideEnd?.();

      if (
        queuedUpdates &&
        activeIndex !== undefined &&
        !context.state.isDisabled()
      )
        callbacks.onChangeEnd?.();
    }

    activeIndex = undefined;
  };

  if (callbacks.suppressStep) {
    context.onStepKeyDown = () => undefined;
  }

  Solid.onCleanup(() => {
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
