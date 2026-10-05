import { For, createMemo } from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { createBarLevels } from "@/lib/audio/bar-levels";
import type { BarIdle } from "@/lib/audio/bar-levels";
import { createFrameTask, createPainterClock } from "@/lib/audio/frame-loop";
import type { FrameSource, Orientation, VisualFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";
import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

export interface BarVisualizerActions {
  paint: (levels: ArrayLike<number>) => void;
}

export interface BarVisualizerProps extends Omit<DivDOMProps, "ref"> {
  className?: string;
  ref?: RefTarget<HTMLDivElement>;
  source?: FrameSource<VisualFrame> | null;
  levels?: ArrayLike<number>;
  barCount?: number;
  align?: "center" | "start" | "end";
  mirrored?: boolean;
  minLevel?: number;
  idle?: BarIdle;
  loading?: boolean;
  orientation?: Orientation;
  actionsRef?: RefTarget<BarVisualizerActions>;
}

const ALIGN_CLASS = {
  center: "items-center",
  end: "items-end",
  start: "items-start",
};

const noop = () => {};

export const BarVisualizer = (props: BarVisualizerProps) => {
  const config = useAudioConfig();
  const reducedMotion = useReducedMotion();

  const orientation = () =>
    props.orientation ?? config.orientation ?? "horizontal";

  const count = () => props.barCount ?? 24;

  const indexes = createMemo(() =>
    Array.from({ length: count() }, (_, index) => index)
  );

  let root: HTMLDivElement | undefined;
  const bars: HTMLSpanElement[] = [];
  let input: ArrayLike<number> | null = null;
  let wake = noop;
  let hadLevels = false;

  const visible = useVisibility(
    () => root ?? null,
    (shown) => {
      if (shown) wake();
    }
  );

  const paint = (levels: ArrayLike<number>) => {
    input = levels;
    wake();
  };

  useFrameSource(
    () => props.source,
    (frame) => paint(frame.bands)
  );
  createCompatEffect(
    () => props.levels,
    (levels) => {
      if (levels) {
        input = levels;
        hadLevels = true;
      } else if (hadLevels) {
        input = null;
        hadLevels = false;
      }

      wake();
    }
  );
  createCompatEffect(
    () => props.actionsRef,
    (ref) => {
      setRefValue(ref, { paint });

      return () => setRefValue(ref, null);
    }
  );
  createCompatEffect(
    () => ({
      barCount: count(),
      idle: props.idle ?? "static",
      loading: props.loading ?? false,
      minLevel: props.minLevel ?? 0.08,
      mirrored: props.mirrored ?? false,
      reducedMotion: reducedMotion(),
    }),
    (options) => {
      const levels = createBarLevels(options);
      const shown = new Float32Array(options.barCount).fill(-1);
      const clock = createPainterClock();
      let lastPaint = Number.NEGATIVE_INFINITY;
      let activeShown: boolean | null = null;

      const task = createFrameTask((frameMs) => {
        if (!visible.current) return false;
        const now = clock(frameMs);

        if (options.reducedMotion && now - lastPaint < 250) return true;
        lastPaint = now;
        const active = levels.step(now, input);

        if (active !== activeShown) {
          activeShown = active;
          root?.toggleAttribute("data-active", active);
        }

        for (const [index, value] of levels.levels.entries()) {
          if (Math.abs(value - shown[index]) > 0.002) {
            shown[index] = value;
            bars[index]?.style.setProperty("--bar-level", value.toFixed(4));
          }
        }

        return !levels.settled;
      });

      wake = task.wake;
      task.wake();

      return () => {
        wake = noop;
        task.stop();
        root?.removeAttribute("data-active");
      };
    }
  );

  const rest = omitProps(props, [
    "class",
    "className",
    "ref",
    "source",
    "levels",
    "barCount",
    "align",
    "mirrored",
    "minLevel",
    "idle",
    "loading",
    "orientation",
    "actionsRef",
  ]);

  return (
    <div
      aria-label="Audio visualizer"
      class={cn(
        "flex justify-center gap-(--bar-gap) [--bar-gap:0.1875rem] [--bar-radius:9999px] [--bar-width:0.375rem]",
        orientation() === "horizontal"
          ? "h-16 w-full flex-row"
          : "h-full w-16 flex-col",
        ALIGN_CLASS[props.align ?? "center"],
        props.class,
        props.className
      )}
      data-loading={props.loading ? "" : undefined}
      data-orientation={orientation()}
      data-slot="bar-visualizer"
      role="img"
      {...rest}
      ref={(node: HTMLDivElement) => {
        root = node;
        setRefValue(props.ref, node);
      }}
    >
      <For each={indexes()}>
        {(index) => (
          <span
            class={cn(
              "rounded-(--bar-radius) bg-current",
              orientation() === "horizontal"
                ? "h-[calc(var(--bar-level)*100%)] max-w-(--bar-width) min-w-0 flex-1"
                : "max-h-(--bar-width) min-h-0 w-[calc(var(--bar-level)*100%)] flex-1"
            )}
            data-index={index}
            data-slot="bar-visualizer-bar"
            ref={(node: HTMLSpanElement) => {
              bars[index] = node;
            }}
            style={{ "--bar-level": props.minLevel ?? 0.08 }}
          />
        )}
      </For>
    </div>
  );
};
