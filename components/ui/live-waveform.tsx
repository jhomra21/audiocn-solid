import { useFrameSource } from "@/hooks/use-frame-source";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { resampleLevels } from "@/lib/audio/bands";
import { clamp } from "@/lib/audio/decibels";
import { createFrameTask } from "@/lib/audio/frame-loop";
import { createHistoryPlayback } from "@/lib/audio/history-playback";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";
import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

export interface LiveWaveformActions {
  paint: (frame: VisualFrame) => void;
  clear: () => void;
}

export interface LiveWaveformProps extends Omit<DivDOMProps, "ref"> {
  className?: string;
  ref?: RefTarget<HTMLDivElement>;
  source?: FrameSource<VisualFrame> | null;
  mode?: "scrolling" | "static";
  variant?: "bars" | "line" | "mirror";
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  minBarHeight?: number;
  lineWidth?: number;
  fadeEdges?: boolean;
  fadeWidth?: number;
  active?: boolean;
  sensitivity?: number;
  actionsRef?: RefTarget<LiveWaveformActions>;
}

interface Size {
  width: number;
  height: number;
  ratio: number;
}

interface DrawOptions {
  mode: "scrolling" | "static";
  variant: "bars" | "line" | "mirror";
  barWidth: number;
  barGap: number;
  barRadius: number;
  minBarHeight: number;
  lineWidth: number;
  fadeEdges: boolean;
  fadeWidth: number;
  active: boolean;
  sensitivity: number;
}

const drawBar = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath();
  context.roundRect(
    x,
    y,
    width,
    height,
    Math.min(radius, width / 2, height / 2)
  );
  context.fill();
};

const historyLevels = (frame: VisualFrame, count: number) => {
  const available = Math.min(frame.historyLength, count);
  const size = frame.history.length;

  const includePrevious =
    available === size &&
    available < count &&
    frame.historyPreviousLevel !== undefined;

  const offset = includePrevious ? 1 : 0;
  const out = new Float32Array(available + offset);

  if (includePrevious) out[0] = frame.historyPreviousLevel ?? 0;
  const first = frame.historyStart + frame.historyLength - available;

  for (let index = 0; index < available; index++)
    out[index + offset] = frame.history[(first + index) % size] ?? 0;

  return out;
};

const levelsFor = (
  frame: VisualFrame,
  count: number,
  options: DrawOptions
): Float32Array => {
  if (options.mode === "scrolling") return historyLevels(frame, count + 1);

  if (options.variant !== "mirror")
    return resampleLevels(
      frame.bands,
      0,
      frame.bands.length,
      new Float32Array(count)
    );

  const half = resampleLevels(
    frame.bands,
    0,
    frame.bands.length,
    new Float32Array(Math.ceil(count / 2))
  );

  const out = new Float32Array(count);
  const center = (count - 1) / 2;

  for (let index = 0; index < count; index++)
    out[index] =
      half[Math.min(half.length - 1, Math.floor(Math.abs(index - center)))] ??
      0;

  return out;
};

const drawIdle = (
  context: CanvasRenderingContext2D,
  size: Size,
  options: DrawOptions
) => {
  const step = (options.barWidth + options.barGap) * 2;
  context.globalAlpha = 0.35;

  for (let x = 0; x < size.width; x += step)
    context.fillRect(x, size.height / 2 - 0.5, options.barWidth, 1);
  context.globalAlpha = 1;
};

