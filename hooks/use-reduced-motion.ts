import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";

import { createCompatEffect } from "@/lib/solid-effect";

const QUERY = "(prefers-reduced-motion: reduce)";

const getSnapshot = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.(QUERY).matches);

/** Reactive preference for reduced motion. */
export const useReducedMotion = (): Accessor<boolean> => {
  const [reducedMotion, setReducedMotion] = createSignal(getSnapshot());

  createCompatEffect(
    () =>
      typeof window === "undefined" || !window.matchMedia
        ? null
        : window.matchMedia(QUERY),
    (media) => {
      if (!media) {
        return;
      }

      setReducedMotion(media.matches);
      const onChange = () => setReducedMotion(media.matches);
      media.addEventListener("change", onChange);

      return () => {
        media.removeEventListener("change", onChange);
      };
    }
  );

  return reducedMotion;
};
