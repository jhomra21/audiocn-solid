import { expect, test } from "@playwright/test";
import type { ElementHandle, Locator, Page } from "@playwright/test";

import type { FrameSpec, PainterProps } from "../app/painters";
import {
  advance,
  installFrameHarness,
  pendingTimers,
  recordOf,
} from "./frame-harness";
import type { CanvasRecord } from "./frame-harness";

const FRAME_MS = 16;

const SLEEPY_MS = 160;

/** Opens a case with its frames and timers under the test's control. */
const openPainters = async (page: Page, query: string) => {
  await installFrameHarness(page);
  await page.goto(`/painters?${query}`);
};

/** A rebuilt painter repaints once its ResizeObserver reports, in real time. */
const resizeObserversSettled = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const observer = new ResizeObserver(() => {
          observer.disconnect();
          resolve();
        });

        observer.observe(document.body);
      })
  );

const frame = (page: Page, spec?: FrameSpec) =>
  page.evaluate((next) => window.painters.frame(next), spec);

const patch = (page: Page, spec: FrameSpec) =>
  page.evaluate((next) => window.painters.patch(next), spec);

const paint = (page: Page) => page.evaluate(() => window.painters.paint());

const clear = (page: Page) => page.evaluate(() => window.painters.clear());

const emit = (page: Page, source: "first" | "second") =>
  page.evaluate((name) => window.painters.emit(name), source);

const setProps = (page: Page, props: PainterProps) =>
  page.evaluate((next) => window.painters.setProps(next), props);

const canvas = (page: Page, slot: string) =>
  page.locator(`canvas[data-slot="${slot}"]`);

const liveCanvas = (page: Page) => canvas(page, "live-waveform-canvas");

const filled = (level: number, length = 8) =>
  Array.from({ length }, () => level);

/** The x of the first bar with this height, once drawn. */
const barX = async (page: Page, height: number) => {
  const { bars } = await recordOf(liveCanvas(page));

  return bars.find((bar) => bar.height === height)?.x ?? Number.NaN;
};

const barXs = async (page: Page, height: number) =>
  (await recordOf(liveCanvas(page))).bars
    .filter((bar) => bar.height === height)
    .map((bar) => bar.x)
    .sort((a, b) => a - b);

const recordsOf = (target: Locator) =>
  target.evaluateAll((nodes: HTMLCanvasElement[]) =>
    nodes.map((node) => window.canvasRecord(node))
  );

const pointsOf = async (target: Locator) =>
  (await recordsOf(target)).flatMap((record) => record.points);

/** Canvases are read through handles so they can be checked after unmount. */
const canvasHandles = (page: Page) => page.locator("canvas").elementHandles();

const strokesOf = async (handles: ElementHandle<Node>[]) => {
  const counts = await Promise.all(
    handles.map((handle) =>
      handle.evaluate(
        (node: HTMLCanvasElement) => window.canvasRecord(node).strokes
      )
    )
  );

  return counts.reduce((total, count) => total + count, 0);
};

const roleImage = (page: Page, name: string) => page.getByRole("img", { name });

const hiddenCanvases = (root: Locator) =>
  root
    .locator("canvas")
    .evaluateAll((nodes) => nodes.map((node) => node.ariaHidden));

const unmount = (page: Page) => page.evaluate(() => window.painters.unmount());

/** Distinct x positions drawn, rounded to a tenth of a pixel. */
const distinctX = (points: CanvasRecord["points"]) =>
  new Set(points.map(({ x }) => Math.round(x * 10))).size;

