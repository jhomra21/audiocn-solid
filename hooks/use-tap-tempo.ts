import { createSignal } from "solid-js";

import { clamp } from "@/lib/audio/decibels";
import { createCompatEffect } from "@/lib/solid/effect";

const MAX_TAPS = 5;

const MIN_TAP_INTERVAL = 80;

const MINUTE_MS = 60_000;

export interface TempoChangeDetails {
  reason: "input" | "keyboard" | "tap";
  event?: Event;
}

export interface UseTapTempoOptions {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number, details: TempoChangeDetails) => void;
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  tapTimeout?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

export const useTapTempo = (options: UseTapTempoOptions = {}) => {
  const min = () => Math.ceil(options.min ?? 30);
  const max = () => Math.floor(options.max ?? 600);

  const [uncontrolled, setUncontrolled] = createSignal(
    options.defaultValue ?? 120
  );

  const [tapCount, setTapCount] = createSignal(0);

  const value = () =>
    clamp(
      Math.round(options.value === undefined ? uncontrolled() : options.value),
      min(),
      max()
    );

  const taps: number[] = [];

  const resetTaps = () => {
    taps.length = 0;
  };

  createCompatEffect(
    () => [
      options.disabled,
      options.readOnly,
      min(),
      max(),
      options.tapTimeout,
    ],
    resetTaps
  );

  const change = (
    next: number,
    details: TempoChangeDetails = { reason: "input" }
  ) => {
    if (options.disabled || options.readOnly || !Number.isFinite(next)) return;
    const bounded = clamp(Math.round(next), min(), max());

    if (bounded === value()) return;

    if (options.value === undefined) setUncontrolled(bounded);
    options.onValueChange?.(bounded, details);
  };

  const tap = (event?: Event) => {
    if (options.disabled || options.readOnly) return;
    const now = performance.now();
    const previous = taps.at(-1);

    if (previous !== undefined) {
      const interval = now - previous;

      if (interval >= 0 && interval < MIN_TAP_INTERVAL) return;

      if (interval < 0 || interval > (options.tapTimeout ?? 2000)) {
        taps.length = 0;
      }
    }

    taps.push(now);

    if (taps.length > MAX_TAPS) taps.shift();
    setTapCount((count) => count + 1);

    if (taps.length < 2) return;
    const first = taps[0];

    if (first === undefined) return;

    const bpm = clamp(
      Math.round((MINUTE_MS * (taps.length - 1)) / (now - first)),
      min(),
      max()
    );

    change(bpm, { event, reason: "tap" });
    options.onValueCommitted?.(bpm);
  };

  const setValue = (next: number, details?: TempoChangeDetails) => {
    resetTaps();
    change(next, details);
  };

  return { value, tapCount, tap, setValue, resetTaps };
};
