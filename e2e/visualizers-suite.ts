import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runVisualizersSuite = (runtime: string) => {
  test("visualizers paint source frames, resize, accept actions, and unsubscribe", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/visualizers");
    const bars = page.locator('[data-slot="bar-visualizer-bar"]');
    await expect(bars).toHaveCount(8);
    await page.getByRole("button", { name: "Paint signal" }).click();
    await expect
      .poll(() =>
        bars
          .first()
          .evaluate((bar) => Number(bar.style.getPropertyValue("--bar-level")))
      )
      .toBeGreaterThan(0.2);
    const smooth = page.locator('[data-slot="smooth-waveform-canvas"]');
    const live = page.locator('[data-slot="live-waveform-canvas"]');

    for (const canvas of [smooth, live]) {
      await expect
        .poll(() =>
          canvas.evaluate((node: HTMLCanvasElement) => {
            const data = node
              .getContext("2d")
              ?.getImageData(0, 0, node.width, node.height).data;

            return data
              ? data.some((value, index) => index % 4 === 3 && value > 0)
              : false;
          })
        )
        .toBe(true);
    }

    await page.getByRole("button", { name: "Change bar count" }).click();
    await expect(bars).toHaveCount(12);
    await page.getByRole("button", { name: "Paint actions" }).click();
    await expect
      .poll(() =>
        bars
          .first()
          .evaluate((bar) => Number(bar.style.getPropertyValue("--bar-level")))
      )
      .toBeGreaterThan(0.7);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => live.evaluate((node: HTMLCanvasElement) => node.width))
      .toBeLessThan(500);
    await mkdir(`test-results/visualizers/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/visualizers/${runtime}/mobile-${info.repeatEachIndex}.png`,
    });
    await page.getByRole("button", { name: "Remove visualizers" }).click();
    await expect(page.getByTestId("visual-subscriptions")).toHaveText("0");
    expect(errors).toEqual([]);
  });
};
