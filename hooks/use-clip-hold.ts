import { createSignal, onCleanup, untrack } from "solid-js";

import { CLIP_HOLD_MS, CLIP_THRESHOLD_DB } from "@/lib/audio/zones";
import { createCompatEffect } from "@/lib/solid/effect";

export interface UseClipHoldOptions {
  /** Levels at or above this count as a clip. Default −1 dBFS. */
  thresholdDb?: number;
  /** How long the clip state holds. `Infinity` latches until `reset()`. */
  holdMs?: number;
  onClippingChange?: (clipping: boolean) => void;
}

export interface ClipHold {
  readonly clipping: boolean;
  /** Number of separate clips since creation or the last reset. */
  readonly count: number;
  report: (db: number) => void;
  reset: () => void;
}

export const useClipHold = (options: UseClipHoldOptions = {}): ClipHold => {
  const [clipping, setClipping] = createSignal(false);
  const [count, setCount] = createSignal(0);
  let clippingCurrent = false;
  let above = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const update = (next: boolean) => {
    if (clippingCurrent === next) {
      return;
    }

    clippingCurrent = next;
    setClipping(next);
    untrack(() => options.onClippingChange)?.(next);
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const scheduleRelease = () => {
    clearTimer();
    const holdMs = untrack(() => options.holdMs) ?? CLIP_HOLD_MS;

    if (Number.isFinite(holdMs)) {
      timer = setTimeout(() => {
        timer = null;
        update(false);
      }, holdMs);
    }
  };

  const report = (db: number) => {
    const isAbove =
      db >= (untrack(() => options.thresholdDb) ?? CLIP_THRESHOLD_DB);

    const wasAbove = above;
    above = isAbove;

    if (!isAbove) {
      return;
    }

    if (!wasAbove) {
      setCount((previous) => previous + 1);
    }

    update(true);
    scheduleRelease();
  };

  const reset = () => {
    clearTimer();
    above = false;
    setCount(0);
    update(false);
  };

  createCompatEffect(
    () => options.holdMs ?? CLIP_HOLD_MS,
    () => {
      if (clippingCurrent && timer === null) {
        scheduleRelease();
      }

      return clearTimer;
    }
  );

  onCleanup(clearTimer);

  return {
    get clipping() {
      return clipping();
    },
    get count() {
      return count();
    },
    report,
    reset,
  };
};
