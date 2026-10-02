import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

test("shared dB readout runs under Solid 2", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('[data-runtime="solid-2"]')).toBeVisible();

  const readouts = page.locator('[data-slot="db-readout"]');
  await expect(readouts).toHaveCount(2);
  await expect(readouts.nth(0)).toHaveText("−12.3 dB");
  await expect(readouts.nth(0)).toHaveAttribute("data-zone", "warn");

  await expect
    .poll(async () => readouts.nth(1).textContent())
    .not.toBe("−∞ dB");

  const artifactDir = join("test-results", "solid2-artifacts");
  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({
    path: join(artifactDir, "db-readout.png"),
    fullPage: true,
  });
});
