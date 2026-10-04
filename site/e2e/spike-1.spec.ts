import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const captureConsoleFailures = (page: Page) => {
  const failures: string[] = [];

  page.on("console", (message) => {
    const type = message.type();
    const text = message.text();

    const isWebGlDriverNoise =
      type === "warning" &&
      text.includes("GL Driver Message") &&
      text.includes("GPU stall due to ReadPixels");

    if ((type === "warning" || type === "error") && !isWebGlDriverNoise) {
      failures.push(`${type}: ${text}`);
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
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    hasMeter: true,
    path: "/",
    title: "audiocn Solid",
  },
  {
    description: "Audio components for Solid, built the shadcn way.",
    hasMeter: false,
    path: "/docs",
    title: "Introduction - audiocn Solid",
  },
  {
    description:
      "Add the audiocn Solid registry to a shadcn project and install components with the shadcn CLI.",
    hasMeter: false,
    path: "/docs/installation",
    title: "Installation - audiocn Solid",
  },
  {
    description:
      "A peak and RMS level meter with zones, peak hold, a scale, a readout and a clip light.",
    hasMeter: true,
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

    if (current.hasMeter) {
      await expect(
        page.locator('[data-slot="level-meter"]').first()
      ).toBeVisible();

      const channel = page.locator('[data-slot="level-meter-channel"]').first();

      await expect
        .poll(async () =>
          channel.evaluate((node) =>
            node.style.getPropertyValue("--meter-level")
          )
        )
        .not.toBe("");
    }

    if (current.path === "/") {
      await expect(
        page.getByRole("heading", { name: "Audio UI, mixed and mastered." })
      ).toBeVisible();
      await expect(page.locator('[data-slot="showcase-card"]')).toHaveCount(14);
      await expect(page.locator("[data-not-yet-ported]")).toHaveCount(13);

      const heroCanvas = page.locator("[data-home-threads] canvas");

      await expect(heroCanvas).toBeVisible();
      await expect
        .poll(async () =>
          heroCanvas.evaluate((canvas) =>
            canvas instanceof HTMLCanvasElement ? canvas.width : 0
          )
        )
        .toBeGreaterThan(0);
      await expect
        .poll(async () =>
          heroCanvas.evaluate((canvas) =>
            canvas instanceof HTMLCanvasElement ? canvas.height : 0
          )
        )
        .toBeGreaterThan(0);

      await page.getByRole("button", { name: "Ocean" }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");

      await page.getByTestId("appearance-toggle").click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }

    if (current.path === "/docs") {
      await expect(
        page.getByRole("link", { name: "Introduction", exact: true })
      ).toHaveAttribute("aria-current", "page");
    }

    if (current.path === "/docs/installation") {
      await expect(
        page.getByRole("link", { name: "Installation", exact: true })
      ).toHaveAttribute("aria-current", "page");
    }

    if (current.path === "/docs/components/level-meter") {
      const docsNav = page.getByRole("navigation", {
        name: "Documentation",
      });

      await expect(docsNav).toBeVisible();
      await expect(
        docsNav.getByRole("link", { name: "Level Meter", exact: true })
      ).toHaveAttribute("aria-current", "page");

      await page.getByRole("button", { name: "Search docs" }).click();

      const dialog = page.getByRole("dialog", {
        name: "Search documentation",
      });

      await expect(dialog).toBeVisible();
      await dialog.getByRole("searchbox").fill("Level Meter");
      await expect(
        dialog.getByRole("link", { name: "Level Meter", exact: true })
      ).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  }

  expect(failures).toEqual([]);
});
