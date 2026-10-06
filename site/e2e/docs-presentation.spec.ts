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

  const trigger = toggle.getByRole("button");

  await trigger.click();
  const link = toggle.getByRole("link", { name: "Keyboard", exact: true });
  await link.click();
  await expect(trigger).toHaveAccessibleName(/ Fader Keyboard$/);
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
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
  await page
    .locator("aside")
    .getByRole("button", { name: "Collapse Sidebar" })
    .click();
  await expect(page.locator("#nd-sidebar")).toHaveAttribute(
    "data-collapsed",
    "true"
  );
  await expect(page.locator("#nd-sidebar")).toHaveJSProperty("inert", true);
  await page
    .locator("[data-sidebar-panel]")
    .getByRole("button", { name: "Collapse Sidebar" })
    .click();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("ocean");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  await page.getByRole("button", { name: "Toggle Theme", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.screenshot({ path: "artifacts/docs-sidebar-dark.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open Sidebar", exact: true }).click();
  await expect(page.locator("#docs-sidebar-mobile")).toBeVisible();
  await page
    .locator("#docs-sidebar-mobile")
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

    if (name === "waveform") {
      await expect(
        demo.getByRole("slider", { name: "Night Drive" })
      ).toHaveAttribute("aria-valuemax", "19");
      await expect(demo.locator('[data-slot="waveform-skeleton"]')).toHaveCount(
        0
      );
    }

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

      await states.getByRole("combobox", { name: /Shure MV7/ }).click();
      await expect(
        page.getByRole("option", { name: "Elgato Wave:3", exact: false })
      ).toHaveAttribute("aria-disabled", "true");
      await page
        .getByRole("option", { name: /MacBook Pro Microphone/ })
        .click();
      await expect(
        states.getByRole("combobox", { name: /MacBook Pro Microphone/ }).first()
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

test("all six block docs hydrate controls and publish their actual Solid source", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));

  for (const [name, count] of [
    ["system-audio-mixer", 2],
    ["mic-setup", 1],
    ["system-audio-settings", 1],
    ["quick-audio-popover", 1],
    ["music-player", 2],
    ["soundboard", 1],
  ] as const) {
    await page.goto(`/docs/blocks/${name}`);
    await expect(page.locator("[data-not-yet-ported]")).toHaveCount(0);
    await expect(page.locator("[data-example]")).toHaveCount(count);
    const demo = page.locator(`[data-example="${name}-demo"]`);

    if (name === "system-audio-mixer") {
      await expect(
        demo.getByRole("switch", { name: "Capture system audio" })
      ).toBeEnabled();
      expect(
        await demo
          .locator('[data-slot="component-preview"]')
          .evaluate((node) => getComputedStyle(node).padding)
      ).toBe("24px");
      await demo.getByRole("tab", { name: "Console", exact: true }).click();
      expect(failures).toEqual([]);
      await expect(demo.locator('[data-slot="mixer"]')).toHaveAttribute(
        "data-orientation",
        "vertical"
      );
      await demo
        .getByRole("button", { name: "Mute Music", exact: true })
        .click();
      await expect(
        demo.getByRole("button", { name: "Mute Music", exact: true })
      ).toHaveAttribute("aria-pressed", "true");
    }

    if (name === "system-audio-settings") {
      await expect(
        demo.getByRole("switch", { name: "Capture system audio" })
      ).toBeEnabled();
      await expect(demo.locator('[data-slot="badge"]')).toHaveText("Off");
    }

    if (name === "music-player") {
      await expect(
        page.locator('[data-slot="waveform"][role="slider"]')
      ).toHaveCount(2);
      await expect(page.locator('[data-slot="waveform-skeleton"]')).toHaveCount(
        0
      );
    }

    if (name === "quick-audio-popover") {
      await demo
        .getByRole("button", { name: "Audio settings", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toContainText(
        "More audio settings"
      );
      await page.keyboard.press("Escape");
    }

    if (name === "soundboard") {
      const pad = demo.getByRole("button", { name: /Airhorn/ });
      await expect(pad).not.toHaveAttribute("data-loading");
      await pad.click();
      await expect(pad).toHaveAttribute("data-playing", "");
      await demo.getByRole("button", { name: "Stop all", exact: true }).click();
      await expect(pad).not.toHaveAttribute("data-playing");
    }

    await demo.getByRole("tab", { name: "Code", exact: true }).click();
    await expect(demo.locator("pre")).toContainText(
      `@/components/blocks/${name}/${name}`
    );
    await expect(
      page.locator('[data-docs-component="component-source"]').first()
    ).toContainText("solid-js");
    await page.screenshot({
      path: `artifacts/docs-block-${name}.png`,
      fullPage: true,
    });
  }

  expect(failures).toEqual([]);
});

test("docs publish adjacent page cards and full-width mixer layout", async ({
  page,
}) => {
  await page.goto("/docs/components/track-list");
  const adjacent = page.getByRole("navigation", { name: "Adjacent pages" });
  await expect(
    adjacent.getByRole("link", { name: /Audio Player/ })
  ).toHaveAttribute("href", "/docs/components/audio-player");
  await expect(
    adjacent.getByRole("link", { name: /Sound Pad/ })
  ).toHaveAttribute("href", "/docs/components/sound-pad");
  await adjacent.getByRole("link", { name: /Sound Pad/ }).click();
  await expect(page.locator("[data-docs-ssr-error]")).toHaveCount(0);
  await expect(
    page.locator('[data-example="sound-pad-demo"] [data-slot="sound-pad"]')
  ).toBeVisible();
  await page.goto("/docs/blocks/system-audio-mixer");
  await expect(page.locator("article")).toHaveAttribute("data-full", "true");
  expect(
    await page
      .locator("article")
      .evaluate((node) => Math.round(node.getBoundingClientRect().width))
  ).toBe(1012);
  await page.screenshot({ path: "artifacts/docs-full-width-mixer.png" });
});

test("install commands support keyboard package selection, persistence and copying", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/docs/components/fader");

  const install = page
    .locator('[data-docs-component="install-command"]')
    .first();

  await install.getByRole("tab", { name: "bun", exact: true }).click();
  await expect(install.getByRole("tabpanel")).toContainText(
    "bunx shadcn@latest add @audiocn-solid/fader"
  );
  await install.getByRole("button", { name: "Copy install command" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("bunx shadcn@latest add @audiocn-solid/fader");
  await page.goto("/docs/components/knob");
  const next = page.locator('[data-docs-component="install-command"]').first();
  await expect(
    next.getByRole("tab", { name: "bun", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await next.getByRole("tab", { name: "bun", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(
    next.getByRole("tab", { name: "pnpm", exact: true })
  ).toBeFocused();
  await expect(next.getByRole("tabpanel")).toContainText("pnpm dlx");
  await page.screenshot({ path: "artifacts/docs-install-tabs.png" });
});

test("track-list rows retain their native compound content after hydration", async ({
  page,
}) => {
  await page.goto("/docs/components/track-list");
  const preview = page.locator('[data-example="track-list-demo"]');
  await expect(
    preview.locator('[data-slot="track-list-item-content"]')
  ).toHaveCount(4);
  await expect(
    preview.locator('[data-slot="track-list-item-title"]').first()
  ).toHaveText("Night Drive");
  await expect(
    preview.locator('[data-slot="track-list-item-description"]')
  ).toHaveCount(4);
  await expect(
    preview.locator('[data-slot="track-list-item-duration"]').first()
  ).toHaveText("0:19");
  await page.screenshot({ path: "artifacts/docs-track-list-content.png" });
});

test("volume icons and device affordances survive production hydration", async ({
  page,
}) => {
  await page.goto("/docs/components/volume-control");

  const mute = page.locator(
    '[data-example="volume-control-demo"] [data-slot="volume-control-mute"]'
  );

  await expect(mute.locator("svg")).toHaveCount(4);
  await expect(mute.locator("svg:visible")).toHaveCount(1);
  await mute.click();
  await expect(mute).toHaveAttribute("data-level", "muted");
  await expect(mute.locator("svg:visible")).toHaveCount(1);
  await page.goto("/docs/components/audio-device-select");
  const liveDevice = page.locator('[data-example="audio-device-select-demo"]');
  await expect(liveDevice.getByRole("combobox")).not.toHaveAttribute(
    "data-loading"
  );
  await expect(liveDevice.getByRole("combobox")).toHaveText(
    "Select a microphone"
  );
  await liveDevice.getByRole("combobox").click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");

  const trigger = page
    .locator(
      '[data-example="audio-device-select-states"] [data-slot="audio-device-select-trigger"]'
    )
    .first();

  await expect(trigger.locator("svg")).toHaveCount(1);
  await trigger.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.screenshot({ path: "artifacts/docs-icon-affordances.png" });
});

test("demo meters follow gain, mute, solo and the master mix", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const fader = page.locator('[data-example="fader-with-meter"]');
  const gain = fader.getByRole("slider", { name: "Program gain", exact: true });
  await gain.focus();
  await page.keyboard.press("Home");
  await expect
    .poll(() =>
      fader
        .locator('[data-slot="level-meter-channel"]')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              Number(
                getComputedStyle(node).getPropertyValue("--meter-level")
              ) <= 0.001
          )
        )
    )
    .toBe(true);
  await page.keyboard.press("End");
  await expect
    .poll(() =>
      fader
        .locator('[data-slot="level-meter-channel"]')
        .evaluateAll((nodes) =>
          nodes.some(
            (node) =>
              Number(getComputedStyle(node).getPropertyValue("--meter-level")) >
              0.8
          )
        )
    )
    .toBe(true);
  await page.goto("/docs/components/channel-strip");
  const console = page.locator('[data-example="channel-strip-console"]');

  const levels = () =>
    console
      .locator('[data-slot="level-meter-channel"]')
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          Number(getComputedStyle(node).getPropertyValue("--meter-level"))
        )
      );

  await expect
    .poll(async () => (await levels()).some((value) => value > 0))
    .toBe(true);
  await console.getByRole("button", { name: "Solo Mic", exact: true }).click();
  await expect
    .poll(async () => (await levels()).slice(2))
    .toEqual([0, 0, 0, 0]);
  await console.getByRole("button", { name: "Mute Mic", exact: true }).click();
  await expect.poll(levels).toEqual([0, 0, 0, 0, 0, 0]);
  await page.goto("/docs/components/mixer");
  const mixer = page.locator('[data-example="mixer-demo"]');

  for (const button of await mixer.locator('[data-slot="mute-toggle"]').all())
    await button.click();
  await expect
    .poll(() =>
      mixer
        .locator('[data-slot="level-meter-channel"]')
        .evaluateAll((nodes) =>
          nodes.map((node) =>
            Number(getComputedStyle(node).getPropertyValue("--meter-level"))
          )
        )
    )
    .toEqual([0, 0, 0, 0, 0, 0, 0]);
  await page.screenshot({ path: "artifacts/docs-demo-meter-routing.png" });
});
