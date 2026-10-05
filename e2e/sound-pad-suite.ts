import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runSoundPadSuite = (runtime: string) => {
  test("sound pads handle modes, hotkeys, navigation, typing and held-key cleanup", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/sound-pads");
    const hold = page.getByRole("button", { name: "Hold pad" });
    await hold.focus();
    await page.keyboard.down("Space");
    await expect(page.getByTestId("held-playing")).toHaveText("true");
    await page.keyboard.up("Space");
    await expect(page.getByTestId("held-playing")).toHaveText("false");
    await page.keyboard.down("1");
    await expect(page.getByTestId("held-playing")).toHaveText("true");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await expect(page.getByTestId("held-playing")).toHaveText("false");
    await page.keyboard.up("1");
    await page.getByRole("textbox").fill("1");
    await expect(page.getByTestId("held-playing")).toHaveText("false");
    await page.getByRole("button", { name: "Toggle pad" }).click();
    await expect(
      page.getByRole("button", { name: "Toggle pad" })
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Toggle pad" }).click();
    await expect(
      page.getByRole("button", { name: "Toggle pad" })
    ).toHaveAttribute("aria-pressed", "false");
    await hold.focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("button", { name: "Toggle pad" })
    ).toBeFocused();
    await page.getByRole("button", { name: "Emit progress" }).click();
    await expect
      .poll(() =>
        page
          .locator('[data-slot="sound-pad-progress"]')
          .first()
          .evaluate((node) => node.style.getPropertyValue("--pad-progress"))
      )
      .toBe("0.5000");
    await hold.focus();
    await page.keyboard.down("1");
    await page.getByRole("button", { name: "Disable held pad" }).click();
    await expect(page.getByTestId("held-playing")).toHaveText("false");
    await page.keyboard.up("1");
    await mkdir(`test-results/sound-pad/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/sound-pad/${runtime}/modes-${info.repeatEachIndex}.png`,
    });
    await page.getByRole("button", { name: "Remove pads" }).click();
    await expect(page.getByTestId("progress-subscribers")).toHaveText("0");
    expect(failures).toEqual([]);
  });
  test("track rows select by keyboard, skip disabled rows and leave nested controls alone", async ({
    page,
  }, info) => {
    await page.goto("/sound-pads");
    const first = page.locator('[data-slot="track-list-item"]').first();
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-current", "true");
    await page.keyboard.press("ArrowDown");
    await expect(
      page.locator('[data-slot="track-list-item"]').nth(2)
    ).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("selected-track")).toHaveText("3");
    await page.getByRole("button", { name: "Track action" }).click();
    await expect(page.getByTestId("selected-track")).toHaveText("3");
    await mkdir(`test-results/sound-pad/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/sound-pad/${runtime}/tracks-${info.repeatEachIndex}.png`,
    });
  });
};
