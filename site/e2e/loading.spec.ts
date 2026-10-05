import { expect, test } from "@playwright/test";

test("home loads route chunks without downloading every highlighted docs source", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  const scripts = new Map<string, number>();
  page.on("response", async (response) => {
    if (
      response.request().resourceType() === "script" &&
      response.url().includes("/assets/")
    )
      scripts.set(response.url(), (await response.body()).byteLength);
  });
  await page.goto("/");
  await expect(page.locator('[data-slot="showcase-card"]')).toHaveCount(14);
  await page.getByTestId("appearance-toggle").click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  const initialScripts = [...scripts.values()].reduce(
    (sum, bytes) => sum + bytes,
    0
  );

  expect(initialScripts).toBeLessThan(1_000_000);

  for (const card of await page.locator('[data-slot="showcase-card"]').all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('[data-slot="skeleton"]')).toHaveCount(0);
  }

  // The upstream production CSS lowers neutral OKLCH tokens to Lab.
  // Keep colored pad accents from mixing in the neutral token's yellow hue.
  await page.getByTestId("appearance-toggle").click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  for (const [name, hue] of [
    ["Work, work", 30],
    ["Ding", 250],
  ] as const) {
    await expect
      .poll(() =>
        page.getByRole("button", { name, exact: true }).evaluate((node) => {
          const color = getComputedStyle(node).backgroundColor;
          const numbers = color.match(/[-\d.]+/g)!.map(Number);

          const angle = color.startsWith("oklch")
            ? numbers[2]
            : ((Math.atan2(numbers[2], numbers[1]) * 180) / Math.PI + 360) %
              360;

          return numbers[0] > 0.8 ? angle : null;
        })
      )
      .toBeCloseTo(hue, 0);
  }

  await page.getByRole("link", { name: "Docs", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Introduction", exact: true })
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Documentation" })
    .getByRole("link", { name: "Music Player", exact: true })
    .click();
  await expect(
    page.locator(
      '[data-example="music-player-demo"] [data-slot="audio-player"]'
    )
  ).toBeVisible();
  await expect(page.locator("[data-docs-ssr-error]")).toHaveCount(0);
  expect(failures).toEqual([]);
  await test.info().attach("initial-script-bytes", {
    body: JSON.stringify({ initialScripts, scripts: [...scripts] }, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({ path: "artifacts/loading-music-route.png" });
});
