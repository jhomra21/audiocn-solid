import type { FrameSource } from "@/lib/audio/types";
import { readMaybeAccessor } from "@/lib/accessor";
import type { MaybeAccessor } from "@/lib/accessor";
import { createCompatEffect } from "@/lib/solid-effect";

export interface UseFrameSourceOptions {
  /** Pause the subscription without unmounting. Default true. */
  enabled?: boolean;
}

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
      const current = readMaybeAccessor(source);
      const { enabled = true } = readMaybeAccessor(options);

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
