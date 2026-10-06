import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runWaveformSuite = (runtime: string) => {
  test("waveform retains its first captured touch when a second finger releases", async ({
    page,
    context,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 2,
    });
    await page.goto("/waveform?case=gesture");
    const waveform = page.getByRole("slider", { name: "Gesture waveform" });
    const box = (await waveform.boundingBox())!;
    const y = box.y + box.height / 2;
    const first = { id: 1, x: box.x + box.width * 0.75, y };
    const second = { id: 2, x: box.x + box.width * 0.25, y };
    await waveform.evaluate((node) => {
      const events: { type: string; pointerId: number }[] = [];

      const types = [
        "pointerdown",
        "gotpointercapture",
        "lostpointercapture",
      ] as const;

      for (const type of types) {
        node.addEventListener(type, (event) => {
          if (!(event instanceof PointerEvent))
            throw new Error("Expected a native pointer capture event");

          events.push({ type, pointerId: event.pointerId });
          node.dataset.captureEvents = JSON.stringify(events);
        });
      }
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ ...first, x: first.x - 1 }],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [first, second],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [second],
    });
    await expect(waveform).toHaveAttribute("data-dragging", "");
    await expect
      .poll(() =>
        waveform.evaluate((node) =>
          Number(node.style.getPropertyValue("--waveform-position"))
        )
      )
      .toBeCloseTo(0.75, 2);
    await expect(page.getByTestId("seek-commits")).toHaveText("[]");
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(page.getByTestId("seek-commits")).toHaveText("[90]");
    await expect(waveform).not.toHaveAttribute("data-dragging", "");
    await info.attach("native-multi-touch-capture", {
      body: (await waveform.getAttribute("data-capture-events")) ?? "[]",
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath(`multi-touch-${runtime}.png`),
    });
    await cdp.detach();
  });

  test("waveform gesture isolates streamed and controlled playback until release", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/waveform?case=gesture");
    const waveform = page.getByRole("slider", { name: "Gesture waveform" });

    const position = () =>
      page
        .locator('[data-slot="waveform"]')
        .evaluate((node) =>
          Number(node.style.getPropertyValue("--waveform-position"))
        );

    const box = (await waveform.boundingBox())!;

    const hold = async () => {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
    };

    await hold();
    await page
      .getByRole("button", { name: "Advance playback" })
      .dispatchEvent("click");
    await expect(page.getByTestId("playback-time")).toHaveText("30");
    await expect.poll(position).toBe(0.75);
    await expect(page.getByTestId("seek-commits")).toHaveText("[]");
    await page.mouse.up();
    await expect(page.getByTestId("seek-commits")).toHaveText("[90]");
    await page.getByRole("button", { name: "Advance playback" }).click();
    await expect.poll(position).toBe(1);

    await hold();
    await page
      .getByRole("button", { name: "Reset playback" })
      .dispatchEvent("click");
    await waveform.dispatchEvent("pointercancel", { pointerId: 1 });
    await page.mouse.up();
    await expect.poll(position).toBe(0);
    await expect(page.getByTestId("seek-commits")).toHaveText("[90]");
    await waveform.press("ArrowRight");
    await expect(page.getByTestId("seek-commits")).toHaveText("[90,5]");

    await hold();
    await page
      .getByRole("button", { name: "Disable seeking" })
      .dispatchEvent("click");
    await page.mouse.up();
    await expect.poll(position).toBeCloseTo(5 / 120, 5);
    await expect(page.getByTestId("seek-commits")).toHaveText("[90,5]");
    await mkdir(`test-results/waveform/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/waveform/${runtime}/gesture-${info.repeatEachIndex}.png`,
    });
    expect(errors).toEqual([]);
  });
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
  test("waveform leaving clears the hover line even while seeking is off", async ({
    page,
  }) => {
    await page.goto("/waveform?case=hover");

    const waveform = page.locator('[data-slot="waveform"]');
    const hover = page.locator('[data-slot="waveform-hover"]');
    const box = (await waveform.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(hover).toHaveCount(1);

    // A new track starts loading under the pointer: seeking turns off. The
    // click is dispatched in the page so the pointer stays where it is.
    const toggle = page.getByRole("button", { name: "Toggle loading" });
    await toggle.dispatchEvent("click");
    await expect(hover).toHaveCount(0);
    await page.mouse.move(0, 0);
    await toggle.dispatchEvent("click");
    await expect(waveform).not.toHaveAttribute("data-loading");
    await expect(hover).toHaveCount(0);
  });
  test("waveform data reports an error, not endless loading, without Web Audio", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Reflect.deleteProperty(window, "AudioContext");
      Reflect.deleteProperty(window, "webkitAudioContext");
    });
    await page.goto("/waveform?case=data-without-web-audio");
    await expect(page.getByTestId("waveform-status")).toHaveText("error");
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
