import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runPopoverSuite = (runtime: string) => {
  test("volume popover supports keyboard, mute restore, outside dismissal and focus return", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/popover");
    const trigger = page.getByRole("button", { name: "Volume", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const popup = page.getByRole("dialog");
    await expect(popup).toBeVisible();
    const slider = popup.getByRole("slider", { name: "Volume", exact: true });
    await expect(slider).toHaveAttribute("aria-valuetext", "80%");
    await popup.getByRole("button", { name: "Mute" }).click();
    await expect(popup.getByRole("button", { name: "Unmute" })).toBeVisible();
    await popup.getByRole("button", { name: "Unmute" }).click();
    await expect(slider).toHaveAttribute("aria-valuetext", "80%");
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: "Outside popover" }).click();
    await expect(popup).toHaveCount(0);
    await mkdir(`test-results/popover/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/popover/${runtime}/dismissed-${info.repeatEachIndex}.png`,
    });
    expect(errors).toEqual([]);
  });
};
