import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { createServer } from "vite";

import { advance, installFrameHarness, pendingTimers } from "./frame-harness";

// −12 and −40 dBFS on the default linear −60..0 range.
const AT_MINUS_12 = 0.8;

const AT_MINUS_40 = 1 / 3;

// A big drop settles in about 6 s: the peak hold waits 1.2 s, then falls.
const SETTLE_MS = 10_000;

// A readout shows a source frame within its 250 ms default interval.
const READOUT_DEADLINE_MS = 260;

// The clip case declares `holdMs={500}`; the probes sit 10 ms either side.
const CLIP_HOLD_MS = 500;

const CLIP_PROBE_MS = 10;

const open = (page: Page, query: string) => page.goto(`/meters?${query}`);

/** Opens a case with its frames and timers under the test's control. */
const openFrozen = async (page: Page, query: string) => {
  await installFrameHarness(page);
  await open(page, query);
};

const channel = (page: Page, index = 0) =>
  page.locator(`[data-slot="level-meter-channel"][data-index="${index}"]`);

const meterLevel = async (page: Page, index = 0) =>
  Number(
    await channel(page, index).evaluate((node) =>
      node.style.getPropertyValue("--meter-level")
    )
  );

const barLevel = async (page: Page, index = 0) =>
  Number(
    await page
      .locator(`[data-slot="bar-visualizer-bar"][data-index="${index}"]`)
      .evaluate((node) => node.style.getPropertyValue("--bar-level"))
  );

const visualFrame = (page: Page, level: number) =>
  page.evaluate(
    (value) =>
      window.meters.emitVisual({
        bands: Float32Array.from([value, value, value]),
        history: Float32Array.from([value, value, value]),
        historyLength: 3,
        historyStart: 0,
        peakDb: -12,
      }),
    level
  );

/** The inline value, since computed custom properties resolve `var()`. */
const inlineFill = (meter: Locator) =>
  meter.evaluate((node) => node.style.getPropertyValue("--meter-fill"));

const emitPeak = (page: Page, peakDb: number) =>
  page.evaluate(
    (db) => window.meters.emitMeter({ channels: [{ peakDb: db }] }),
    peakDb
  );

/** Resolves once the browser has reported the element's next visibility. */
const settleVisibility = (target: Locator, visible: boolean) =>
  target.evaluate(
    (node, wanted) =>
      new Promise<void>((resolve) => {
        const observer = new IntersectionObserver((entries) => {
          if (entries.at(-1)?.isIntersecting === wanted) {
            observer.disconnect();
            resolve();
          }
        });

        observer.observe(node);
      }),
    visible
  );

const labelsOf = (scale: Locator, selector = '[data-slot="db-scale-label"]') =>
  scale
    .locator(selector)
    .evaluateAll((nodes) => nodes.map((node) => node.textContent));

