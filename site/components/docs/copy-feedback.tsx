import type { JSX } from "@solidjs/web";
import { animate } from "framer-motion/dom";
import { For, createSignal, onCleanup } from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";
import type { CopyFeedbackState } from "@/site/lib/docs/copy-feedback";

interface IconEntry {
  key: number;
  motion: "none" | "reduced-motion" | "spring";
  phase: "enter" | "exit" | "static";
  state: CopyFeedbackState;
}

interface CopyFeedbackProps {
  state: () => CopyFeedbackState;
  renderIcon: (state: CopyFeedbackState) => JSX.Element;
}

export const CopyErrorIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6m0-6 6 6" />
  </svg>
);

export const CopyFeedback = (props: CopyFeedbackProps) => {
  let nextKey = 0;
  let generation = 0;

  const initial: IconEntry = {
    key: nextKey++,
    motion: "none",
    phase: "static",
    state: props.state(),
  };

  const [icons, setIcons] = createSignal([initial]);
  const elements = new Map<number, HTMLSpanElement>();
  const animations = new Set<ReturnType<typeof animate>>();
  let animationFrame = 0;

  createCompatEffect(
    () => props.state(),
    (state) => {
      const current = icons()[icons().length - 1];

      if (state === current.state) return;

      const id = ++generation;

      const reducedMotion = matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const motion = reducedMotion ? "reduced-motion" : "spring";

      const entering: IconEntry = {
        key: nextKey++,
        motion,
        phase: "enter",
        state,
      };

      for (const animation of animations) animation.stop();
      animations.clear();
      setIcons([{ ...current, phase: "exit" }, entering]);

      for (const key of elements.keys()) {
        if (key !== current.key) elements.delete(key);
      }

      globalThis.cancelAnimationFrame?.(animationFrame);

      animationFrame = globalThis.requestAnimationFrame(() => {
        const outgoing = elements.get(current.key);
        const incoming = elements.get(entering.key);

        if (!outgoing || !incoming) return;

        const options = { type: "spring" as const, duration: 0.3, bounce: 0 };

        const exit = animate(
          outgoing,
          {
            filter: "blur(4px)",
            opacity: 0,
            scale: 0.25,
          },
          reducedMotion ? { duration: 0.001, type: "tween" } : options
        );

        const enter = animate(
          incoming,
          {
            filter: "blur(0px)",
            opacity: 1,
            scale: 1,
          },
          reducedMotion ? { duration: 0.001, type: "tween" } : options
        );

        animations.add(exit);
        animations.add(enter);
        void Promise.all([
          exit.finished.catch(() => null),
          enter.finished.catch(() => null),
        ]).then(() => {
          if (generation === id) {
            setIcons([{ ...entering, phase: "static" }]);
            animations.clear();
            elements.delete(current.key);
          }
        });
      });
    }
  );

  onCleanup(() => {
    generation += 1;
    globalThis.cancelAnimationFrame?.(animationFrame);

    for (const animation of animations) animation.stop();
    animations.clear();
  });

  return (
    <span aria-hidden="true" class="copy-icon-swap">
      <For each={icons()}>
        {(entry) => (
          <span
            class="copy-feedback-icon"
            data-copy-icon={entry.state}
            data-copy-motion={entry.motion}
            data-copy-phase={entry.phase}
            ref={(element) => {
              elements.set(entry.key, element);
            }}
            style={{
              opacity: entry.phase === "enter" ? 0 : undefined,
              filter: entry.phase === "enter" ? "blur(4px)" : undefined,
              transform: entry.phase === "enter" ? "scale(0.25)" : undefined,
            }}
          >
            {props.renderIcon(entry.state)}
          </span>
        )}
      </For>
    </span>
  );
};
