import { createContext, useContext } from "solid-js";
import type { Accessor } from "solid-js";

import {
  drawSpectrumGrid,
  Spectrum,
  SpectrumFrequencyAxis,
  SpectrumLevelAxis,
  useSpectrum,
} from "@/components/ui/spectrum";
import type {
  SpectrumFrequencyAxisProps,
  SpectrumLevelAxisProps,
  SpectrumProps,
  SpectrumSize,
} from "@/components/ui/spectrum";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useVisibility } from "@/hooks/use-visibility";
import { clamp } from "@/lib/audio/decibels";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type { CanvasDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

const DEFAULT_ROWS = 24;

const CELL_GAP = 2;

const COLOR_REFRESH_FRAMES = 30;

/** How long a peak cap sticks at the top before it starts to fall. */
const PEAK_HOLD_MS = 400;

/** Fall acceleration, in rows per second squared per row of height. */
const PEAK_GRAVITY_PER_ROW = 12;

/** Caps the step after a long pause, such as a background tab. */
const MAX_STEP_SECONDS = 0.1;

/** A falling peak cap, in rows from the floor. Mutated in place each frame. */
export interface PeakCap {
  /** Where the cap is now, in rows. */
  row: number;
  /** Where it was when it stopped sticking, in rows. */
  startRow: number;
  /** Fall speed, in rows per second. */
  velocity: number;
  /** Until this time it sticks at the top. */
  holdUntilMs: number;
}

export interface PeakCapStep {
  /** The cap's opacity: 1 when it starts to fall, 0 when it reaches the bar. */
  alpha: number;
}

export const createPeakCap = (): PeakCap => ({
  holdUntilMs: 0,
  row: 0,
  startRow: 0,
  velocity: 0,
});

/**
 * Advances one column's peak cap by `dtSeconds`. A rising level pushes the cap
 * up and makes it stick. Once the hold ends the cap accelerates down, and it
 * never falls below the level of the bar under it.
 */
export const stepPeakCap = (
  cap: PeakCap,
  level: number,
  nowMs: number,
  dtSeconds: number,
  rows: number
): PeakCapStep => {
  if (level >= cap.row) {
    cap.row = level;
    cap.startRow = level;
    cap.velocity = 0;
    cap.holdUntilMs = nowMs + PEAK_HOLD_MS;

    return { alpha: 0 };
  }

  if (nowMs >= cap.holdUntilMs) {
    cap.velocity += PEAK_GRAVITY_PER_ROW * rows * dtSeconds;
    cap.row = Math.max(level, cap.row - cap.velocity * dtSeconds);
  }

  const fallen = cap.startRow - cap.row;
  const toBar = cap.startRow - level;

  return {
    alpha: toBar > 0 ? clamp(1 - fallen / toBar, 0, 1) : 0,
  };
};

interface Colors {
  grid: string;
  lit: string;
  unlit: string;
}

const readColors = (canvas: HTMLCanvasElement): Colors => {
  const style = getComputedStyle(canvas);

  return {
    grid: style.getPropertyValue("--lcd-spectrum-grid").trim() || style.color,
    lit: style.getPropertyValue("--lcd-display-lit").trim() || style.color,
    unlit:
      style.getPropertyValue("--lcd-display-ink-unlit").trim() || style.color,
  };
};

/** `bar` lights every segment up to the level; `dot` lights only the top one. */
export type LcdSpectrumMode = "bar" | "dot";

interface LcdSpectrumContextValue {
  mode: Accessor<LcdSpectrumMode>;
  rows: Accessor<number>;
}

/** The surrounding LcdSpectrum's mode and rows, so a composed canvas follows it. */
const LcdSpectrumContext = createContext<LcdSpectrumContextValue | null>(null);

export interface LcdSpectrumCanvasProps extends Omit<CanvasDOMProps, "ref"> {
  /** Lit segments per column. Default: the LcdSpectrum's `rows`. */
  rows?: number;
  className?: string;
  ref?: RefTarget<HTMLCanvasElement>;
}

/**
 * The LCD segments: one column per band, unlit dots behind, and lit segments
 * in the display's ink. A peak cap sticks at the top of each column, then
 * falls, fading out as it accelerates towards the bar. The grid and the caps
 * are painted first, so the bars always cover them.
 */
export const LcdSpectrumCanvas = (props: LcdSpectrumCanvasProps) => {
  const settings = useSpectrum("LcdSpectrumCanvas");
  const lcd = useContext(LcdSpectrumContext);
  const rows = () => props.rows ?? lcd?.rows() ?? DEFAULT_ROWS;
  const reducedMotion = useReducedMotion();
  let canvas: HTMLCanvasElement | undefined;
  const visible = useVisibility(() => canvas ?? null);

  createCompatEffect(
    () => ({
      grid: settings.grid,
      // The grid reads the ranges while painting, so a change restarts it.
      ranges: [
        settings.minDb,
        settings.maxDb,
        settings.minHz,
        settings.maxHz,
        settings.frequencyTaper,
      ],
      mode: lcd?.mode() ?? "bar",
      peakHold: settings.peakHold,
      reduced: reducedMotion(),
      rows: rows(),
    }),
    ({ grid, mode, peakHold, reduced, rows }) => {
      const element = canvas;
      const context = element?.getContext("2d");

      if (!(element && context)) return;
      const size: SpectrumSize = { height: 0, ratio: 1, width: 0 };
      let colors = readColors(element);
      let framesSinceColor = 0;
      let caps: PeakCap[] = [];
      let alphas = new Float64Array(0);
      let paintedVersion = -1;
      let capsVisible = false;
      let capsPainted = false;
      let lastNowMs: number | null = null;

      const resize = () => {
        const rect = element.getBoundingClientRect();
        size.ratio = window.devicePixelRatio || 1;
        size.width = rect.width;
        size.height = rect.height;
        element.width = Math.max(1, Math.round(rect.width * size.ratio));
        element.height = Math.max(1, Math.round(rect.height * size.ratio));
        paintedVersion = -1;
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const refreshColors = () => {
        framesSinceColor += 1;

        if (framesSinceColor < COLOR_REFRESH_FRAMES) return;
        framesSinceColor = 0;
        const next = readColors(element);

        if (
          next.grid !== colors.grid ||
          next.lit !== colors.lit ||
          next.unlit !== colors.unlit
        ) {
          colors = next;
          paintedVersion = -1;
        }
      };

      const stepCaps = (
        bands: Float32Array,
        nowMs: number,
        dtSeconds: number
      ) => {
        if (caps.length !== bands.length) {
          caps = Array.from({ length: bands.length }, createPeakCap);
          alphas = new Float64Array(bands.length);
        }

        capsVisible = false;

        for (const [index, band] of bands.entries()) {
          const cap = caps[index];

          if (!cap) continue;
          const level = clamp(band, 0, 1) * rows;
          const { alpha } = stepPeakCap(cap, level, nowMs, dtSeconds, rows);
          alphas[index] = alpha;

          if (alpha > 0) capsVisible = true;
        }
      };

      const paint = (bands: Float32Array | undefined) => {
        context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);

        if (!bands || bands.length === 0) {
          if (grid) drawSpectrumGrid(context, size, settings, colors.grid);

          return;
        }

        const slot = size.width / bands.length;
        const rowHeight = size.height / rows;
        const cellWidth = Math.max(1, slot - CELL_GAP);
        const cellHeight = Math.max(1, rowHeight - CELL_GAP);
        const cellX = (column: number) => column * slot + CELL_GAP / 2;

        const cellY = (row: number) =>
          size.height - (row + 1) * rowHeight + CELL_GAP / 2;

        context.fillStyle = colors.unlit;

        for (let column = 0; column < bands.length; column += 1) {
          for (let row = 0; row < rows; row += 1) {
            context.fillRect(cellX(column), cellY(row), cellWidth, cellHeight);
          }
        }

        if (grid) drawSpectrumGrid(context, size, settings, colors.grid);
        context.fillStyle = colors.lit;

        if (peakHold && !reduced) {
          for (const [column, cap] of caps.entries()) {
            const cellRow = Math.floor(cap.row);
            const alpha = alphas[column] ?? 0;

            if (cellRow < 0 || cellRow >= rows || alpha === 0) continue;
            context.globalAlpha = alpha;
            context.fillRect(
              cellX(column),
              cellY(cellRow),
              cellWidth,
              cellHeight
            );
          }

          context.globalAlpha = 1;
        }

        for (const [column, band] of bands.entries()) {
          const litRows = Math.floor(clamp(band, 0, 1) * rows);
          // Dot mode lights only the top segment, like the LCD VU Meter's.
          const firstRow = mode === "dot" ? Math.max(0, litRows - 1) : 0;

          for (let row = firstRow; row < litRows; row += 1) {
            context.fillRect(cellX(column), cellY(row), cellWidth, cellHeight);
          }
        }
      };

      const unsubscribe = subscribeFrame((nowMs) => {
        refreshColors();
        const bands = settings.frame?.bands;

        const dtSeconds =
          lastNowMs === null
            ? 0
            : Math.min((nowMs - lastNowMs) / 1000, MAX_STEP_SECONDS);

        lastNowMs = nowMs;

        if (peakHold && !reduced && bands) stepCaps(bands, nowMs, dtSeconds);

        const hasNewFrame = settings.version !== paintedVersion;

        if (
          size.width === 0 ||
          !visible.current ||
          !(hasNewFrame || capsVisible || capsPainted)
        )
          return;

        paintedVersion = settings.version;
        // The last cap is fading out: one more paint clears it.
        capsPainted = capsVisible;
        paint(bands);
      });

      return () => {
        unsubscribe();
        observer.disconnect();
      };
    }
  );

  return (
    <canvas
      aria-hidden="true"
      {...omitProps(props, ["class", "className", "ref", "rows"])}
      class={cn(
        "[grid-column:2] [grid-row:1] size-full min-h-0",
        props.class,
        props.className
      )}
      data-slot="lcd-spectrum-canvas"
      ref={(node: HTMLCanvasElement) => {
        canvas = node;
        setRefValue(props.ref, node);
      }}
    />
  );
};

/** The dB labels down the left, in the display's dim ink. */
export const LcdSpectrumLevelAxis = (props: SpectrumLevelAxisProps) => (
  <SpectrumLevelAxis
    {...props}
    class={cn(
      "w-[2.5em] text-[0.625em] text-(color:--lcd-display-ink-dim)",
      props.class,
      props.className
    )}
  />
);

/** The frequency labels along the bottom, in the display's dim ink. */
export const LcdSpectrumFrequencyAxis = (props: SpectrumFrequencyAxisProps) => (
  <SpectrumFrequencyAxis
    {...props}
    class={cn(
      "h-[1.5em] text-[0.625em] text-(color:--lcd-display-ink-dim)",
      props.class,
      props.className
    )}
  />
);

export interface LcdSpectrumProps extends Omit<SpectrumProps, "variant"> {
  /** Lit segments per column. Default 24. */
  rows?: number;
  /** `bar` lights every segment up to the level, `dot` only the top one. Default `bar`. */
  mode?: LcdSpectrumMode;
}

/**
 * A Spectrum drawn as LCD segments, with the same ranges, axes, grid and
 * defaults as the Spectrum. `peakHold` adds sticky peak caps, as it adds peak
 * markers to the Spectrum. Put it in an `LcdDisplay` with `matrix={false}`.
 */
export const LcdSpectrum = (props: LcdSpectrumProps) => {
  const mode = () => props.mode ?? "bar";
  const rows = () => props.rows ?? DEFAULT_ROWS;

  return provideContext(LcdSpectrumContext, { mode, rows }, () => (
    <Spectrum
      {...omitProps(props, ["children", "class", "className", "mode", "rows"])}
      class={cn(
        "pt-[0.75em] [--lcd-spectrum-grid:color-mix(in_oklab,var(--lcd-display-lit)_20%,transparent)]",
        props.class,
        props.className
      )}
      data-lcd-mode={mode()}
      data-slot="lcd-spectrum"
    >
      {props.children ?? (
        <>
          <LcdSpectrumLevelAxis />
          <LcdSpectrumCanvas />
          <LcdSpectrumFrequencyAxis />
        </>
      )}
    </Spectrum>
  ));
};
