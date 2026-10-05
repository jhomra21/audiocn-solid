import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runWaveformSuite = (runtime: string) => {
  test("waveform demo renders synthesised audio and moves its real media playhead", async ({
    page,
  }) => {
    await page.goto("/waveform?demo=1");

    const waveform = page.getByRole("slider", {
      name: "Night Drive",
      exact: true,
    });

    await expect(waveform).toHaveAttribute("aria-valuemax", "19");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause", exact: true })
    ).toBeVisible();
    await expect
      .poll(() =>
        waveform.evaluate((node) =>
          Number(node.style.getPropertyValue("--waveform-position"))
        )
      )
      .toBeGreaterThan(0.01);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
  });
  test("waveform paints peaks, streams its playhead and seeks with pointer and keyboard", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/waveform");

    const waveform = page.getByRole("slider", {
      name: "Clip waveform",
      exact: true,
    });

    await expect(waveform).toHaveAttribute("aria-valuenow", "0");
    const canvas = page.locator('[data-slot="waveform-canvas"]');
    await expect
      .poll(() =>
        canvas.evaluate((node: HTMLCanvasElement) =>
          node
            .getContext("2d")!
            .getImageData(0, 0, node.width, node.height)
            .data.some((value, index) => index % 4 === 3 && value > 0)
        )
      )
      .toBe(true);
    await page.getByRole("button", { name: "Emit playhead" }).click();
    await expect
      .poll(() =>
        waveform.evaluate((node) =>
          node.style.getPropertyValue("--waveform-position")
        )
      )
      .toBe("0.25000");
    await waveform.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("committed-time")).toHaveText("35");
    await page.keyboard.press("Shift+ArrowLeft");
    await expect(page.getByTestId("committed-time")).toHaveText("20");
    await page.keyboard.press("End");
    await expect(page.getByTestId("committed-time")).toHaveText("120");
    const box = (await waveform.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75);
    await expect(page.locator('[data-slot="waveform-hover"]')).toContainText(
      "1:00"
    );
    await page.mouse.down();
    await page.mouse.up();
    await expect
      .poll(async () =>
        Number(await page.getByTestId("committed-time").textContent())
      )
      .toBeCloseTo(60, 0);
    await page.getByRole("button", { name: "Disable seeking" }).click();
    await expect(page.locator('[data-slot="waveform-hover"]')).toHaveCount(0);
    await expect(waveform).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => canvas.evaluate((node: HTMLCanvasElement) => node.width))
      .toBeLessThan(400);
    await mkdir(`test-results/waveform/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/waveform/${runtime}/seek-${info.repeatEachIndex}.png`,
    });
    await page.getByRole("button", { name: "Remove waveform" }).click();
    await expect(page.getByTestId("waveform-subscribers")).toHaveText("0");
    expect(failures).toEqual([]);
  });
  test("waveform regions resize and move without seeking the clip", async ({
    page,
  }, info) => {
    await page.goto("/waveform");
    const start = page.getByRole("slider", { name: "Region start" });
    await start.focus();
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.getByTestId("region")).toHaveText("21/40");
    await expect(page.getByTestId("committed-time")).toHaveText("none");
    const region = page.locator('[data-slot="waveform-region"]');
    const box = (await region.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await page.mouse.up();
    await expect
      .poll(async () =>
        Number((await page.getByTestId("region").textContent())!.split("/")[0])
      )
      .toBeGreaterThan(21);
    await expect(page.getByTestId("committed-time")).toHaveText("none");
    await page.locator('[data-slot="waveform-region-end"]').focus();
    await page.keyboard.press("Home");
    await expect(page.getByTestId("committed-time")).toHaveText("none");
    await mkdir(`test-results/waveform/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/waveform/${runtime}/region-${info.repeatEachIndex}.png`,
    });
  });
};
