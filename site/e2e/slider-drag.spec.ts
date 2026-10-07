import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { dragSlider } from "../../e2e/slider-drag";
import { startStaticHost } from "./static-host";

let host: Awaited<ReturnType<typeof startStaticHost>>;

const results: unknown[] = [];

test.beforeAll(async () => {
  host = await startStaticHost(
    new URL("../dist/client", import.meta.url).pathname
  );
});

test.afterAll(async () => {
  await host.close();
  const artifacts = new URL("../../artifacts/", import.meta.url);
  await mkdir(artifacts, { recursive: true });
  await writeFile(
    new URL("slider-drag-regression.json", artifacts),
    JSON.stringify(results, null, 2)
  );
});

for (const route of ["/", "/docs/components/fader", "/docs/components/mixer"]) {
  test(`production sustained slider dragging ${route}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(host.origin + route);

    if (route === "/") {
      for (const [name, count] of [
        ["Mixer", 5],
        ["Faders", 3],
      ] as const) {
        const card = page.getByRole("article", { name, exact: true });

        await card.scrollIntoViewIfNeeded();
        await expect(card.locator('[data-slot="fader-thumb"]')).toHaveCount(
          count
        );
      }
    }

    const thumbs = page.locator(
      '[data-slot="fader-thumb"]:not([data-disabled])'
    );

    await expect(thumbs.first()).toBeVisible();
    const count = await thumbs.count();
    expect(count).toBeGreaterThan(0);

    for (let index = 0; index < count; index += 1) {
      for (const start of ["thumb", "track"] as const) {
        const thumb = thumbs.nth(index);

        const card = await thumb.evaluate((node) =>
          node
            .closest('[data-slot="showcase-card"]')
            ?.getAttribute("aria-label")
        );

        const path = await dragSlider(page, thumb, start);
        results.push({ route, card, index, ...path });
      }
    }
  });
}
