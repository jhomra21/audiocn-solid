import type { Accessor } from "solid-js";

import { createCompatEffect } from "@/lib/solid-effect";

export interface VisibilityRef {
  current: boolean;
}

/**
 * Tracks whether an element is on screen without making visibility itself part
 * of the render graph. Painters can read `current` and sleep while hidden.
 */
export const useVisibility = (
  target: Accessor<Element | null>,
  onChange?: (visible: boolean) => void
): VisibilityRef => {
  const visible = { current: true };

  createCompatEffect(target, (element) => {
    if (!element || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting !== visible.current) {
          visible.current = entry.isIntersecting;
          onChange?.(entry.isIntersecting);
        }
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  });

  return visible;
};
