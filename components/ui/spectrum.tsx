import { For, createContext, createMemo, useContext } from "solid-js";

import { useFrameSource } from "@/hooks/use-frame-source";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { clamp } from "@/lib/audio/decibels";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import { linearTaper, logTaper } from "@/lib/audio/taper";
import type { FrameSource, Taper, VisualFrame } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  CanvasDOMProps,
  DivDOMProps,
  JSXElement,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

const DEFAULT_FREQUENCY_TICKS = [100, 1000, 10_000];

const LEVEL_TICK_DB = 12;

interface SpectrumContextValue {
  minDb: number;
  maxDb: number;
  minHz: number;
  maxHz: number;
  frequencyTaper: Taper;
  variant: "bars" | "line" | "area";
  peakHold: boolean;
  grid: boolean;
  frame: VisualFrame | null;
  version: number;
}

const SpectrumContext = createContext<SpectrumContextValue>();

const useSpectrum = (part: string) => {
  const value = useContext(SpectrumContext);

  if (!value) throw new Error(`${part} must be used inside Spectrum.`);

  return value;
};

interface Size {
  width: number;
  height: number;
  ratio: number;
}

interface Colors {
  grid: string;
  line: string;
  peak: string;
}

const readColors = (canvas: HTMLCanvasElement): Colors => {
  const style = getComputedStyle(canvas);

  return {
    grid: style.getPropertyValue("--spectrum-grid").trim() || style.color,
    line: style.getPropertyValue("--spectrum").trim() || style.color,
    peak: style.getPropertyValue("--spectrum-peak").trim() || style.color,
  };
};

const drawGrid = (
  context: CanvasRenderingContext2D,
  size: Size,
  settings: SpectrumContextValue,
  color: string
) => {
  const span = settings.maxDb - settings.minDb;
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();

  for (const db of [
    settings.maxDb,
    settings.maxDb - span / 3,
    settings.maxDb - (span * 2) / 3,
  ]) {
    const y =
      Math.round((1 - (db - settings.minDb) / span) * size.height) + 0.5;

    context.moveTo(0, y);
    context.lineTo(size.width, y);
  }

  for (const hz of DEFAULT_FREQUENCY_TICKS) {
    if (hz > settings.minHz && hz < settings.maxHz) {
      const x =
        Math.round(settings.frequencyTaper.toPosition(hz) * size.width) + 0.5;

      context.moveTo(x, 0);
      context.lineTo(x, size.height);
    }
  }

  context.stroke();
};

const drawBands = (
  context: CanvasRenderingContext2D,
  size: Size,
  bands: Float32Array,
  variant: SpectrumContextValue["variant"]
) => {
  const slot = size.width / bands.length;

  if (variant === "bars") {
    const gap = Math.min(2, slot * 0.25);

    for (const [index, band] of bands.entries()) {
      const height = clamp(band, 0, 1) * size.height;
      context.fillRect(
        index * slot + gap / 2,
        size.height - height,
        Math.max(1, slot - gap),
        height
      );
    }

    return;
  }

  context.lineWidth = 1.5;
  context.lineJoin = "round";
  context.beginPath();

  for (const [index, band] of bands.entries()) {
    const x = (index + 0.5) * slot;
    const y = size.height - clamp(band, 0, 1) * size.height;

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }

  if (variant === "area") {
    context.lineTo((bands.length - 0.5) * slot, size.height);
    context.lineTo(0.5 * slot, size.height);
    context.closePath();
    context.globalAlpha = 0.3;
    context.fill();
    context.globalAlpha = 1;
  }

  context.stroke();
};

const drawPeaks = (
  context: CanvasRenderingContext2D,
  size: Size,
  bands: Float32Array,
  peaks: Float32Array,
  release: number
) => {
  const slot = size.width / bands.length;
  let falling = false;

  for (const [index, band] of bands.entries()) {
    const level = clamp(band, 0, 1);
    const held = Math.max(level, (peaks[index] ?? 0) * release);
    peaks[index] = held;

    if (held > level + 0.001) falling = true;
    context.fillRect(
      index * slot,
      size.height - held * size.height - 1,
      Math.max(1, slot - 1),
      2
    );
  }

  return falling;
};

