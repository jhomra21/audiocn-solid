import type { Locator, Page } from "@playwright/test";

export interface RecordedBar {
  x: number;
  height: number;
  alpha: number;
  coversCenter: boolean;
}

export interface CanvasRecord {
  bars: RecordedBar[];
  points: { x: number; y: number }[];
  strokes: number;
  clears: number;
}

declare global {
  interface Window {
    /** What a canvas has been asked to draw since its last clear. */
    canvasRecord: (canvas: HTMLCanvasElement) => CanvasRecord;
    /** Frame, timer and interval handles that are scheduled and not yet run. */
    pendingTimers: () => number;
    /** Calls made to `getComputedStyle` so far. */
    styleReads: () => number;
  }
}

/**
 * Deterministic frames for painter tests. The clock is installed first so the
 * recorders wrap its fake timers. It is paused before the page loads, so the
 * page starts at about 1 ms and time only moves when a test calls `advance`.
 */
export const installFrameHarness = async (page: Page) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1);
  await page.addInitScript(() => {
    const pending = new Set<string>();

    // The dev server keeps its own socket alive with an interval; that is
    // tooling, not work a component asked for.
    const track = (kind: string, id: number) => {
      if (!new Error().stack?.includes("/@vite/client")) {
        pending.add(`${kind}:${id}`);
      }
    };

    const { cancelAnimationFrame, clearInterval, clearTimeout } = window;
    const { requestAnimationFrame, setInterval, setTimeout } = window;

    const clearTracked = (clear: typeof clearTimeout) =>
      function clearTrackedTimer(id: Parameters<typeof clearTimeout>[0]) {
        pending.delete(`timer:${Number(id)}`);
        clear.call(window, id);
      };

    Object.assign(window, {
      cancelAnimationFrame(id: number) {
        pending.delete(`frame:${id}`);
        cancelAnimationFrame.call(window, id);
      },
      clearInterval: clearTracked(clearInterval),
      clearTimeout: clearTracked(clearTimeout),
      requestAnimationFrame(callback: FrameRequestCallback) {
        const id = requestAnimationFrame.call(window, (time) => {
          pending.delete(`frame:${id}`);
          callback(time);
        });

        track("frame", id);

        return id;
      },
      setInterval(handler: () => void, delay?: number) {
        const id = Number(setInterval.call(window, handler, delay));
        track("timer", id);

        return id;
      },
      setTimeout(handler: () => void, delay?: number) {
        const id = Number(
          setTimeout.call(
            window,
            () => {
              pending.delete(`timer:${id}`);
              handler();
            },
            delay
          )
        );

        track("timer", id);

        return id;
      },
    });

    window.pendingTimers = () => pending.size;

    let reads = 0;
    const readStyle = window.getComputedStyle;

    window.getComputedStyle = (element, pseudo) => {
      reads += 1;

      return readStyle.call(window, element, pseudo);
    };

    window.styleReads = () => reads;

    const records = new WeakMap<HTMLCanvasElement, CanvasRecord>();
    const prototype = CanvasRenderingContext2D.prototype;

    const recordOf = (canvas: HTMLCanvasElement) => {
      let record = records.get(canvas);

      if (!record) {
        record = { bars: [], clears: 0, points: [], strokes: 0 };
        records.set(canvas, record);
      }

      return record;
    };

    // A bar covers the canvas middle only while every clip in force still
    // includes it, so mirrored history can be checked without reading pixels.
    const clips = new WeakMap<
      CanvasRenderingContext2D,
      { inPath: boolean; stack: boolean[]; visible: boolean }
    >();

    const clipOf = (context: CanvasRenderingContext2D) => {
      let clip = clips.get(context);

      if (!clip) {
        clip = { inPath: false, stack: [], visible: true };
        clips.set(context, clip);
      }

      return clip;
    };

    const middleOf = (context: CanvasRenderingContext2D) =>
      context.canvas.getBoundingClientRect().width / 2;

    const original = {
      beginPath: prototype.beginPath,
      clearRect: prototype.clearRect,
      clip: prototype.clip,
      lineTo: prototype.lineTo,
      moveTo: prototype.moveTo,
      rect: prototype.rect,
      restore: prototype.restore,
      roundRect: prototype.roundRect,
      save: prototype.save,
      stroke: prototype.stroke,
    };

    // The overloads that take no path, for the calls that do not pass one.
    const clipCurrent: (rule?: CanvasFillRule) => void = prototype.clip;
    const strokeCurrent: () => void = prototype.stroke;

    prototype.beginPath = function beginPath() {
      clipOf(this).inPath = false;
      original.beginPath.call(this);
    };

    prototype.clearRect = function clearRect(x, y, width, height) {
      const record = recordOf(this.canvas);
      record.bars.length = 0;
      record.points.length = 0;
      record.clears += 1;
      original.clearRect.call(this, x, y, width, height);
    };

    prototype.clip = function clip(
      first?: CanvasFillRule | Path2D,
      rule?: CanvasFillRule
    ) {
      const state = clipOf(this);
      state.visible &&= state.inPath;

      if (first instanceof Path2D) original.clip.call(this, first, rule);
      else clipCurrent.call(this, first);
    };

    prototype.rect = function rect(x, y, width, height) {
      const middle = middleOf(this);
      clipOf(this).inPath ||= x <= middle && middle < x + width;
      original.rect.call(this, x, y, width, height);
    };

    prototype.save = function save() {
      const state = clipOf(this);
      state.stack.push(state.visible);
      original.save.call(this);
    };

    prototype.restore = function restore() {
      const state = clipOf(this);
      state.visible = state.stack.pop() ?? true;
      original.restore.call(this);
    };

    prototype.moveTo = function moveTo(x, y) {
      recordOf(this.canvas).points.push({ x, y });
      original.moveTo.call(this, x, y);
    };

    prototype.lineTo = function lineTo(x, y) {
      recordOf(this.canvas).points.push({ x, y });
      original.lineTo.call(this, x, y);
    };

    prototype.stroke = function stroke(path?: Path2D) {
      recordOf(this.canvas).strokes += 1;

      if (path) original.stroke.call(this, path);
      else strokeCurrent.call(this);
    };

    prototype.roundRect = function roundRect(x, y, width, height, radii) {
      const middle = middleOf(this);

      recordOf(this.canvas).bars.push({
        alpha: this.globalAlpha,
        coversCenter: clipOf(this).visible && x <= middle && middle < x + width,
        height,
        x,
      });
      original.roundRect.call(this, x, y, width, height, radii);
    };

    window.canvasRecord = (canvas) => {
      const { bars, clears, points, strokes } = recordOf(canvas);

      return {
        bars: bars.map((bar) => ({ ...bar })),
        clears,
        points: points.map((point) => ({ ...point })),
        strokes,
      };
    };
  });
};

/** Runs frames and timers for `ms` of page time. */
export const advance = (page: Page, ms: number) => page.clock.runFor(ms);

export const pendingTimers = (page: Page) =>
  page.evaluate(() => window.pendingTimers());

export const recordOf = (canvas: Locator) =>
  canvas.evaluate((node: HTMLCanvasElement) => window.canvasRecord(node));
