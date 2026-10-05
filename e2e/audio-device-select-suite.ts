import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runAudioDeviceSelectSuite = (runtime: string) => {
  test("device picker navigates options, handles permissions and remembers disconnected labels", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/audio-devices");
    const trigger = page.getByRole("button", { name: /Microphone device/ });
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.getByText("Allow microphone access to see your devices.")
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Allow access", exact: true })
      .click();
    await expect(
      page.getByText("Allow microphone access to see your devices.")
    ).toHaveCount(0);
    await page
      .getByRole("option", { name: "Studio microphone", exact: true })
      .click();
    await expect(trigger).toContainText("Studio microphone");
    await expect(page.getByTestId("selected-device")).toHaveText("studio");
    await page.getByRole("button", { name: "Disconnect studio" }).click();
    await expect(trigger).toContainText("Studio microphone (disconnected)");
    await expect(trigger).toHaveAttribute("data-missing", "");
    await trigger.click();
    await expect(
      page.getByRole("option", { name: "Studio microphone (disconnected)" })
    ).toHaveAttribute("aria-disabled", "true");
    await page.getByRole("option", { name: "None", exact: true }).click();
    await expect(page.getByTestId("selected-device")).toHaveText("none");
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("option", { name: "None", exact: true })
    ).toBeFocused();
    // Kobalte schedules mount autofocus after settling. Let that pass finish
    // before sending another key, rather than racing its deferred focus.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Built-in microphone", exact: true })
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("selected-device")).toHaveText("builtin");
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(trigger).toBeFocused();
    await mkdir(`test-results/audio-devices/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/audio-devices/${runtime}/picker-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
};