interface CanvasProps extends Omit<CanvasDOMProps, "ref"> {
  ref?: RefTarget<HTMLCanvasElement>;
  className?: string;
}

export const SpectrumCanvas = (props: CanvasProps) => {
  const settings = useSpectrum("SpectrumCanvas");
  const reducedMotion = useReducedMotion();
  let canvas: HTMLCanvasElement | undefined;
  const visible = useVisibility(() => canvas ?? null);

  createCompatEffect(
    () => ({
      variant: settings.variant,
      grid: settings.grid,
      peakHold: settings.peakHold,
      minDb: settings.minDb,
      maxDb: settings.maxDb,
      minHz: settings.minHz,
      maxHz: settings.maxHz,
      taper: settings.frequencyTaper,
      reduced: reducedMotion(),
    }),
    (options) => {
      const element = canvas;
      const context = element?.getContext("2d");

      if (!(element && context)) return;
      const size: Size = { width: 0, height: 0, ratio: 1 };
      let colors = readColors(element);
      let sinceColor = 0;
      let peaks = new Float32Array(0);
      let lastPaint = 0;
      let dirty = true;
      let paintedVersion = -1;

      const resize = () => {
        const rect = element.getBoundingClientRect();
        size.ratio = window.devicePixelRatio || 1;
        size.width = rect.width;
        size.height = rect.height;
        element.width = Math.max(1, Math.round(rect.width * size.ratio));
        element.height = Math.max(1, Math.round(rect.height * size.ratio));
        dirty = true;
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const unsubscribe = subscribeFrame((nowMs) => {
        if (++sinceColor >= 30) {
          sinceColor = 0;
          const next = readColors(element);

          if (
            next.grid !== colors.grid ||
            next.line !== colors.line ||
            next.peak !== colors.peak
          ) {
            colors = next;
            dirty = true;
          }
        }

        if (
          (!dirty && settings.version === paintedVersion) ||
          size.width === 0 ||
          !visible.current
        )
          return;

        if (options.reduced && nowMs - lastPaint < 250) return;
        const elapsed = lastPaint === 0 ? 0 : nowMs - lastPaint;
        lastPaint = nowMs;
        dirty = false;
        paintedVersion = settings.version;
        context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);

        if (options.grid) drawGrid(context, size, settings, colors.grid);
        const bands = settings.frame?.bands;

        if (!bands?.length) return;
        context.fillStyle = colors.line;
        context.strokeStyle = colors.line;
        drawBands(context, size, bands, options.variant);

        if (options.peakHold) {
          if (peaks.length !== bands.length)
            peaks = new Float32Array(bands.length);
          context.fillStyle = colors.peak;
          dirty = drawPeaks(
            context,
            size,
            bands,
            peaks,
            0.985 ** (elapsed / (1000 / 60))
          );
        }
      });

      return () => {
        unsubscribe();
        observer.disconnect();
      };
    }
  );
  const rest = omitProps(props, ["ref", "class", "className"]);

  return (
    <canvas
      aria-hidden="true"
      class={cn(
        "[grid-column:2] [grid-row:1] size-full min-h-0",
        props.class,
        props.className
      )}
      data-slot="spectrum-canvas"
      {...rest}
      ref={(node: HTMLCanvasElement) => {
        canvas = node;
        setRefValue(props.ref, node);
      }}
    />
  );
};

export interface SpectrumFrequencyAxisProps extends DivDOMProps {
  className?: string;
  ticks?: number[];
  format?: (hz: number) => string;
}

export const SpectrumFrequencyAxis = (props: SpectrumFrequencyAxisProps) => {
  const settings = useSpectrum("SpectrumFrequencyAxis");

  const ticks = createMemo(() =>
    (props.ticks ?? DEFAULT_FREQUENCY_TICKS).filter(
      (hz) => hz >= settings.minHz && hz <= settings.maxHz
    )
  );

  const rest = omitProps(props, ["class", "className", "ticks", "format"]);

  return (
    <div
      aria-hidden="true"
      class={cn(
        "text-muted-foreground relative [grid-column:2] [grid-row:2] h-4 text-[0.625rem] tabular-nums",
        props.class,
        props.className
      )}
      data-slot="spectrum-frequency-axis"
      {...rest}
    >
      <For each={ticks()}>
        {(hz) => (
          <span
            class="absolute top-0 left-(--tick-position) -translate-x-1/2"
            style={{
              "--tick-position": `${settings.frequencyTaper.toPosition(hz) * 100}%`,
            }}
          >
            {props.format?.(hz) ?? (hz >= 1000 ? `${hz / 1000}k` : String(hz))}
          </span>
        )}
      </For>
    </div>
  );
};