const drawLine = (
  context: CanvasRenderingContext2D,
  size: Size,
  frame: VisualFrame,
  options: DrawOptions,
  progress: number
) => {
  const middle = size.height / 2;
  context.lineWidth = options.lineWidth;
  context.lineJoin = "round";
  context.beginPath();

  if (
    options.mode === "static" &&
    frame.timeDomain &&
    frame.timeDomain.length > 1
  ) {
    for (let index = 0; index < frame.timeDomain.length; index++) {
      const x = (index / (frame.timeDomain.length - 1)) * size.width;
      const value = clamp(frame.timeDomain[index] * options.sensitivity, -1, 1);
      const y = middle - value * (middle - options.lineWidth);

      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }

    context.stroke();

    return;
  }

  const count = Math.max(
    2,
    Math.floor(size.width / (options.barWidth + options.barGap))
  );

  const levels = levelsFor(frame, count, { ...options, variant: "bars" });
  const offset = count - levels.length + 1 - progress;

  for (let index = 0; index < levels.length; index++) {
    const x = ((offset + index) / (count - 1)) * size.width;
    const value = clamp(levels[index] * options.sensitivity, 0, 1);
    const y = middle - value * (middle - options.lineWidth);

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  for (let index = levels.length - 1; index >= 0; index--) {
    const x = ((offset + index) / (count - 1)) * size.width;
    const value = clamp(levels[index] * options.sensitivity, 0, 1);
    context.lineTo(x, middle + value * (middle - options.lineWidth));
  }

  context.closePath();
  context.globalAlpha = 0.25;
  context.fill();
  context.globalAlpha = 1;
  context.stroke();
};

const drawLevelBar = (
  context: CanvasRenderingContext2D,
  size: Size,
  options: DrawOptions,
  x: number,
  level: number
) => {
  const value = clamp(level * options.sensitivity, 0, 1);
  const height = Math.max(options.minBarHeight, value * size.height);
  context.globalAlpha = 0.4 + 0.6 * value;
  drawBar(
    context,
    x,
    (size.height - height) / 2,
    options.barWidth,
    height,
    options.barRadius
  );
};

const drawBars = (
  context: CanvasRenderingContext2D,
  size: Size,
  frame: VisualFrame,
  options: DrawOptions,
  progress: number
) => {
  const pitch = options.barWidth + options.barGap;
  const count = Math.max(1, Math.floor((size.width + options.barGap) / pitch));

  if (options.mode === "scrolling" && options.variant === "mirror") {
    const levels = historyLevels(frame, Math.ceil(count / 2) + 1);
    const center = (size.width - options.barWidth) / 2;
    context.save();
    context.beginPath();
    context.rect(0, 0, center, size.height);
    context.rect(center + options.barWidth, 0, center, size.height);
    context.clip();

    for (let age = levels.length - 1; age > 0; age--) {
      const value = levels[levels.length - 1 - age] ?? 0;
      const distance = (age - 1 + progress) * pitch;
      drawLevelBar(context, size, options, center - distance, value);
      drawLevelBar(context, size, options, center + distance, value);
    }

    context.restore();

    if (levels.length > 0) {
      const newest = levels.at(-1) ?? 0;
      const previous = levels.at(-2) ?? newest;
      drawLevelBar(
        context,
        size,
        options,
        center,
        previous + (newest - previous) * progress
      );
    }
  } else {
    const levels = levelsFor(frame, count, options);
    const offset = count - levels.length + 1 - progress;
    const left = (size.width - (count * pitch - options.barGap)) / 2;

    for (let index = 0; index < levels.length; index++)
      drawLevelBar(
        context,
        size,
        options,
        left + (offset + index) * pitch,
        levels[index] ?? 0
      );
  }

  context.globalAlpha = 1;
};

const fade = (context: CanvasRenderingContext2D, size: Size, width: number) => {
  const edge = Math.min(width, size.width / 2);
  context.globalCompositeOperation = "destination-out";
  const left = context.createLinearGradient(0, 0, edge, 0);
  left.addColorStop(0, "rgba(0, 0, 0, 1)");
  left.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = left;
  context.fillRect(0, 0, edge, size.height);

  const right = context.createLinearGradient(
    size.width - edge,
    0,
    size.width,
    0
  );

  right.addColorStop(0, "rgba(0, 0, 0, 0)");
  right.addColorStop(1, "rgba(0, 0, 0, 1)");
  context.fillStyle = right;
  context.fillRect(size.width - edge, 0, edge, size.height);
  context.globalCompositeOperation = "source-over";
};

const noop = () => {};

export const LiveWaveform = (props: LiveWaveformProps) => {
  const reducedMotion = useReducedMotion();
  let canvas: HTMLCanvasElement | undefined;
  let frame: VisualFrame | null = null;
  let dirty = true;
  let wake = noop;
  const playback = createHistoryPlayback();

  const visible = useVisibility(
    () => canvas ?? null,
    (shown) => {
      if (shown) wake();
    }
  );

  const paint = (next: VisualFrame) => {
    frame = next;
    dirty = true;
    wake();
  };

  const clear = () => {
    playback.clear();
    frame = null;
    dirty = true;
    wake();
  };

  createCompatEffect(() => props.source, clear);
  useFrameSource(() => props.source, paint);
  createCompatEffect(
    () => props.actionsRef,
    (ref) => {
      setRefValue(ref, { paint, clear });

      return () => setRefValue(ref, null);
    }
  );

  createCompatEffect(
    () => ({
      active: props.active ?? true,
      barGap: props.barGap ?? 1,
      barRadius: props.barRadius ?? 1.5,
      barWidth: props.barWidth ?? 3,
      fadeEdges: props.fadeEdges ?? true,
      fadeWidth: props.fadeWidth ?? 24,
      lineWidth: props.lineWidth ?? 1.5,
      minBarHeight: props.minBarHeight ?? 4,
      mode: props.mode ?? "static",
      sensitivity: props.sensitivity ?? 1,
      variant: props.variant ?? "bars",
      reducedMotion: reducedMotion(),
    }),
    (options) => {
      const element = canvas;
      const context = element?.getContext("2d");

      if (!(element && context)) return;
      const size: Size = { width: 0, height: 0, ratio: 1 };
      let color = "";
      let sinceColor = 30;
      let lastPaint = 0;
      let lastProgress = 1;
      let wakeTask = noop;
      dirty = true;

      const resize = () => {
        const rect = element.getBoundingClientRect();
        size.ratio = window.devicePixelRatio || 1;
        size.width = rect.width;
        size.height = rect.height;
        element.width = Math.max(1, Math.round(rect.width * size.ratio));
        element.height = Math.max(1, Math.round(rect.height * size.ratio));
        sinceColor = 30;
        dirty = true;
        wakeTask();
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const task = createFrameTask((nowMs) => {
        if (++sinceColor >= 30) {
          sinceColor = 0;
          const next = getComputedStyle(element).color;

          if (next !== color) {
            color = next;
            dirty = true;
          }
        }

        let current = frame;
        let progress = 1;

        if (
          current &&
          options.active &&
          options.mode === "scrolling" &&
          !options.reducedMotion
        ) {
          const next = playback.read(current, nowMs);
          current = next.frame;
          progress = next.progress;
        } else playback.clear();

        if (progress !== lastProgress) dirty = true;

        if (!visible.current || size.width === 0) return false;

        if (!dirty) return progress < 1;

        if (options.reducedMotion && nowMs - lastPaint < 250) return true;
        lastPaint = nowMs;
        lastProgress = progress;
        dirty = false;
        context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
        context.fillStyle = color;
        context.strokeStyle = color;

        if (!(options.active && current)) {
          drawIdle(context, size, options);

          return false;
        }

        if (options.variant === "line")
          drawLine(context, size, current, options, progress);
        else drawBars(context, size, current, options, progress);

        if (options.fadeEdges) fade(context, size, options.fadeWidth);

        return progress < 1;
      });

      wakeTask = task.wake;
      wake = task.wake;

      const themeChanged = () => {
        sinceColor = 30;
        task.wake();
      };

      const themeObserver = new MutationObserver(themeChanged);
      themeObserver.observe(document.documentElement, {
        attributeFilter: ["class", "style", "data-theme"],
        attributes: true,
      });
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      media.addEventListener("change", themeChanged);

      return () => {
        wake = noop;
        task.stop();
        observer.disconnect();
        themeObserver.disconnect();
        media.removeEventListener("change", themeChanged);
      };
    }
  );

  const rest = omitProps(props, [
    "class",
    "className",
    "ref",
    "source",
    "mode",
    "variant",
    "barWidth",
    "barGap",
    "barRadius",
    "minBarHeight",
    "lineWidth",
    "fadeEdges",
    "fadeWidth",
    "active",
    "sensitivity",
    "actionsRef",
  ]);

  return (
    <div
      aria-label="Live waveform"
      class={cn(
        "relative h-16 w-full [--waveform:currentColor]",
        props.class,
        props.className
      )}
      data-active={(props.active ?? true) ? "" : undefined}
      data-mode={props.mode ?? "static"}
      data-slot="live-waveform"
      data-variant={props.variant ?? "bars"}
      role="img"
      {...rest}
      ref={(node: HTMLDivElement) => setRefValue(props.ref, node)}
    >
      <canvas
        class="absolute inset-0 size-full text-(--waveform)"
        data-slot="live-waveform-canvas"
        ref={(node: HTMLCanvasElement) => {
          canvas = node;
        }}
      />
    </div>
  );
};