export const runPaintersSuite = () => {
  test.describe("painter contracts", () => {
    const errors: string[] = [];

    test.beforeEach(({ page }) => {
      errors.length = 0;
      page.on("pageerror", (error) => errors.push(error.message));
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test.describe("live waveform scrolling", () => {
      const scrolling = "case=live&width=24&height=80";

      test("moves bars between source frames at one pitch per history interval", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await paint(page);
        await advance(page, 64);

        const firstX = await barX(page, 40);
        await advance(page, FRAME_MS);
        expect(firstX - (await barX(page, 40))).toBeCloseTo((4 * 16) / 50);
      });

      test("does not jump when the next sample arrives late on the same mutable frame", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await paint(page);
        await advance(page, 48);
        await patch(page, {
          history: [0.25, 0.5, 0.75, 1, 0.125],
          length: 5,
          updatedAt: 50,
        });
        await paint(page);
        await advance(page, 48);

        const firstX = await barX(page, 40);
        await advance(page, FRAME_MS);
        expect(firstX - (await barX(page, 40))).toBeCloseTo((4 * 16) / 50);
      });

      test("keeps the extra bar at the left edge when the visible window is full", async ({
        page,
      }) => {
        await openPainters(page, "case=live&width=12&height=80");
        await paint(page);
        await advance(page, 64);

        const { bars } = await recordOf(liveCanvas(page));
        expect(bars).toHaveLength(4);
        expect(bars[0]?.x).toBeCloseTo(0.5 - (4 * 14) / 50);
      });

      test("keeps the outgoing bar visible after the source ring wraps", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await frame(page, { history: [0.25, 0.5, 0.75, 1] });
        await paint(page);
        await advance(page, 48);
        await patch(page, {
          history: [0.125],
          previousLevel: 0.25,
          start: 1,
          updatedAt: 50,
        });
        await paint(page);
        await advance(page, 48);

        const firstX = await barX(page, 20);
        await advance(page, FRAME_MS);
        expect(firstX - (await barX(page, 20))).toBeCloseTo((4 * 16) / 50);
      });

      test("moves a scrolling line between source frames", async ({ page }) => {
        await openPainters(page, scrolling);
        await setProps(page, { variant: "line" });
        await paint(page);
        await advance(page, 64);

        const firstX = (await recordOf(liveCanvas(page))).points[0]?.x ?? NaN;
        await advance(page, FRAME_MS);

        const nextX = (await recordOf(liveCanvas(page))).points[0]?.x ?? NaN;
        expect(firstX - nextX).toBeCloseTo(((24 / 5) * 16) / 50);
      });

      for (const width of [20, 24]) {
        test(`moves mirrored history out from the center at width ${width}`, async ({
          page,
        }) => {
          await openPainters(page, `case=live&width=${width}&height=80`);
          await setProps(page, { variant: "mirror" });
          await paint(page);
          await advance(page, 64);

          const first = await barXs(page, 60);
          await advance(page, FRAME_MS);

          const next = await barXs(page, 60);
          expect(first).toHaveLength(2);
          expect((first[0] ?? NaN) - (next[0] ?? NaN)).toBeCloseTo(
            (4 * 16) / 50
          );
          expect((next[1] ?? NaN) - (first[1] ?? NaN)).toBeCloseTo(
            (4 * 16) / 50
          );
          expect((next[0] ?? NaN) + (next[1] ?? NaN) + 3).toBeCloseTo(width);
        });
      }

      test("keeps mirrored center opacity steady across sample boundaries", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await setProps(page, { variant: "mirror" });
        await frame(page, { history: filled(0.25), updatedAt: 16 });
        await paint(page);

        for (let index = 0; index < 8; index += 1) {
          await advance(page, FRAME_MS);

          const { bars } = await recordOf(liveCanvas(page));

          const opacity = bars
            .filter((bar) => bar.coversCenter)
            .reduce((alpha, bar) => alpha + (1 - alpha) * bar.alpha, 0);

          expect(opacity).toBeCloseTo(0.55);

          if (index === 3) {
            await patch(page, { length: 5, updatedAt: 66 });
            await paint(page);
          }
        }
      });

      test("stops moving after one interval without new history, and clears", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await paint(page);
        await advance(page, SLEEPY_MS);

        const { clears } = await recordOf(liveCanvas(page));
        await advance(page, SLEEPY_MS);
        expect((await recordOf(liveCanvas(page))).clears).toBe(clears);
        expect(await pendingTimers(page)).toBe(0);

        await clear(page);
        await advance(page, FRAME_MS);
        expect((await recordOf(liveCanvas(page))).bars).toHaveLength(0);
      });

      test("clears a sleeping waveform when its source is disconnected", async ({
        page,
      }) => {
        await openPainters(page, `${scrolling}&source=first`);
        await emit(page, "first");
        await advance(page, SLEEPY_MS);
        expect((await recordOf(liveCanvas(page))).bars.length).toBeGreaterThan(
          0
        );
        expect(await pendingTimers(page)).toBe(0);

        await setProps(page, { source: "none" });
        await advance(page, FRAME_MS);
        expect((await recordOf(liveCanvas(page))).bars).toHaveLength(0);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("keeps scrolling continuous when drawing options change", async ({
        page,
      }) => {
        await openPainters(
          page,
          "case=live&width=240&height=80&demo=tone&source=demo"
        );
        await advance(page, 272);

        const x = (await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN;
        await setProps(page, { sensitivity: 2 });
        await advance(page, FRAME_MS);
        expect(
          x - ((await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN)
        ).toBeCloseTo(1);
      });

      for (const delayMs of [0, 16]) {
        test(`replaces same-timestamp history after a ${delayMs} ms source delay`, async ({
          page,
        }) => {
          await openPainters(page, `${scrolling}&source=first`);
          await frame(page, { history: filled(0.25) });
          await emit(page, "first");
          await advance(page, 256);
          expect((await recordOf(liveCanvas(page))).bars[0]?.height).toBe(20);

          await setProps(page, { source: "second" });
          await advance(page, delayMs);
          await frame(page, { history: filled(0.75) });
          await emit(page, "second");
          await advance(page, FRAME_MS);
          expect((await recordOf(liveCanvas(page))).bars[0]?.height).toBe(60);
        });
      }

      test("clears buffered history before painting within the same frame", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await frame(page, { history: filled(0.25) });
        await paint(page);
        await advance(page, 256);
        expect((await recordOf(liveCanvas(page))).bars[0]?.height).toBe(20);

        await clear(page);
        await patch(page, { history: filled(0.75) });
        await paint(page);
        await advance(page, FRAME_MS);
        expect((await recordOf(liveCanvas(page))).bars[0]?.height).toBe(60);
      });

      test("keeps untimed custom sources and static mode still between frames", async ({
        page,
      }) => {
        await openPainters(page, scrolling);
        await frame(page, { intervalMs: null, updatedAt: null });
        await paint(page);
        await advance(page, FRAME_MS);

        let { clears } = await recordOf(liveCanvas(page));
        await advance(page, 32);
        expect((await recordOf(liveCanvas(page))).clears).toBe(clears);

        await setProps(page, { mode: "static" });
        await frame(page);
        await paint(page);
        await resizeObserversSettled(page);
        await advance(page, FRAME_MS);
        ({ clears } = await recordOf(liveCanvas(page)));
        await advance(page, 32);
        expect((await recordOf(liveCanvas(page))).clears).toBe(clears);
      });

      test("keeps the reduced-motion paint limit", async ({ page }) => {
        await page.emulateMedia({ reducedMotion: "reduce" });
        await openPainters(page, "case=live&width=24&height=80&source=demo");
        await advance(page, 1024);
        expect((await recordOf(liveCanvas(page))).clears).toBe(4);
      });

      test("moves steadily when a source connects after the painter", async ({
        page,
      }) => {
        await openPainters(
          page,
          "case=live&width=240&height=80&demo=tone&source=relay"
        );
        await advance(page, FRAME_MS);
        await page.evaluate(() => window.painters.connectRelay());
        await advance(page, SLEEPY_MS);

        let previousX = (await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN;

        for (let index = 0; index < 8; index += 1) {
          await advance(page, FRAME_MS);

          const x = (await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN;
          expect(previousX - x).toBeCloseTo((4 * 16) / 64);
          previousX = x;
        }
      });

      test("moves on each paint with the default demo source and stops on unmount", async ({
        page,
      }) => {
        await openPainters(
          page,
          "case=live&width=240&height=80&demo=tone&source=demo"
        );
        await advance(page, 192);

        const firstX = (await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN;
        await advance(page, FRAME_MS);
        expect(
          firstX - ((await recordOf(liveCanvas(page))).bars[0]?.x ?? NaN)
        ).toBeCloseTo((4 * 16) / 64);

        const handle = await liveCanvas(page).elementHandle();

        const clearsOf = () =>
          handle?.evaluate(
            (node: HTMLCanvasElement) => window.canvasRecord(node).clears
          );

        const clears = await clearsOf();
        await page.evaluate(() => window.painters.unmount());
        await advance(page, 64);
        expect(await clearsOf()).toBe(clears);
      });
    });

    test.describe("settled live waveform", () => {
      test("draws, sleeps, and redraws on the next frame", async ({ page }) => {
        await openPainters(page, "case=live&width=200&height=40&source=first");
        await advance(page, 100);

        const { clears: drawn } = await recordOf(liveCanvas(page));
        expect(drawn).toBeGreaterThan(0);
        expect(await pendingTimers(page)).toBe(0);

        await frame(page, {
          bands: [0.5, 0.5, 0.5],
          history: [0.5, 0.5, 0.5],
          intervalMs: null,
          length: 3,
          updatedAt: null,
        });
        await emit(page, "first");
        await advance(page, 50);
        expect((await recordOf(liveCanvas(page))).clears).toBe(drawn + 1);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("a theme change makes a sleeping waveform re-read its colour", async ({
        page,
      }) => {
        await openPainters(page, "case=live&width=200&height=40&source=first");
        await advance(page, 100);

        const before = await page.evaluate(() => window.styleReads());
        await page.evaluate(async () => {
          document.documentElement.classList.add("dark");
          await Promise.resolve();
        });
        await advance(page, 50);
        expect(await page.evaluate(() => window.styleReads())).toBeGreaterThan(
          before
        );
        expect(await pendingTimers(page)).toBe(0);
      });
    });

    test("spectrum repaints every canvas on a new frame", async ({ page }) => {
      await openPainters(page, "case=spectrum");
      await advance(page, 100);

      const canvases = page.locator("canvas");
      expect(await canvases.count()).toBe(2);

      const before = (await recordsOf(canvases)).map((record) => record.clears);
      await frame(page, { bands: [0.5, 0.8, 0.3] });
      await emit(page, "first");
      await advance(page, 50);

      const after = (await recordsOf(canvases)).map((record) => record.clears);

      for (const [index, clears] of after.entries()) {
        expect(clears).toBeGreaterThan(before[index] ?? 0);
      }
    });

    test.describe("electric layout and scene", () => {
      const layoutOptions = {
        barCount: 4,
        barGap: 4,
        barWidth: 6,
        orientation: "horizontal",
      } as const;

      test("layout centres the row of bars, narrows when short and swaps axes when vertical", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const layouts = await page.evaluate((options) => {
          const { layoutElectricBars } = window.painters.electric;

          return {
            centred: layoutElectricBars(200, 80, { ...options, align: "end" }),
            short: layoutElectricBars(52, 80, {
              ...options,
              align: "center",
              barCount: 8,
            }),
            vertical: layoutElectricBars(80, 200, {
              ...options,
              align: "start",
              orientation: "vertical",
            }),
          };
        }, layoutOptions);

        expect(layouts.centred).toMatchObject({
          base: 74,
          first: 85,
          pitch: 10,
          span: 68,
        });
        expect(layouts.short).toMatchObject({
          barGap: 2,
          barWidth: 3,
          base: 40,
          pitch: 5,
        });
        expect(layouts.vertical).toMatchObject({
          base: 6,
          first: 85,
          horizontal: false,
        });
      });

      test("a scene crackles the same way for the same seed", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const jitter = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const crackle = (seed: number) => {
            const scene = createElectricScene({
              arcs: true,
              barCount: 4,
              intensity: 1,
              loading: false,
              reducedMotion: false,
              seed,
              sparks: true,
            });

            runScene(scene, () => [0.5, 0.5, 0.5, 0.5], 10);

            return [...scene.jitter];
          };

          return { first: crackle(7), other: crackle(8), second: crackle(7) };
        });

        expect(jitter.first).toEqual(jitter.second);
        expect(jitter.first).not.toEqual(jitter.other);
      });

      test("a scene pins the base of each filament and frees its tip", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const filament = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 4,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          runScene(scene, () => [0.5, 0.5, 0.5, 0.5], 1);

          const points = scene.jitter.length / 4;

          return { base: scene.jitter[0], tip: scene.jitter[points - 1] };
        });

        expect(filament.base).toBe(0);
        expect(filament.tip).not.toBe(0);
      });

      test("a scene keeps the flicker within 12%", async ({ page }) => {
        await openPainters(page, "case=none");

        const flicker = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 4,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          runScene(scene, () => [1, 1, 1, 1], 60);

          return [...scene.flicker];
        });

        expect(flicker).toHaveLength(4);

        for (const brightness of flicker) {
          expect(brightness).toBeGreaterThanOrEqual(0.88);
          expect(brightness).toBeLessThanOrEqual(1);
        }
      });

      test("a scene jumps arcs only between loud bars, one or two apart", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const seen = await page.evaluate(() => {
          const { createElectricScene, frameMs, layoutElectricBars } =
            window.painters.electric;

          const layout = layoutElectricBars(200, 80, {
            align: "end",
            barCount: 4,
            barGap: 4,
            barWidth: 6,
            orientation: "horizontal",
          });

          const levels = Float32Array.of(1, 0, 1, 0.9, 0, 0);

          const scene = createElectricScene({
            arcs: true,
            barCount: 6,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          const joined = new Set<string>();

          for (let frame = 1; frame <= 600; frame += 1) {
            scene.step(frame * frameMs, levels, layout);

            for (const arc of scene.arcs) {
              if (arc.lifeMs > 0) {
                joined.add(`${arc.index}-${arc.index + arc.reach}`);
              }
            }
          }

          return [...joined].sort();
        });

        expect(seen).toEqual(["0-2", "2-3"]);
      });

      test("a loading scene runs one arc along the sweep", async ({ page }) => {
        await openPainters(page, "case=none");

        const alive = await page.evaluate(() => {
          const { createElectricScene, frameMs, layoutElectricBars } =
            window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 8,
            intensity: 1,
            loading: true,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          scene.step(
            frameMs,
            Float32Array.of(0, 0, 0, 0.1, 0.5, 0.3, 0, 0),
            layoutElectricBars(200, 80, {
              align: "end",
              barCount: 4,
              barGap: 4,
              barWidth: 6,
              orientation: "horizontal",
            })
          );

          return scene.arcs
            .filter((arc) => arc.lifeMs > 0)
            .map((arc) => arc.index);
        });

        expect(alive).toEqual([4]);
      });

      test("a scene throws sparks on a sudden rise, and they fall and fade", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const sparks = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 4,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          const alive = () =>
            scene.sparks.life.filter((life) => life > 0).length;

          runScene(
            scene,
            (frame) => (frame < 3 ? [0, 0, 0, 0] : [1, 0, 0, 0]),
            3
          );

          const thrown = alive();
          const firstVelocity = scene.sparks.vy[0] ?? 0;
          runScene(scene, () => [1, 0, 0, 0], 2);

          const laterVelocity = scene.sparks.vy[0] ?? 0;
          runScene(scene, () => [1, 0, 0, 0], 60);

          return { faded: alive(), firstVelocity, laterVelocity, thrown };
        });

        expect(sparks.thrown).toBeGreaterThan(0);
        expect(sparks.laterVelocity).toBeGreaterThan(sparks.firstVelocity);
        expect(sparks.faded).toBe(0);
      });

      test("a scene never holds more than 64 sparks", async ({ page }) => {
        await openPainters(page, "case=none");

        const pool = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 32,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: true,
          });

          runScene(
            scene,
            (frame) =>
              Array.from({ length: 32 }, () => (frame % 2 === 0 ? 1 : 0)),
            40
          );

          return {
            alive: scene.sparks.life.filter((life) => life > 0).length,
            size: scene.sparks.life.length,
          };
        });

        expect(pool.size).toBe(64);
        expect(pool.alive).toBeLessThanOrEqual(64);
      });

      test("a scene stays straight and still with reduced motion", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const still = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: true,
            barCount: 4,
            intensity: 1,
            loading: false,
            reducedMotion: true,
            seed: 7,
            sparks: true,
          });

          runScene(
            scene,
            (frame) => (frame % 2 === 0 ? [1, 1, 1, 1] : [0, 0, 0, 0]),
            60
          );

          return {
            arcs: scene.arcs.every((arc) => arc.lifeMs === 0),
            jitter: scene.jitter.every((offset) => offset === 0),
            sparks: scene.sparks.life.every((life) => life === 0),
          };
        });

        expect(still).toEqual({ arcs: true, jitter: true, sparks: true });
      });

      test("a scene draws no arcs or sparks when they are turned off", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const quiet = await page.evaluate(() => {
          const { createElectricScene, runScene } = window.painters.electric;

          const scene = createElectricScene({
            arcs: false,
            barCount: 4,
            intensity: 1,
            loading: false,
            reducedMotion: false,
            seed: 7,
            sparks: false,
          });

          runScene(
            scene,
            (frame) => (frame % 4 === 0 ? [0, 0, 0, 0] : [1, 1, 1, 1]),
            120
          );

          return {
            arcs: scene.arcs.every((arc) => arc.lifeMs === 0),
            sparks: scene.sparks.life.every((life) => life === 0),
          };
        });

        expect(quiet).toEqual({ arcs: true, sparks: true });
      });
    });

    test.describe("electric trace", () => {
      test("a trace crackles the same way for the same seed", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const crackle = await page.evaluate(() => {
          const { createElectricTrace, runTrace } = window.painters.electric;

          const trace = (seed: number) => {
            const next = createElectricTrace({
              arcs: true,
              intensity: 1,
              loading: false,
              mode: "wave",
              reducedMotion: false,
              seed,
              sensitivity: 1,
              sparks: true,
            });

            runTrace(
              next,
              () => ({
                bands: Float32Array.of(0.8, 0.6, 0.4, 0.2),
                history: new Float32Array(1),
                historyLength: 0,
                historyStart: 0,
                peakDb: -12,
              }),
              10
            );

            return [...next.crackle];
          };

          return { first: trace(5), other: trace(6), second: trace(5) };
        });

        expect(crackle.first).toEqual(crackle.second);
        expect(crackle.first).not.toEqual(crackle.other);
      });

      test("a trace keeps the flicker within 12%", async ({ page }) => {
        await openPainters(page, "case=none");

        const flicker = await page.evaluate(() => {
          const { createElectricTrace, frameMs, traceGeometry } =
            window.painters.electric;

          const trace = createElectricTrace({
            arcs: true,
            intensity: 1,
            loading: false,
            mode: "wave",
            reducedMotion: false,
            seed: 5,
            sensitivity: 1,
            sparks: true,
          });

          const readings: number[] = [];

          for (let frame = 1; frame <= 60; frame += 1) {
            trace.step(
              frame * frameMs,
              {
                bands: Float32Array.of(1, 1, 1, 1),
                history: new Float32Array(1),
                historyLength: 0,
                historyStart: 0,
                peakDb: -12,
              },
              traceGeometry
            );
            readings.push(trace.flicker);
          }

          return readings;
        });

        for (const brightness of flicker) {
          expect(brightness).toBeGreaterThanOrEqual(0.88);
          expect(brightness).toBeLessThanOrEqual(1);
        }
      });

      test("a trace forks only off points far from the middle", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const forks = await page.evaluate(() => {
          const { createElectricTrace, frameMs, traceGeometry } =
            window.painters.electric;

          const trace = createElectricTrace({
            arcs: true,
            intensity: 1,
            loading: false,
            mode: "wave",
            reducedMotion: false,
            seed: 5,
            sensitivity: 1,
            sparks: true,
          });

          const distances: number[] = [];

          for (let frame = 1; frame <= 600; frame += 1) {
            trace.step(
              frame * frameMs,
              {
                bands: Float32Array.of(1, 1, 1, 1),
                history: new Float32Array(1),
                historyLength: 0,
                historyStart: 0,
                peakDb: -12,
              },
              traceGeometry
            );

            for (const branch of trace.branches) {
              if (branch.lifeMs > 0 && branch.bornMs === frame * frameMs) {
                distances.push(Math.abs(trace.heights[branch.point] ?? 0));
              }
            }
          }

          return distances;
        });

        expect(forks.length).toBeGreaterThan(0);

        for (const distance of forks) {
          expect(distance).toBeGreaterThan(0.25);
        }
      });

      test("a trace throws sparks on a sudden rise", async ({ page }) => {
        await openPainters(page, "case=none");

        const thrown = await page.evaluate(() => {
          const { createElectricTrace, runTrace } = window.painters.electric;

          const trace = createElectricTrace({
            arcs: true,
            intensity: 1,
            loading: false,
            mode: "wave",
            reducedMotion: false,
            seed: 5,
            sensitivity: 1,
            sparks: true,
          });

          runTrace(
            trace,
            (frame) =>
              frame < 3
                ? null
                : {
                    bands: Float32Array.of(1, 1, 1, 1),
                    history: new Float32Array(1),
                    historyLength: 0,
                    historyStart: 0,
                    peakDb: -12,
                  },
            3
          );

          return trace.sparks.life.some((life) => life > 0);
        });

        expect(thrown).toBe(true);
      });

      test("a trace stays smooth and still with reduced motion", async ({
        page,
      }) => {
        await openPainters(page, "case=none");

        const still = await page.evaluate(() => {
          const { createElectricTrace, runTrace } = window.painters.electric;

          const trace = createElectricTrace({
            arcs: true,
            intensity: 1,
            loading: false,
            mode: "wave",
            reducedMotion: true,
            seed: 5,
            sensitivity: 1,
            sparks: true,
          });

          runTrace(
            trace,
            (frame) => ({
              bands:
                frame % 2 === 0
                  ? Float32Array.of(1, 1, 1, 1)
                  : Float32Array.of(0),
              history: new Float32Array(1),
              historyLength: 0,
              historyStart: 0,
              peakDb: -12,
            }),
            60
          );

          return {
            branches: trace.branches.every((branch) => branch.lifeMs === 0),
            crackle: trace.crackle.every((offset) => offset === 0),
            sparks: trace.sparks.life.every((life) => life === 0),
          };
        });

        expect(still).toEqual({ branches: true, crackle: true, sparks: true });
      });
    });

    test.describe("electric components", () => {
      test("electric bars render a labelled image over two hidden canvases", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-bars&align=1&loading=1");

        const root = roleImage(page, "Voice");
        await expect(root).toHaveAttribute(
          "data-slot",
          "electric-bar-visualizer"
        );
        await expect(root).toHaveAttribute("data-orientation", "horizontal");
        await expect(root).toHaveAttribute("data-align", "end");
        await expect(root).toHaveAttribute("data-loading", "");
        expect(await hiddenCanvases(root)).toEqual(["true", "true"]);
      });

      test("electric bars paint declarative levels and mark an active signal", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-bars&levels=0,0,0,0");
        await advance(page, 100);

        const root = roleImage(page, "Voice");
        expect(await strokesOf(await canvasHandles(page))).toBeGreaterThan(0);
        await expect(root).not.toHaveAttribute("data-active");

        await page.evaluate(() =>
          window.painters.setLevels([0.8, 0.5, 0.2, 1])
        );
        await advance(page, 100);
        await expect(root).toHaveAttribute("data-active", "");
      });

      test("electric bars bend the filaments more as intensity rises", async ({
        page,
      }) => {
        await openPainters(
          page,
          "case=electric-bars&intensity=0&levels=0.2,0.2,0.2,0.2"
        );
        await advance(page, 100);
        expect(distinctX(await pointsOf(page.locator("canvas")))).toBe(4);

        await openPainters(
          page,
          "case=electric-bars&intensity=1&levels=0.2,0.2,0.2,0.2"
        );
        await advance(page, 100);
        expect(
          distinctX(await pointsOf(page.locator("canvas")))
        ).toBeGreaterThan(4);
      });

      test("electric bars stop painting once unmounted", async ({ page }) => {
        await openPainters(page, "case=electric-bars&levels=0.5");
        await advance(page, 100);

        const handles = await canvasHandles(page);
        await unmount(page);

        const strokes = await strokesOf(handles);
        await advance(page, 200);
        expect(await strokesOf(handles)).toBe(strokes);
      });

      test("electric waveform renders a labelled image over two hidden canvases", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-wave&loading=1&scope=1");

        const root = roleImage(page, "Voice");
        await expect(root).toHaveAttribute("data-slot", "electric-waveform");
        await expect(root).toHaveAttribute("data-mode", "scope");
        await expect(root).toHaveAttribute("data-loading", "");
        expect(await hiddenCanvases(root)).toEqual(["true", "true"]);
      });

      test("electric waveform paints frames from its handle and marks an active signal", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-wave");
        await advance(page, 100);

        const root = roleImage(page, "Voice");
        expect(await strokesOf(await canvasHandles(page))).toBeGreaterThan(0);
        await expect(root).not.toHaveAttribute("data-active");

        await frame(page, { bands: [1, 1, 1, 1] });
        await paint(page);
        await advance(page, 100);
        await expect(root).toHaveAttribute("data-active", "");

        await clear(page);
        await advance(page, 1000);
        await expect(root).not.toHaveAttribute("data-active");
      });

      test("electric waveform keeps its trace when only the stroke changes", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-wave");
        await setProps(page, { lineWidth: 2 });
        await frame(page, { bands: [1, 1, 1, 1] });
        await paint(page);
        await advance(page, 100);

        const root = roleImage(page, "Voice");
        await expect(root).toHaveAttribute("data-active", "");
        await setProps(page, { fadeEdges: false, lineWidth: 4 });
        await expect(root).toHaveAttribute("data-active", "");
      });

      test("electric waveform draws a smooth line with no intensity", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-wave&intensity=0");
        await advance(page, 100);

        const heights = (await pointsOf(page.locator("canvas"))).map(({ y }) =>
          y.toFixed(3)
        );

        expect(new Set(heights).size).toBe(1);
      });

      test("electric waveform stops painting once unmounted", async ({
        page,
      }) => {
        await openPainters(page, "case=electric-wave");
        await advance(page, 100);

        const handles = await canvasHandles(page);
        await unmount(page);

        const strokes = await strokesOf(handles);
        await advance(page, 200);
        expect(await strokesOf(handles)).toBe(strokes);
      });
    });

    test.describe("smooth waveform", () => {
      test("renders a labelled image over one hidden canvas", async ({
        page,
      }) => {
        await openPainters(page, "case=smooth&loading=1&scope=1");

        const root = roleImage(page, "Voice");
        await expect(root).toHaveAttribute("data-slot", "smooth-waveform");
        await expect(root).toHaveAttribute("data-mode", "scope");
        await expect(root).toHaveAttribute("data-loading", "");
        expect(await hiddenCanvases(root)).toEqual(["true"]);
      });

      test("draws a flat line across the width with no signal", async ({
        page,
      }) => {
        await openPainters(page, "case=smooth");
        await advance(page, 100);

        const target = canvas(page, "smooth-waveform-canvas");

        const width = await target.evaluate(
          (node) => node.getBoundingClientRect().width
        );

        const { points } = await recordOf(target);
        const xs = points.map(({ x }) => x);
        expect(Math.min(...xs)).toBe(0);
        expect(Math.max(...xs)).toBe(width);
        expect(new Set(points.map(({ y }) => y)).size).toBe(1);
      });

      test("follows frames from its handle and marks an active signal", async ({
        page,
      }) => {
        await openPainters(page, "case=smooth");
        await advance(page, 100);

        const root = roleImage(page, "Voice");
        await expect(root).not.toHaveAttribute("data-active");

        await frame(page, { bands: [1, 1, 1, 1] });
        await paint(page);
        await advance(page, 300);
        await expect(root).toHaveAttribute("data-active", "");

        const { points } = await recordOf(
          canvas(page, "smooth-waveform-canvas")
        );

        expect(new Set(points.map(({ y }) => y)).size).toBeGreaterThan(1);

        await clear(page);
        await advance(page, 1000);
        await expect(root).not.toHaveAttribute("data-active");
      });

      test("keeps its line when only the stroke changes", async ({ page }) => {
        await openPainters(page, "case=smooth");
        await setProps(page, { lineWidth: 2 });
        await frame(page, { bands: [1, 1, 1, 1] });
        await paint(page);
        await advance(page, 300);

        const root = roleImage(page, "Voice");
        await expect(root).toHaveAttribute("data-active", "");
        await setProps(page, { fadeEdges: false, lineWidth: 4 });
        await expect(root).toHaveAttribute("data-active", "");
      });

      test("stops painting once unmounted", async ({ page }) => {
        await openPainters(page, "case=smooth");
        await advance(page, 100);

        const handles = await canvasHandles(page);
        await unmount(page);

        const strokes = await strokesOf(handles);
        await advance(page, 200);
        expect(await strokesOf(handles)).toBe(strokes);
      });
    });
  });
};
