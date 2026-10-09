import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runAudioDeviceSelectSuite = (runtime: string) => {
  test("default device labels show Default exactly once", async ({
    page,
  }, info) => {
    await page.goto("/audio-devices");
    await page.getByRole("combobox", { name: "Default device labels" }).click();

    const prefixed = page.getByRole("option", {
      name: "Default - MacBook Pro Microphone",
      exact: true,
    });

    const generic = page.getByRole("option", {
      name: "MacBook Pro Microphone Default",
      exact: true,
    });

    await expect(prefixed).toBeVisible();
    await expect(prefixed.getByText("Default", { exact: true })).toHaveCount(0);
    await expect(generic.getByText("Default", { exact: true })).toHaveCount(1);
    expect((await prefixed.innerText()).match(/Default/g)).toHaveLength(1);
    await info.attach(`default-device-labels-${runtime}.png`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("generic select preserves keyboard focus and stacked modal scroll locks", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/audio-devices");
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      main.style.marginTop = "3000px";
      main.style.marginBottom = "1000px";
    });

    const settings = page.getByRole("button", { name: "Open settings" });

    await settings.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await settings.click();
    const dialog = page.getByRole("dialog", { name: "Select settings" });
    await expect(dialog).toBeVisible();
    const trigger = page.getByRole("combobox", { name: "Generic collection" });
    await expect(trigger).toBeFocused();
    await page.keyboard.press("ArrowDown");

    const selected = page.getByRole("option", {
      name: "Option70",
      exact: true,
    });

    await expect(selected).toBeFocused();
    await expect(selected).toBeInViewport();
    await expect(
      page.getByRole("option", { name: "Option71", exact: true })
    ).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("option", { name: "Option72", exact: true })
    ).toBeFocused();
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("option", { name: "Option00", exact: true })
    ).toBeFocused();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Option79", exact: true })
    ).toBeInViewport();
    await page.keyboard.type("Option40");
    await expect(
      page.getByRole("option", { name: "Option40", exact: true })
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveText("Option40");
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(settings).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await page.evaluate(() => scrollBy(0, 100));
    expect(await page.evaluate(() => scrollY)).toBe(before + 100);
    await info.attach(`generic-select-modal-${runtime}.png`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });

  test("device picker keeps scrolling local to a long portaled collection", async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 390, height: 664 });
    await page.goto("/audio-devices");
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      main.style.marginTop = "3000px";
      main.style.marginBottom = "1000px";
    });

    const trigger = page.getByRole("combobox", {
      name: "Long device collection",
    });

    await trigger.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => scrollY);
    await trigger.click();
    const listbox = page.getByRole("listbox");
    await expect(listbox).toBeVisible();

    const selected = page.getByRole("option", {
      name: "Device70",
      exact: true,
    });

    await expect(selected).toBeFocused();
    await expect(selected).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(before);
    await page.keyboard.press("Home");
    await expect(
      page.getByRole("option", { name: "Device00", exact: true })
    ).toBeFocused();
    await expect(
      page.getByRole("option", { name: "Device00", exact: true })
    ).toBeInViewport();
    await page.keyboard.press("End");
    await expect(
      page.getByRole("option", { name: "Device79", exact: true })
    ).toBeFocused();
    await expect(
      page.getByRole("option", { name: "Device79", exact: true })
    ).toBeInViewport();
    await page.keyboard.press("Home");
    await page.keyboard.type("Device40");
    await expect(
      page.getByRole("option", { name: "Device40", exact: true })
    ).toBeFocused();
    await expect(
      page.getByRole("option", { name: "Device40", exact: true })
    ).toBeInViewport();
    expect(await page.evaluate(() => scrollY)).toBe(before);

    const geometry = await listbox.evaluate((element) => {
      return {
        scrollY,
        scrollTop: element.scrollTop,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });

    expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
    expect(geometry.scrollTop).toBeGreaterThan(0);
    await info.attach(`long-select-scroll-${runtime}.json`, {
      body: JSON.stringify({ before, geometry }, null, 2),
      contentType: "application/json",
    });
    await page.keyboard.press("Enter");
    await expect(trigger).toContainText("Device40");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(
      page.getByRole("option", { name: "Device40", exact: true })
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(before);
  });

  test("device picker navigates options, handles permissions and remembers disconnected labels", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/audio-devices");
    const trigger = page.getByRole("combobox", { name: /Microphone device/ });
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
