import type { Accessor } from "solid-js";

import type { FrameSource } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid-effect";

export interface UseFrameSourceOptions {
  /** Pause the subscription without unmounting. Default true. */
  enabled?: boolean;
}

type MaybeAccessor<T> = T | Accessor<T>;

const read = <T>(value: MaybeAccessor<T>): T =>
  typeof value === "function" ? (value as Accessor<T>)() : value;

/**
 * Subscribes `onFrame` to a frame source and releases the subscription when
 * the source changes or the owner is disposed.
 */
export const useFrameSource = <T>(
  source: MaybeAccessor<FrameSource<T> | null | undefined>,
  onFrame: (frame: T) => void,
  options: MaybeAccessor<UseFrameSourceOptions> = {}
): void => {
  createCompatEffect(
    () => {
      const current = read(source);
      const { enabled = true } = read(options);
      return { current, enabled };
    },
    ({ current, enabled }) => {
      if (!(current && enabled)) {
        return;
      }

      return current.subscribe(onFrame);
    }
  );
};
