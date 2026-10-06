import { createMemo } from "solid-js";

import type { FrameSource } from "@/lib/audio/types";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

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
  // Memos pass on only a changed value, so a source or option that is re-read
  // without changing does not resubscribe.
  const current = createMemo(() => readMaybeAccessor(source));
  const enabled = createMemo(() => readMaybeAccessor(options).enabled ?? true);

  createCompatEffect(
    () => ({ current: current(), enabled: enabled() }),
    ({ current, enabled }) => {
      if (!(current && enabled)) {
        return;
      }

      return current.subscribe(onFrame);
    }
  );
};
