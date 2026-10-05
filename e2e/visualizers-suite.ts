import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runVisualizersSuite = (runtime: string) => {
  test("electric canvases and spectrum axes retain source, theme and reduced-motion behavior", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      const stroke = CanvasRenderingContext2D.prototype.stroke;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        const canvas = this.canvas;
        canvas.dataset.paints = String(Number(canvas.dataset.paints ?? 0) + 1);

        return clear.apply(this, args);
      };

      CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
        this.canvas.dataset.strokeColor = String(this.strokeStyle);

        if (path) return stroke.call(this, path);

        const strokeCurrent: () => void = stroke;

        return strokeCurrent.call(this);
      };
    });
    await page.goto("/visualizers");
    await expect(page.getByTestId("visual-subscriptions")).toHaveText("6");
    const spectrum = page.locator('[data-slot="spectrum-canvas"]');
    await expect
      .poll(() => spectrum.getAttribute("data-paints"))
      .not.toBeNull();
    await expect
      .poll(() =>
        spectrum.evaluate((node: HTMLCanvasElement) =>
          node
            .getContext("2d")!
            .getImageData(0, 0, node.width, node.height)
            .data.some((value, index) => index % 4 === 3 && value > 0)
        )
      )
      .toBe(false);
    await page.getByRole("button", { name: "Paint signal" }).click();

    for (const slot of [
      "electric-bar-visualizer-canvas",
      "electric-waveform-canvas",
      "spectrum-canvas",
    ]) {
      const canvas = page.locator(`[data-slot="${slot}"]`);
      await canvas.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          canvas.evaluate((node: HTMLCanvasElement) => {
            const data = node
              .getContext("2d")
              ?.getImageData(0, 0, node.width, node.height).data;

            return data?.some((value, index) => index % 4 === 3 && value > 0);
          })
        )
        .toBe(true);
    }

    await expect(
      page.locator('[data-slot="spectrum-frequency-axis"]')
    ).toContainText("1k");
    await expect(page.locator('[data-slot="spectrum-level-axis"]')).toHaveText(
      "-30-42-54-66-78-90"
    );

    for (const slot of ["electric-bar-visualizer", "electric-waveform"]) {
      await expect(page.locator(`[data-slot="${slot}"]`)).toHaveAttribute(
        "data-active",
        ""
      );
    }

    const electric = page.locator('[data-slot="electric-waveform-canvas"]');
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.style.setProperty(
        "--electric",
        "rgb(255, 0, 0)"
      );
      document.documentElement.style.setProperty(
        "--electric-core",
        "rgb(255, 0, 0)"
      );
    });
    await expect(electric).toHaveAttribute("data-stroke-color", "#ff0000");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await electric.scrollIntoViewIfNeeded();
    await expect
      .poll(() => electric.getAttribute("data-paints"))
      .not.toBeNull();

    const paints = await electric.evaluate(async (node) => {
      await new Promise((resolve) => setTimeout(resolve, 350));
      const before = Number(node.dataset.paints);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return Number(node.dataset.paints) - before;
    });

    expect(paints).toBeGreaterThanOrEqual(2);
    expect(paints).toBeLessThanOrEqual(5);
    await page.getByRole("button", { name: "Paint actions" }).click();
    await expect(page.getByTestId("electric-actions")).toHaveText("ready");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => electric.evaluate((node: HTMLCanvasElement) => node.width))
      .toBeLessThan(500);
    await mkdir(`test-results/visualizers/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/visualizers/${runtime}/electric-${info.repeatEachIndex}.png`,
    });
    await page.getByRole("button", { name: "Remove visualizers" }).click();
    await expect(page.getByTestId("visual-subscriptions")).toHaveText("0");
    await expect(page.getByTestId("electric-actions")).toHaveText("cleared");
    expect(errors).toEqual([]);
  });
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
