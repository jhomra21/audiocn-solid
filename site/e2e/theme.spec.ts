import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "audiocn-appearance";

const isDark = (page: Page) =>
  page.locator("html").evaluate((root) => root.classList.contains("dark"));

// The hotkey exists only once the page has hydrated, so the first press is
// retried until it takes effect. A second subscription would toggle twice per
// press and never reach the expected state.
const pressUntil = async (page: Page, dark: boolean) => {
  const before = await isDark(page);

  await expect
    .poll(async () => {
      await page.keyboard.press("d");

      return isDark(page);
    })
    .toBe(dark);
  expect(before).toBe(!dark);
};

test("D toggles light and dark once per press, across client navigation", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  await pressUntil(page, true);

  await page.keyboard.press("d");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.keyboard.press("D");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.locator('a[href="/docs/components/mixer"]').first().click();
  await expect(page).toHaveURL(/\/docs\/components\/mixer$/);
  await page.keyboard.press("d");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.keyboard.press("d");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.goto("/contributors");
  await pressUntil(page, false);
});

test("D is ignored while typing or with a modifier key", async ({ page }) => {
  await page.goto("/docs/components/knob");
  await pressUntil(page, true);
  await page.keyboard.press("d");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.keyboard.press("Control+d");
  await page.keyboard.press("Alt+d");
  await page.keyboard.press("Meta+d");
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await page.keyboard.press("Control+k");

  const input = page.getByRole("searchbox");

  await input.focus();
  await page.keyboard.type("dd");
  await expect(input).toHaveValue("dd");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("the chosen appearance persists and overrides the system preference", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/docs/components/knob");
  await expect(page.locator("html")).toHaveClass(/dark/);

  await pressUntil(page, false);
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY))
    .toBe("light");

  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("a saved or system appearance applies before the app hydrates", async ({
  page,
}) => {
  await page.route("**/assets/*.js", (route) => route.abort());

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await isDark(page)).toBe(true);

  await page.evaluate((key) => localStorage.setItem(key, "light"), STORAGE_KEY);
  await page.reload();
  expect(await isDark(page)).toBe(false);

  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate((key) => localStorage.setItem(key, "dark"), STORAGE_KEY);
  await page.reload();
  expect(await isDark(page)).toBe(true);
});
