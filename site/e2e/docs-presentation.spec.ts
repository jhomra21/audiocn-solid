import { expect, test } from "@playwright/test";

test("docs previews expose source and mixer console controls stay reactive", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/components/mixer");

  const preview = page.locator('[data-example="mixer-console"]');
  const strip = preview.locator('[data-slot="channel-strip"]').first();
  const mute = strip.getByRole("button", { name: "Mute", exact: true });
  const solo = strip.getByRole("button", { name: "Solo", exact: true });

  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await expect(strip).toHaveAttribute("data-muted", "");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await solo.click();
  await expect(solo).toHaveAttribute("aria-pressed", "true");
  await expect(strip).toHaveAttribute("data-solo", "");
  await solo.click();
  await expect(solo).toHaveAttribute("aria-pressed", "false");

  await expect(
    page.getByRole("navigation", { name: "On this page" }).locator("a")
  ).toHaveText([
    "Installation",
    "Usage",
    "Anatomy",
    "Examples",
    "Console",
    "Empty",
    "A complete mixer",
    "Behaviour",
    "API reference",
    "Mixer",
    "MixerChannels",
  ]);
  await preview.getByRole("tab", { name: "Code", exact: true }).click();
  await expect(preview.locator("pre")).toContainText("const MixerConsole");
  await expect(preview.locator("pre .line span").first()).toHaveAttribute(
    "style",
    /--shiki/
  );
  await preview.getByRole("button", { name: "Copy Text", exact: true }).click();
  await expect(
    preview.getByRole("button", { name: "Copied Text", exact: true })
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "const MixerConsole"
  );
  await preview.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(strip).toBeVisible();
  await page.screenshot({ path: "artifacts/docs-mixer-controls.png" });
});

test("existing meter utility examples have no missing registration markers", async ({
  page,
}) => {
  for (const name of ["clip-indicator", "db-readout", "db-scale"]) {
    await page.goto(`/docs/components/${name}`);
    await expect(page.locator("[data-not-yet-ported]")).toHaveCount(0);
    await expect(page.locator("[data-example]")).toHaveCount(2);
  }
});

test("docs sidebar, appearance and mobile navigation work without page overflow", async ({
  page,
}) => {
  await page.goto("/docs/components/level-meter");
  await expect(
    page.getByRole("navigation", { name: "Documentation" })
  ).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Documentation" });
  await expect(navigation.locator('[aria-current="page"]')).toHaveText(
    "Level Meter"
  );
  expect(
    await navigation
      .getByRole("link", { name: "Introduction", exact: true })
      .evaluate((link) => getComputedStyle(link).backgroundColor)
  ).toBe("rgba(0, 0, 0, 0)");
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("button", { name: "Collapse Sidebar" }).click();
  await expect(
    page.getByRole("navigation", { name: "Documentation" })
  ).toBeHidden();
  await page.getByRole("button", { name: "Expand Sidebar" }).click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("ocean");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  await page.getByRole("button", { name: "Toggle Theme", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Search docs", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.screenshot({ path: "artifacts/docs-sidebar-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open Sidebar", exact: true }).click();
  await expect(page.locator("#docs-sidebar-mobile")).toBeVisible();
  await page
    .getByRole("button", { name: "Close Sidebar", exact: true })
    .click();
  await expect(page.locator("#docs-sidebar-mobile")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  await page.screenshot({ path: "artifacts/docs-mobile-dark.png" });
});
