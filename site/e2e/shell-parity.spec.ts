import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

const artifactDirectory = join(import.meta.dirname, "../artifacts/shell");

test("capture upstream and local documentation shells", async ({
  page,
  baseURL,
}) => {
  await mkdir(artifactDirectory, { recursive: true });

  for (const [name, url] of [
    ["upstream", "https://www.audiocn.dev/docs/components/level-meter"],
    ["local", new URL("/docs/components/level-meter", baseURL).href],
  ] as const) {
    for (const [width, height, viewport] of [
      [1280, 900, "1280x900"],
      [390, 844, "390x844"],
    ] as const) {
      await page.setViewportSize({ height, width });
      await page.goto(url, { waitUntil: "networkidle" });
      await page.screenshot({
        fullPage: true,
        path: join(artifactDirectory, `${name}-level-meter-${viewport}.png`),
      });

      if (name === "local" && width === 1280) {
        await expect(
          page.getByRole("navigation", { name: "On this page" })
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Search ⌘ K", exact: true })
        ).toBeVisible();
      }
    }
  }
});
