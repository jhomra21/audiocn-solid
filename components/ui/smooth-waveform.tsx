import { useFrameSource } from "@/hooks/use-frame-source";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { clamp } from "@/lib/audio/decibels";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";
import { createWaveLine } from "@/lib/audio/wave-line";
import type { WaveLine, WaveLineMode } from "@/lib/audio/wave-line";
import { createCompatEffect } from "@/lib/solid/effect";
import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

export type SmoothWaveformMode = WaveLineMode;

export interface SmoothWaveformActions {
  paint: (frame: VisualFrame) => void;
  clear: () => void;
}

export interface SmoothWaveformProps extends Omit<DivDOMProps, "ref"> {
  className?: string;
  ref?: RefTarget<HTMLDivElement>;
  source?: FrameSource<VisualFrame> | null;
  mode?: SmoothWaveformMode;
  loading?: boolean;
  sensitivity?: number;
  lineWidth?: number;
  fadeEdges?: boolean;
  actionsRef?: RefTarget<SmoothWaveformActions>;
}

interface Size {
  width: number;
  height: number;
  ratio: number;
}

const drawLine = (
  context: CanvasRenderingContext2D,
  line: WaveLine,
  size: Size,
  width: number
) => {
  const middle = size.height / 2;
  const reach = Math.max(0, middle - width);
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();

  for (let point = 0; point < line.count; point++) {
    const x = (point / (line.count - 1)) * size.width;
    const y = middle - (line.heights[point] ?? 0) * reach;

    if (point === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  context.stroke();
};

const fadeEnds = (context: CanvasRenderingContext2D, size: Size) => {
  const edge = Math.min(24, size.width / 2);
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

export const SmoothWaveform = (props: SmoothWaveformProps) => {
  const reducedMotion = useReducedMotion();
  let root: HTMLDivElement | undefined;
  let canvas: HTMLCanvasElement | undefined;
  let frame: VisualFrame | null = null;
  const visible = useVisibility(() => root ?? null);

  const paint = (next: VisualFrame) => {
    frame = next;
  };

  useFrameSource(() => props.source, paint);
  createCompatEffect(
    () => props.actionsRef,
    (ref) => {
      setRefValue(ref, {
        paint,
        clear: () => {
          frame = null;
        },
      });

      return () => setRefValue(ref, null);
    }
  );

  createCompatEffect(
    () => ({
      mode: props.mode ?? "wave",
      loading: props.loading ?? false,
      sensitivity: props.sensitivity ?? 1,
      reducedMotion: reducedMotion(),
    }),
    (options) => {
      const element = canvas;
      const container = root;
      const context = element?.getContext("2d");

      if (!(element && container && context)) return;
      const line = createWaveLine(options);
      const size: Size = { width: 0, height: 0, ratio: 1 };
      let { color } = getComputedStyle(element);
      let sinceColor = 0;
      let lastPaint = 0;
      let active = false;

      const resize = () => {
        const rect = element.getBoundingClientRect();
        size.ratio = window.devicePixelRatio || 1;
        size.width = rect.width;
        size.height = rect.height;
        element.width = Math.max(1, Math.round(rect.width * size.ratio));
        element.height = Math.max(1, Math.round(rect.height * size.ratio));
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const unsubscribe = subscribeFrame((nowMs) => {
        if (!visible.current || size.width === 0) return;

        if (++sinceColor >= 30) {
          sinceColor = 0;
          color = getComputedStyle(element).color;
        }

        if (options.reducedMotion && nowMs - lastPaint < 250) return;
        lastPaint = nowMs;

        const nextActive = line.step(
          nowMs,
          frame,
          Math.round(size.width / 3) + 1
        );

        if (nextActive !== active) {
          active = nextActive;
          container.toggleAttribute("data-active", active);
        }

        context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);
        context.strokeStyle = color;
        drawLine(
          context,
          line,
          size,
          clamp(props.lineWidth ?? 2, 0.5, size.height / 2)
        );

        if (props.fadeEdges ?? true) fadeEnds(context, size);
      });

      return () => {
        unsubscribe();
        observer.disconnect();
        container.removeAttribute("data-active");
      };
    }
  );

  const rest = omitProps(props, [
    "class",
    "className",
    "ref",
    "source",
    "mode",
    "loading",
    "sensitivity",
    "lineWidth",
    "fadeEdges",
    "actionsRef",
  ]);

  return (
    <div
      aria-label="Audio waveform"
      class={cn(
        "relative h-24 w-full [--waveform:currentColor]",
        props.class,
        props.className
      )}
      data-loading={props.loading ? "" : undefined}
      data-mode={props.mode ?? "wave"}
      data-slot="smooth-waveform"
      role="img"
      {...rest}
      ref={(node: HTMLDivElement) => {
        root = node;
        setRefValue(props.ref, node);
      }}
    >
      <canvas
        aria-hidden="true"
        class="absolute inset-0 size-full text-(--waveform)"
        data-slot="smooth-waveform-canvas"
        ref={(node: HTMLCanvasElement) => {
          canvas = node;
        }}
      />
    </div>
  );
};
