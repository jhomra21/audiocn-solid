import { expect, test } from "@playwright/test";

test("static search finds docs by title and body content", async ({ page }) => {
  const failures: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      failures.push(`${message.type()}: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    failures.push(`pageerror: ${error.message}`);
  });

  const indexRequest = page.waitForResponse((response) =>
    response.url().endsWith("/search-index.json")
  );

  await page.goto("/spikes/search");

  const dialog = page.getByRole("dialog", { name: "Search docs" });
  const input = page.getByTestId("search-input");
  const submit = page.getByTestId("search-submit");

  await expect(dialog).toBeVisible();

  await input.fill("Level Meter");
  await submit.click();

  const indexResponse = await indexRequest;

  expect(indexResponse.ok()).toBe(true);

  const resultLink = page.getByRole("link", { name: "Level Meter" });

  await expect(resultLink).toHaveAttribute(
    "href",
    "/docs/components/level-meter"
  );

  await input.fill("ballistics");
  await submit.click();

  await expect(resultLink).toBeVisible();

  expect(failures).toEqual([]);
});
