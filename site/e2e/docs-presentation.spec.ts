import { expect, test } from "@playwright/test";

test("API properties disclose descriptions and defaults without a wide table", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const api = page.locator('[data-docs-component="props-table"]').first();
  const property = api.getByRole("button", { name: "min?", exact: true });
  await expect(property).toHaveAttribute("aria-expanded", "false");
  await property.click();
  await expect(property).toHaveAttribute("aria-expanded", "true");
  await expect(api).toContainText("Default");
  await expect(api).toContainText("-60");
  await property.focus();
  await page.keyboard.press("Enter");
  await expect(property).toHaveAttribute("aria-expanded", "false");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  await page.screenshot({ path: "artifacts/docs-api-mobile.png" });
});

test("preview tabs match the line-tab spacing and retain keyboard ownership", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const preview = page.locator('[data-example="fader-demo"]');
  const tabs = preview.getByRole("tablist");
  expect((await tabs.boundingBox())?.height).toBe(32);
  await preview.getByRole("tab", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    preview.getByRole("tab", { name: "Code", exact: true })
  ).toBeFocused();
  await expect(
    preview.getByRole("tab", { name: "Code", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(
    preview.getByRole("tab", { name: "Preview", exact: true })
  ).toBeFocused();
  await page.screenshot({ path: "artifacts/docs-preview-tabs.png" });
});

test("mobile TOC closes after choosing a heading and marks the active section", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/fader");
  const toggle = page.locator("[data-docs-toc-popover]");

  const trigger = page.getByRole("button", {
    name: "Installation",
    exact: true,
  });

  await trigger.click();
  const link = toggle.getByRole("link", { name: "Keyboard", exact: true });
  await link.click();
  await expect(
    page.getByRole("button", { name: "Keyboard", exact: true })
  ).toHaveAttribute("aria-expanded", "false");
  await expect(link).toBeHidden();
  await page.screenshot({ path: "artifacts/docs-toc-mobile.png" });
});

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

test("channel toggle examples render the upstream icons and all three variants", async ({
  page,
}) => {
  await page.goto("/docs/components/channel-toggle");

  const demo = page.locator(
    '[data-example="channel-toggle-demo"] [data-slot="component-preview"]'
  );

  await expect(demo.locator("svg")).toHaveCount(1);

  const variants = page.locator(
    '[data-example="channel-toggle-variants"] [data-slot="component-preview"]'
  );

  await expect(variants.getByRole("button")).toHaveCount(9);
  await expect(variants.locator("svg")).toHaveCount(3);

  const mute = variants
    .getByRole("button", { name: "Mute", exact: true })
    .first();

  await expect(mute).toHaveAttribute("aria-pressed", "true");
  await mute.click();
  await expect(mute).toHaveAttribute("aria-pressed", "false");
  await page.screenshot({
    path: "artifacts/docs-channel-toggle-variants.png",
    fullPage: true,
  });
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

test("electric and spectrum docs hydrate every example and expose real Solid source", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));

  for (const [name, count] of [
    ["electric-bar-visualizer", 6],
    ["electric-waveform", 5],
    ["spectrum", 3],
  ] as const) {
    await page.goto(`/docs/components/${name}`);
    await expect(page.locator("[data-not-yet-ported]")).toHaveCount(0);
    await expect(page.locator("[data-example]")).toHaveCount(count);
    const preview = page.locator(`[data-example="${name}-demo"]`);
    await expect(preview.locator("canvas").first()).toBeVisible();
    await preview.getByRole("tab", { name: "Code", exact: true }).click();
    await expect(preview.locator("pre")).toContainText("useDemoSignal");
    await expect(preview.locator("pre")).toContainText("class=");
    await page.screenshot({
      path: `artifacts/docs-${name}.png`,
      fullPage: true,
    });
  }

  for (const name of [
    "use-audio-player",
    "use-sound",
    "use-waveform-data",
    "use-web-audio-mixer",
  ]) {
    await page.goto(`/docs/hooks/${name}`);
    await expect(page.locator("[data-not-yet-ported]")).toHaveCount(0);
    await expect(
      page.locator("h2").filter({ hasText: "Returns" })
    ).toBeVisible();
  }

  expect(failures).toEqual([]);
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

test("playback and device docs hydrate working previews and real source", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));

  for (const [name, count] of [
    ["waveform", 3],
    ["track-list", 1],
    ["sound-pad", 2],
    ["audio-player", 2],
    ["audio-device-select", 2],
  ] as const) {
    await page.goto(`/docs/components/${name}`);
    await expect(page.locator("[data-not-yet-ported]")).toHaveCount(0);
    await expect(page.locator("[data-example]")).toHaveCount(count);
    const demo = page.locator(`[data-example="${name}-demo"]`);

    if (name === "audio-player") {
      const play = demo.getByRole("button", { name: "Play", exact: true });
      await expect(play).toBeEnabled();
      await play.click();
      await expect(demo.locator('[data-slot="audio-player"]')).toHaveAttribute(
        "data-playing",
        ""
      );
      await demo.getByRole("button", { name: "Pause", exact: true }).click();
    }

    if (name === "audio-device-select") {
      const states = page.locator(
        '[data-example="audio-device-select-states"]'
      );

      await states.getByRole("button", { name: /Shure MV7/ }).click();
      await expect(
        page.getByRole("option", { name: "Elgato Wave:3", exact: false })
      ).toHaveAttribute("aria-disabled", "true");
      await page
        .getByRole("option", { name: /MacBook Pro Microphone/ })
        .click();
      await expect(
        states.getByRole("button", { name: /MacBook Pro Microphone/ }).first()
      ).toBeVisible();
    }

    await demo.getByRole("tab", { name: "Code", exact: true }).click();
    await expect(demo.locator("pre")).toContainText("class=");
    await page.screenshot({
      path: `artifacts/docs-${name}.png`,
      fullPage: true,
    });
  }

  expect(failures).toEqual([]);
});