export interface SpectrumLevelAxisProps extends DivDOMProps {
  className?: string;
  ticks?: number[];
  format?: (db: number) => string;
}

export const SpectrumLevelAxis = (props: SpectrumLevelAxisProps) => {
  const settings = useSpectrum("SpectrumLevelAxis");

  const ticks = createMemo(
    () =>
      props.ticks ??
      Array.from(
        {
          length:
            Math.floor((settings.maxDb - settings.minDb) / LEVEL_TICK_DB) + 1,
        },
        (_, index) => settings.maxDb - index * LEVEL_TICK_DB
      )
  );

  const rest = omitProps(props, ["class", "className", "ticks", "format"]);

  return (
    <div
      aria-hidden="true"
      class={cn(
        "text-muted-foreground relative [grid-column:1] [grid-row:1] w-7 text-[0.625rem] tabular-nums",
        props.class,
        props.className
      )}
      data-slot="spectrum-level-axis"
      {...rest}
    >
      <For each={ticks()}>
        {(db) => (
          <span
            class="absolute right-0 bottom-(--tick-position) translate-y-1/2"
            style={{
              "--tick-position": `${((db - settings.minDb) / (settings.maxDb - settings.minDb)) * 100}%`,
            }}
          >
            {props.format?.(db) ?? String(Math.round(db))}
          </span>
        )}
      </For>
    </div>
  );
};

export interface SpectrumProps extends DivDOMProps {
  className?: string;
  source?: FrameSource<VisualFrame> | null;
  variant?: "bars" | "line" | "area";
  minDb?: number;
  maxDb?: number;
  minHz?: number;
  maxHz?: number;
  scale?: "log" | "linear";
  peakHold?: boolean;
  grid?: boolean;
  children?: JSXElement;
}

export const Spectrum = (props: SpectrumProps) => {
  let frame: VisualFrame | null = null;
  let version = 0;
  useFrameSource(
    () => props.source,
    (next) => {
      frame = next;
      version++;
    }
  );

  const taper = createMemo(() =>
    props.scale === "linear"
      ? linearTaper(props.minHz ?? 40, props.maxHz ?? 16_000)
      : logTaper(props.minHz ?? 40, props.maxHz ?? 16_000)
  );

  const settings: SpectrumContextValue = {
    get minDb() {
      return props.minDb ?? -100;
    },
    get maxDb() {
      return props.maxDb ?? -30;
    },
    get minHz() {
      return props.minHz ?? 40;
    },
    get maxHz() {
      return props.maxHz ?? 16_000;
    },
    get frequencyTaper() {
      return taper();
    },
    get variant() {
      return props.variant ?? "bars";
    },
    get peakHold() {
      return props.peakHold ?? false;
    },
    get grid() {
      return props.grid ?? true;
    },
    get frame() {
      return frame;
    },
    get version() {
      return version;
    },
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "source",
    "variant",
    "minDb",
    "maxDb",
    "minHz",
    "maxHz",
    "scale",
    "peakHold",
    "grid",
    "children",
  ]);

  return provideContext(SpectrumContext, settings, () => (
    <div
      aria-label="Frequency spectrum"
      class={cn(
        "grid h-40 w-full grid-cols-[auto_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] gap-1 [--spectrum-grid:var(--border)] [--spectrum-peak:var(--foreground)] [--spectrum:var(--primary)]",
        props.class,
        props.className
      )}
      data-slot="spectrum"
      data-variant={settings.variant}
      role="img"
      {...rest}
    >
      {props.children ?? (
        <>
          <SpectrumLevelAxis />
          <SpectrumCanvas />
          <SpectrumFrequencyAxis />
        </>
      )}
    </div>
  ));
};