export const runMetersSuite = (runtime: string) => {
  test.describe("meter contracts", () => {
    const errors: string[] = [];

    test.beforeEach(({ page }) => {
      errors.length = 0;
      page.on("pageerror", (error) => errors.push(error.message));
    });

    test.afterEach(() => {
      expect(errors).toEqual([]);
    });

    test("db scale renders common ticks, thins colliding labels and accepts custom ticks", async ({
      page,
    }) => {
      await open(page, "case=scale");
      expect(await labelsOf(page.getByTestId("scale-default"))).toEqual([
        "0",
        "−6",
        "−12",
        "−18",
        "−24",
      ]);

      const thin = page.getByTestId("scale-thin");

      await expect
        .poll(() => labelsOf(thin, '[data-slot="db-scale-label"][data-hidden]'))
        .toEqual(["−6", "−54"]);
      await expect(
        page.getByTestId("scale-custom").locator('[data-slot="db-scale-tick"]')
      ).toHaveCount(2);
    });

    test("db readout formats declared values, follows a source within its interval and swaps between the two", async ({
      page,
    }) => {
      await openFrozen(page, "case=readout");
      await expect(
        page.getByTestId("declared").locator('[data-slot="db-readout"]')
      ).toHaveText("−6.0 dB");

      const live = page.getByTestId("live").locator('[data-slot="db-readout"]');
      await expect(live).toHaveText("−∞ dB");
      await emitPeak(page, -12.34);
      await advance(page, READOUT_DEADLINE_MS);
      await expect(live).toHaveText("−12.3 dB");
      await expect(live).toHaveAttribute("data-zone", "warn");

      await page.evaluate(() => window.meters.setReadout(-Infinity));
      await expect(live).toHaveText("−∞ dB");
      await expect(live).toHaveAttribute("data-zone", "ok");
      await expect(live).toHaveAttribute("data-silent", "");

      await page.evaluate(() => window.meters.setReadout(undefined));
      await emitPeak(page, -12.34);
      await advance(page, READOUT_DEADLINE_MS);
      await expect(live).toHaveText("−12.3 dB");
      await expect(live).toHaveAttribute("data-zone", "warn");
    });

    test("clip indicator lights on a clip, counts it, resets on click and follows the controlled prop", async ({
      page,
    }) => {
      await open(page, "case=clip");

      const counted = page.getByTestId("clip-count").getByRole("button");
      const count = counted.locator('[data-slot="clip-indicator-count"]');
      await expect(counted).not.toHaveAttribute("data-clipping");
      await page.evaluate(() => window.meters.reportClip("count", 0));
      await expect(counted).toHaveAttribute("data-clipping");
      await expect(count).toHaveText("1");
      await counted.click();
      await expect(counted).not.toHaveAttribute("data-clipping");
      await expect(count).toHaveText("0");

      await expect(
        page.getByTestId("clip-controlled").getByRole("button")
      ).toHaveAttribute("data-clipping");
    });

    test("clip indicator stays lit until its 500 ms hold expires and then releases", async ({
      page,
    }) => {
      await openFrozen(page, "case=clip");

      const held = page.getByTestId("clip-hold").getByRole("button");
      await page.evaluate(() => window.meters.reportClip("hold", -0.5));
      await expect(held).toHaveAttribute("data-clipping");

      await advance(page, CLIP_HOLD_MS - CLIP_PROBE_MS);
      await expect(held).toHaveAttribute("data-clipping");

      await advance(page, 2 * CLIP_PROBE_MS);
      await expect(held).not.toHaveAttribute("data-clipping");
    });

    test("bar visualizer renders its bar count and paints declarative levels", async ({
      page,
    }) => {
      await open(page, "case=bars&barCount=7");
      await expect(
        page.locator('[data-slot="bar-visualizer-bar"]')
      ).toHaveCount(7);

      await open(page, "case=bars&barCount=2&minLevel=0");
      await page.evaluate(() => window.meters.setLevels([0.5, 1]));
      await expect.poll(() => barLevel(page, 0)).toBe(0.5);
      await expect.poll(() => barLevel(page, 1)).toBe(1);
      await expect(
        page
          .locator('[data-slot="bar-visualizer-bar"]')
          .evaluateAll((nodes) =>
            nodes.map((node) => node.style.getPropertyValue("--bar-level"))
          )
      ).resolves.toEqual(["0.5000", "1.0000"]);
    });

    test("bar visualizer bars fall when levels go away and data-active follows", async ({
      page,
    }) => {
      await openFrozen(page, "case=bars&barCount=5");

      const root = page.locator('[data-slot="bar-visualizer"]');
      await page.evaluate(() => window.meters.setLevels([1, 1, 1, 1, 1]));
      await advance(page, 500);
      expect(await barLevel(page, 2)).toBeGreaterThan(0.8);
      await expect(root).toHaveAttribute("data-active", "");

      await page.evaluate(() => window.meters.setLevels(undefined));
      await advance(page, 3000);
      expect(await barLevel(page, 2)).toBeLessThan(0.3);
      await expect(root).not.toHaveAttribute("data-active");
    });

    test("level meter exposes its label and range", async ({ page }) => {
      await openFrozen(page, "case=meter&peak=-12");

      const meter = page.getByRole("meter", { name: "Mic" });
      await expect(meter).toHaveAttribute("aria-valuemin", "-60");
      await expect(meter).toHaveAttribute("aria-valuemax", "0");
    });

    test("level meter paints declarative values for assistive technology", async ({
      page,
    }) => {
      await openFrozen(page, "case=meter&peak=-6");
      await advance(page, 400);
      expect(await meterLevel(page)).toBeCloseTo(0.9, 2);
      await expect(page.getByRole("meter")).toHaveAttribute(
        "aria-valuenow",
        "-6.0"
      );
      await expect(channel(page)).toHaveAttribute("data-zone", "clip");
    });

    test("level meter follows a frame source and adds a track for every channel", async ({
      page,
    }) => {
      await openFrozen(page, "case=meter&source=1");
      await advance(page, 20);
      await emitPeak(page, -30);
      await advance(page, 400);
      expect(await meterLevel(page)).toBeCloseTo(0.5, 2);

      await page.evaluate(() =>
        window.meters.emitMeter({
          channels: [{ peakDb: -12 }, { peakDb: -24 }],
        })
      );
      await advance(page, 400);
      await expect(channel(page, 1)).toHaveCount(1);
      expect(await meterLevel(page, 1)).toBeCloseTo(0.6, 2);
    });

    test("level meter paints through actionsRef", async ({ page }) => {
      await openFrozen(page, "case=meter");
      await page.evaluate(() =>
        window.meters.paintMeter({ channels: [{ peakDb: -18 }] })
      );
      await advance(page, 400);
      expect(await meterLevel(page)).toBeCloseTo(0.7, 2);
    });

    test("level meter marks clipping and uses the orientation it is given", async ({
      page,
    }) => {
      await openFrozen(page, "case=meter&peak=0&orientation=vertical");
      await advance(page, 100);
      await expect(page.getByRole("meter")).toHaveAttribute(
        "data-clipping",
        ""
      );
      await expect(page.getByRole("meter")).toHaveAttribute(
        "data-orientation",
        "vertical"
      );
    });

    test("level meter clears data-clipping when its painter is rebuilt mid-clip", async ({
      page,
    }) => {
      await openFrozen(page, "case=meter&peak=0");
      await advance(page, 50);

      const meter = page.getByRole("meter");
      await expect(meter).toHaveAttribute("data-clipping", "");

      // A ballistics change rebuilds the painter while the clip is held.
      await page.evaluate(() => {
        window.meters.setBallistics("vu");
        window.meters.setPeak(-20);
      });
      await advance(page, 2000);
      await expect(meter).not.toHaveAttribute("data-clipping");
    });

    test("level meter keeps showing a declarative level in LevelMeterValue", async ({
      page,
    }) => {
      await openFrozen(page, "case=meter&peak=-12&value=1");
      await advance(page, 1000);
      await expect(page.locator('[data-slot="db-readout"]')).toHaveText(
        "−12.0 dB"
      );
    });

    test("level meter keeps a user fill under its zone fill", async ({
      page,
    }) => {
      await open(page, "case=meter&peak=-12&fill=1");
      expect(await inlineFill(page.getByRole("meter"))).toBe(
        "var(--meter-warn)"
      );
    });

    test("level meter renders its zone fill on the server", async ({
      page,
    }, info) => {
      const pluginModule = await import(
        runtime === "solid-1" ? "vite-plugin-solid" : "@solidjs/vite-plugin"
      );

      const alias = [{ find: "@", replacement: process.cwd() }];

      if (runtime === "solid-2")
        alias.push({ find: "solid-js/web", replacement: "@solidjs/web" });

      const server = await createServer({
        configFile: false,
        cacheDir: `test-results/meters/${runtime}/vite-ssr`,
        plugins: [pluginModule.default({ ssr: true })],
        resolve: { alias },
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false, ws: false },
      });

      try {
        const fixture = await server.ssrLoadModule("/app/meters-ssr.tsx");
        const html: string = fixture.renderMeter();

        expect(html).toContain("--meter-fill:linear-gradient");
        await page.setContent(html);
        expect(await inlineFill(page.getByRole("meter"))).toContain(
          "linear-gradient"
        );
        await mkdir(`test-results/meters/${runtime}`, { recursive: true });
        await writeFile(
          `test-results/meters/${runtime}/meter-ssr-${info.repeatEachIndex}.html`,
          html
        );
      } finally {
        await server.close();
      }
    });

    test("db readout keeps updating while its parent updates faster than it ticks", async ({
      page,
    }) => {
      await openFrozen(page, "case=busy");
      await emitPeak(page, -6);

      // Small steps, so each parent update lands between readout ticks.
      for (let step = 0; step < 6; step += 1) {
        await advance(page, 50);
      }

      await expect(page.locator('[data-slot="db-readout"]')).toHaveText(
        "-6.0 dB"
      );
    });

    test("channel strip clears data-clipping when a clipping meter is removed", async ({
      page,
    }) => {
      await open(page, "case=strip");

      const strip = page.locator('[data-slot="channel-strip"]');
      await expect(strip).toHaveAttribute("data-clipping", "");
      await page.evaluate(() => window.meters.setStripMeter(false));
      await expect(strip).not.toHaveAttribute("data-clipping");
    });

    test.describe("settled painters request no frames", () => {
      test("level meter sleeps once settled, and a new value wakes it", async ({
        page,
      }) => {
        await openFrozen(page, "case=meter&peak=-12");
        await advance(page, 100);
        expect(await meterLevel(page)).toBeCloseTo(AT_MINUS_12, 3);
        expect(await pendingTimers(page)).toBe(0);

        await page.evaluate(() => window.meters.setPeak(-40));
        expect(await pendingTimers(page)).toBeGreaterThan(0);
        await advance(page, SETTLE_MS);
        expect(await meterLevel(page)).toBeCloseTo(AT_MINUS_40, 2);
        await expect(page.getByRole("meter")).toHaveAttribute(
          "aria-valuetext",
          "−40.0 dB"
        );
        expect(await pendingTimers(page)).toBe(0);
      });

      test("level meter falls smoothly after a long sleep instead of jumping", async ({
        page,
      }) => {
        await openFrozen(page, "case=meter&peak=-12");
        await advance(page, SETTLE_MS);
        await page.evaluate(() => window.meters.setPeak(-40));
        await advance(page, 20);
        expect(await meterLevel(page)).toBeGreaterThan(0.6);
        expect(await meterLevel(page)).toBeLessThan(AT_MINUS_12);
      });

      test("level meter sleeps off screen and catches up when it comes back", async ({
        page,
      }) => {
        await openFrozen(page, "case=meter&peak=-12");
        await advance(page, 100);

        const meter = page.getByRole("meter");
        await page.evaluate(() => window.scrollTo(0, 3000));
        await settleVisibility(meter, false);
        await page.evaluate(() => window.meters.setPeak(-40));
        await advance(page, SETTLE_MS);
        expect(await meterLevel(page)).toBeCloseTo(AT_MINUS_12, 3);
        expect(await pendingTimers(page)).toBe(0);

        await page.evaluate(() => window.scrollTo(0, 0));
        await settleVisibility(meter, true);
        await advance(page, SETTLE_MS);
        expect(await meterLevel(page)).toBeCloseTo(AT_MINUS_40, 2);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("level meter holds a steady clip without frames, and counts the light down after", async ({
        page,
      }) => {
        await openFrozen(page, "case=meter&peak=0");
        await advance(page, 100);

        const meter = page.getByRole("meter");
        await expect(meter).toHaveAttribute("data-clipping", "");
        expect(await pendingTimers(page)).toBe(0);

        await page.evaluate(() => window.meters.setPeak(-30));
        await advance(page, 1000);
        await expect(meter).toHaveAttribute("data-clipping", "");
        await advance(page, SETTLE_MS);
        await expect(meter).not.toHaveAttribute("data-clipping");
        expect(await pendingTimers(page)).toBe(0);
      });

      test("bar visualizer settles static bars, and new levels wake them", async ({
        page,
      }) => {
        await openFrozen(page, "case=bars&barCount=3");
        await page.evaluate(() => window.meters.setLevels([0.6, 0.6, 0.6]));
        await advance(page, 100);
        expect(await barLevel(page)).toBeCloseTo(0.6, 3);
        expect(await pendingTimers(page)).toBe(0);

        await page.evaluate(() => window.meters.setLevels([0.1, 0.1, 0.1]));
        await advance(page, 50);
        expect(await barLevel(page)).toBeGreaterThan(0.1);
        await advance(page, SETTLE_MS);
        expect(await barLevel(page)).toBeCloseTo(0.1, 2);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("bar visualizer keeps an idle animation running", async ({
        page,
      }) => {
        await openFrozen(page, "case=bars&barCount=3&idle=1");
        await advance(page, SETTLE_MS);
        expect(await pendingTimers(page)).toBeGreaterThan(0);
      });

      test("bar visualizer wakes sleeping bars on a source frame", async ({
        page,
      }) => {
        await openFrozen(page, "case=bars&barCount=3&source=1");
        await advance(page, 200);
        expect(await pendingTimers(page)).toBe(0);

        await visualFrame(page, 0.7);
        await advance(page, 100);
        expect(await barLevel(page)).toBeCloseTo(0.7, 2);
        expect(await pendingTimers(page)).toBe(0);
      });

      test("db readout stops its ticker when the source goes quiet and restarts on a frame", async ({
        page,
      }) => {
        await openFrozen(page, "case=readout");

        const live = page
          .getByTestId("live")
          .locator('[data-slot="db-readout"]');

        await emitPeak(page, -12);
        await advance(page, 300);
        await expect(live).toHaveText("−12.0 dB");

        await advance(page, 2000);
        await expect(live).toHaveText("−∞ dB");
        expect(await pendingTimers(page)).toBe(0);

        await emitPeak(page, -6);
        await advance(page, 300);
        await expect(live).toHaveText("−6.0 dB");
      });
    });
  });
};
