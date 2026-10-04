import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const captureConsoleFailures = (page: Page) => {
  const failures: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") {
      failures.push(`${message.type()}: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  return failures;
};

const cases = [
  {
    description:
      "Solid audio components with matching Solid 1 and Solid 2 registry builds.",
    path: "/",
    title: "audiocn Solid",
  },
  {
    description:
      "A peak and RMS level meter with zones, peak hold, a scale, a readout and a clip light.",
    path: "/docs/components/level-meter",
    title: "Level Meter for Solid - audiocn Solid",
  },
] as const;

test("prerendered pages hydrate without warnings", async ({ page }) => {
  const failures = captureConsoleFailures(page);

  for (const current of cases) {
    await page.goto(current.path);

    await expect(page).toHaveTitle(current.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      current.description
    );
    await expect(
      page.locator('[data-slot="level-meter"]').first()
    ).toBeVisible();

    const channel = page.locator('[data-slot="level-meter-channel"]').first();

    await expect
      .poll(async () =>
        channel.evaluate((node) => node.style.getPropertyValue("--meter-level"))
      )
      .not.toBe("");
  }

  expect(failures).toEqual([]);
});
