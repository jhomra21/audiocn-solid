import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

interface ParitySuiteOptions {
  runtime: "solid-1" | "solid-2";
  artifactDir: string;
}

const captureConsoleFailures = (page: Page) => {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      failures.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error: Error) => {
    failures.push(`pageerror: ${error.message}`);
  });
  return failures;
};

export const runParitySuite = ({
  runtime,
  artifactDir,
}: ParitySuiteOptions) => {
  test("renders all upstream examples with real meter styles", async ({ page }) => {
    const failures = captureConsoleFailures(page);
    await page.goto("/");

    await expect(page.locator(`[data-runtime="${runtime}"]`)).toBeVisible();
    await expect(page.locator('[data-slot="component-preview"]')).toHaveCount(16);

    const demo = page.locator('[data-example="level-meter-demo"]');
    const meter = demo.locator('[data-slot="level-meter"]');
    await expect(meter).toBeVisible();
    await expect(
      meter.locator(
        '[data-slot="level-meter-channels"] > [data-slot="db-scale"]'
      )
    ).toHaveCount(1);

    const track = meter.locator('[data-slot="level-meter-track"]').first();
    await expect
      .poll(async () =>
        track.evaluate((node) => node.getBoundingClientRect().height)
      )
      .toBeGreaterThan(0);

    const channel = meter.locator('[data-slot="level-meter-channel"]').first();
    await expect
      .poll(async () =>
        Number.parseFloat(
          await channel.evaluate((node) =>
            node.style.getPropertyValue("--meter-level")
          )
        )
      )
      .toBeGreaterThan(0);

    expect(
      await page.locator("body").evaluate((node) => getComputedStyle(node).fontFamily)
    ).toContain("DM Sans Variable");

    await expect(
      demo.locator('[data-slot="component-preview"]')
    ).toHaveClass(/text-foreground\/90/);
    expect(
      await demo
        .locator('[data-slot="db-readout"]')
        .evaluate((node) => getComputedStyle(node).fontFamily)
    ).toContain("Geist Mono Variable");

    await expect(
      page.locator("[source], [floordb], [mindb], [maxdb], [taper]")
    ).toHaveCount(0);

    const codeButton = demo.getByRole("button", { name: "Code" });
    await codeButton.click();
    await expect(demo.locator("code")).toContainText("LevelMeterDemo");
    await demo.getByRole("button", { name: "Preview" }).click();

    const latching = page.locator('[data-example="clip-indicator-latching"]');
    const clip = latching.locator('[data-slot="clip-indicator"]');
    const simulate = latching.getByRole("button", { name: "Simulate a clip" });
    await expect(simulate).toHaveAttribute("type", "button");
    await expect(simulate).toHaveAttribute("tabindex", "0");
    await simulate.click();
    await expect(clip.locator('[data-slot="clip-indicator-count"]')).toHaveText(
      "1"
    );
    await expect(clip).toHaveAttribute("data-clipping", "");
    await latching.getByRole("button", { name: "Reset", exact: true }).click();
    await expect(clip.locator('[data-slot="clip-indicator-count"]')).toHaveText(
      "0"
    );

    const tokenSnapshot = await page.evaluate(() => {
      const root = document.documentElement;
      root.dataset.theme = "ocean";
      const ocean = getComputedStyle(root).getPropertyValue("--primary").trim();
      root.classList.add("dark");
      const dark = getComputedStyle(root).getPropertyValue("--background").trim();
      root.classList.remove("dark");
      delete root.dataset.theme;
      return { dark, ocean };
    });
    expect(tokenSnapshot.ocean).toBe("oklch(0.5 0.215 262.881)");
    expect(tokenSnapshot.dark).toBe("oklch(0.147 0.004 49.25)");


    expect(failures).toEqual([]);

    await mkdir(artifactDir, { recursive: true });
    await page.screenshot({
      path: join(artifactDir, "example-gallery.png"),
      fullPage: true,
    });
  });

  test("holds component contracts across Solid runtimes", async ({ page }) => {
    const failures = captureConsoleFailures(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/contracts");

    await expect(page.getByTestId("reduced-motion")).toHaveText("reduce");

    await expect(
      page.locator('[data-contract="value-floor"] [data-slot="db-readout"]')
    ).toHaveText("−∞ dB");

    const override = page.locator('[data-contract="readout-overrides"] [role="status"]');
    await expect(override).toHaveAttribute("data-slot", "custom-readout");
    await expect(override).toHaveAttribute("data-zone", "mine");

    const valueClass = page.locator(
      '[data-contract="value-class"] [data-slot="db-readout"]'
    );
    await expect(valueClass).toHaveClass(/(?:^|\s)text-sm(?:\s|$)/);
    await expect(valueClass).not.toHaveClass(/(?:^|\s)text-xs(?:\s|$)/);
    await expect(valueClass).not.toHaveClass(
      /(?:^|\s)text-muted-foreground(?:\s|$)/
    );

    const tick = page.locator('[data-contract="scale-style"] [data-slot="db-scale-tick"]');
    await expect
      .poll(async () => tick.getAttribute("style"))
      .toContain("--tick-position:");
    await expect
      .poll(async () => tick.getAttribute("style"))
      .toContain("color: red");

    const ignored = page.locator('[data-contract="ignored-children"]');
    await expect(ignored).not.toContainText("BAR-CHILD");
    await expect(ignored).not.toContainText("HOLD-CHILD");
    const hold = ignored.locator('[data-slot="level-meter-hold"]');
    await expect(hold).not.toHaveClass(/hold-x/);
    await expect(hold.locator(".hold-x")).toHaveCount(1);

    const customMeter = page.locator('[data-contract="meter-overrides"] [data-slot="custom-meter"]');
    await expect(customMeter).toHaveAttribute("role", "progressbar");
    await expect(customMeter).toHaveAttribute("aria-valuemin", "-100");

    const prevented = page.locator('[data-contract="prevented-clip"]');
    const preventedClip = prevented.locator('[data-slot="clip-indicator"]');
    await prevented.getByRole("button", { name: "Report" }).click();
    await expect(
      preventedClip.locator('[data-slot="clip-indicator-count"]')
    ).toHaveText("1");
    await preventedClip.click();
    await expect(
      preventedClip.locator('[data-slot="clip-indicator-count"]')
    ).toHaveText("1");
    await expect(preventedClip).toHaveAttribute("data-clipping", "");

    await expect(
      page.locator('[data-contract="custom-render"] [data-render-state="idle"]')
    ).toHaveAttribute("data-slot", "clip-indicator");

    const readoutSwitch = page.locator('[data-contract="readout-switch"]');
    const liveReadout = readoutSwitch.locator('[data-slot="db-readout"]');
    await expect(liveReadout).toHaveText("−∞ dB");
    await readoutSwitch.getByRole("button", { name: "Emit" }).click();
    await expect(liveReadout).toHaveText("−12.0 dB");
    const sourceNode = await liveReadout.elementHandle();
    await readoutSwitch.getByRole("button", { name: "Value" }).click();
    await expect(liveReadout).toHaveText("−6.0 dB");
    expect(await sourceNode?.evaluate((node) => node.isConnected)).toBe(false);
    await readoutSwitch.getByRole("button", { name: "Source" }).click();
    await expect(liveReadout).toHaveText("−∞ dB");

    await expect(
      page.locator("[source], [floordb], [mindb], [maxdb], [taper], [render]")
    ).toHaveCount(0);

    const microphoneIcon = page
      .locator('[data-example="level-meter-microphone"] svg')
      .first();
    await expect(microphoneIcon).toHaveAttribute(
      "xmlns",
      "http://www.w3.org/2000/svg"
    );
    expect(failures).toEqual([]);
  });
};
