import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

test("shared readout and level meter run under Solid 2", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-runtime="solid-2"]')).toBeVisible();

  const readouts = page.locator('[data-slot="db-readout"]');
  await expect(readouts).toHaveCount(3);
  await expect(readouts.nth(0)).toHaveText("−12.3 dB");
  await expect(readouts.nth(0)).toHaveAttribute("data-zone", "warn");

  await expect
    .poll(async () => readouts.nth(1).textContent())
    .not.toBe("−∞ dB");

  const meter = page.locator('[data-slot="level-meter"]');
  await expect(meter).toHaveCount(1);
  await expect(meter).toHaveAttribute("role", "meter");
  await expect(meter.locator('[data-slot="level-meter-segments"]')).toHaveCount(1);
  await expect(meter.locator('[data-slot="level-meter-bar"]')).toHaveCount(2);
  await expect(meter.locator('[data-slot="db-scale"]')).toHaveCount(1);
  const clip = meter.locator('[data-slot="clip-indicator"]');
  await expect(clip).toHaveCount(1);
  await expect(clip).toHaveAttribute("aria-label", "Meter clip status");
  await expect(clip).toHaveAttribute("type", "reset");
  await expect
    .poll(async () => clip.locator('[data-slot="clip-indicator-count"]').textContent())
    .toBe("1");

  const channel = meter.locator('[data-slot="level-meter-channel"]');
  await expect
    .poll(async () =>
      Number.parseFloat(
        await channel.evaluate((node) =>
          node.style.getPropertyValue("--meter-level")
        )
      )
    )
    .toBeGreaterThan(0);

  await expect
    .poll(async () => meter.getAttribute("aria-valuetext"))
    .not.toBeNull();

  const artifactDir = join("test-results", "solid2-artifacts");
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({
    path: join(artifactDir, "level-meter.png"),
    fullPage: true,
  });
});
