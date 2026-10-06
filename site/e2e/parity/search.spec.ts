import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { inspectOpenSearch, openSearchMenu } from "./search";

for (const viewport of [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`opened idle search compares every group, icon, swatch, hint and current theme at ${viewport.width}`, async ({
    page,
  }, info) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.setViewportSize(viewport);
    const directory = join(import.meta.dirname, "../../../artifacts/search");
    await mkdir(directory, { recursive: true });
    await page.goto("https://audiocn.dev/docs/components/knob");
    await openSearchMenu(page);
    const upstream = await inspectOpenSearch(page);
    await page.screenshot({
      path: join(directory, `upstream-${viewport.width}.png`),
    });
    await info.attach("upstream-open-search", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.goto("/docs/components/knob");
    await openSearchMenu(page);
    const local = await inspectOpenSearch(page);
    await page.screenshot({
      path: join(directory, `local-${viewport.width}.png`),
    });
    await writeFile(
      join(directory, `contract-${viewport.width}.json`),
      JSON.stringify({ upstream, local }, null, 2)
    );
    await info.attach("local-open-search", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await info.attach("opened-search-contract", {
      body: JSON.stringify({ upstream, local }, null, 2),
      contentType: "application/json",
    });
    expect(local).toEqual(upstream);
  });
}

for (const mutation of [
  "group",
  "icon",
  "swatch",
  "hint",
  "current",
  "label",
] as const) {
  test(`opened search comparison detects a missing ${mutation}`, async ({
    page,
  }) => {
    await page.goto("/docs/components/knob");
    await openSearchMenu(page);
    const before = await inspectOpenSearch(page);
    await page.getByRole("dialog").evaluate((dialog, change) => {
      const selectors = {
        group: "h3",
        icon: '[data-item-index="0"] svg',
        swatch: "[data-swatch]",
        hint: "kbd",
        current: '[aria-label="Current theme"]',
        label: '[data-item-index="0"] span span',
      };

      const element = dialog.querySelector(selectors[change]);

      if (!element)
        throw new Error(`Missing search mutation target: ${change}`);
      element.remove();
    }, mutation);
    expect(await inspectOpenSearch(page)).not.toEqual(before);
  });
}
