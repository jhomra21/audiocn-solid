import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const referenceURL = process.env.AUDIOCN_REACT_BASELINE;

const glyph = (icon: Locator) =>
  icon.evaluate((svg) => {
    const style = getComputedStyle(svg);

    return {
      width: style.width,
      height: style.height,
      viewBox: svg.getAttribute("viewBox"),
      fill: svg.getAttribute("fill"),
      stroke: svg.getAttribute("stroke"),
      geometry: [...svg.querySelectorAll("path, circle, rect, line")].map(
        (part) => ({
          tag: part.tagName,
          attributes: [...part.attributes].flatMap(({ name, value }) =>
            !name.startsWith("_") && name !== "class" ? [[name, value]] : []
          ),
        })
      ),
    };
  });

test("install copy glyphs match the pinned React renderer in all states", async ({
  browser,
  page,
}, info) => {
  test.skip(!referenceURL, "Requires the pinned React production renderer.");
  const reference = await browser.newPage();
  const measurements = [];

  for (const width of [390, 1280]) {
    await reference.setViewportSize({ width, height: 844 });
    await page.setViewportSize({ width, height: 844 });

    for (const state of ["idle", "done", "error"] as const) {
      for (const current of [reference, page]) {
        await current.addInitScript((result) => {
          Object.defineProperty(navigator, "clipboard", {
            configurable: true,
            value: {
              writeText: () =>
                result === "error"
                  ? Promise.reject(new Error("Clipboard denied"))
                  : Promise.resolve(),
            },
          });
        }, state);
      }

      await reference.goto(`${referenceURL}/docs/components/sound-pad`);
      await page.goto("/docs/components/sound-pad");
      await Promise.all(
        [reference, page].map((current) =>
          current.evaluate(() => document.fonts.ready)
        )
      );

      const reactCopy = reference
        .getByRole("button", {
          name: "Copy",
          exact: true,
        })
        .first();

      const solidCopy = page
        .locator('[data-docs-component="install-command"] button[aria-live]')
        .first();

      if (state !== "idle") {
        await reactCopy.click();
        await solidCopy.click();
        await expect(
          reactCopy.locator(`[data-slot="${state}-icon"]`)
        ).toBeVisible();
        await expect(
          solidCopy.locator(
            `[data-copy-icon="${state}"][data-copy-phase="static"]`
          )
        ).toBeVisible();
      }

      const upstream = await glyph(reactCopy.locator("svg").last());
      const local = await glyph(solidCopy.locator("svg").last());
      measurements.push({ width, state, upstream, local });
      expect(local).toEqual(upstream);
    }
  }

  await info.attach("pinned-react-copy-glyphs.json", {
    body: JSON.stringify({ referenceURL, measurements }, null, 2),
    contentType: "application/json",
  });
  await reference.close();
});

test("AI prompt uses shared animated feedback and gesture-safe async clipboard", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    let category = "auto";
    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: {
        get type() {
          return category;
        },
        set type(value: string) {
          category = value;
          events.push(`session:${value}:${navigator.userActivation.isActive}`);
        },
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items: ClipboardItem[]) => {
          events.push(`clipboard:${navigator.userActivation.isActive}`);
          const blob = await items[0].getType("text/plain");
          events.push(await blob.text());
          document.documentElement.dataset.aiCopyEvents =
            JSON.stringify(events);
        },
      },
    });
  });
  await page.route("**/docs/components/sound-pad.md", async (route) => {
    await route.fulfill({ body: "Pinned asynchronous prompt fixture" });
  });
  await page.goto("/docs/components/sound-pad");

  const copy = page.getByRole("button", {
    name: "Copy prompt for AI",
    exact: true,
  });

  await expect(copy.locator('[data-copy-icon="idle"] svg')).toHaveAttribute(
    "viewBox",
    "0 0 256 256"
  );
  await copy.click();
  await expect(copy.locator('[data-copy-icon="done"]')).toBeVisible();
  await expect(copy.locator('[data-copy-motion="spring"]')).toBeVisible();
  await expect(copy.locator('[data-copy-phase="static"]')).toHaveCount(1);

  const events = JSON.parse(
    (await page.locator("html").getAttribute("data-ai-copy-events"))!
  );

  expect(events).toEqual([
    "session:playback:true",
    "clipboard:true",
    "Pinned asynchronous prompt fixture",
  ]);
  await expect(copy.locator('[data-copy-icon="done"] svg')).toHaveAttribute(
    "viewBox",
    "0 0 256 256"
  );
  await expect(copy.locator('[data-copy-icon="idle"]')).toBeVisible();
  await info.attach("ai-prompt-gesture-feedback.json", {
    body: JSON.stringify(events),
    contentType: "application/json",
  });
});

for (const surface of [
  "select",
  "fader",
  "showcase-link",
  "mixer-play",
] as const) {
  test(`public ${surface} geometry matches pinned React`, async ({
    browser,
    page,
  }, info) => {
    test.skip(!referenceURL, "Requires the pinned React production renderer.");
    const reference = await browser.newPage();

    const route =
      surface === "select"
        ? "/docs/components/audio-device-select"
        : surface === "fader"
          ? "/docs/components/fader"
          : surface === "mixer-play"
            ? "/docs/blocks/system-audio-mixer"
            : "/";

    await reference.goto(`${referenceURL}${route}`);
    await page.goto(route);
    await Promise.all(
      [reference, page].map((current) =>
        current.evaluate(() => document.fonts.ready)
      )
    );

    const measurements = [];

    if (surface === "fader") {
      for (const width of [390, 1280]) {
        for (const current of [reference, page]) {
          await current.setViewportSize({ width, height: 844 });
        }

        const measure = (root: Locator) =>
          root.evaluateAll((nodes) =>
            nodes.map((node) => ({
              padding: getComputedStyle(node).padding,
              width: node.getBoundingClientRect().width,
              height: node.getBoundingClientRect().height,
              trackWidth: node
                .querySelector('[data-slot="fader-track"]')!
                .getBoundingClientRect().width,
              trackHeight: node
                .querySelector('[data-slot="fader-track"]')!
                .getBoundingClientRect().height,
            }))
          );

        const selector =
          '[data-slot="component-preview"] [data-slot="fader-control"]';

        const upstream = await measure(reference.locator(selector));
        const local = await measure(page.locator(selector));
        measurements.push({ width, upstream, local });
        expect(local).toEqual(upstream);
      }
    } else {
      const selector =
        surface === "select"
          ? '[data-slot="component-preview"] [data-slot="audio-device-select-trigger"] svg'
          : surface === "showcase-link"
            ? '[data-slot="showcase-card"] > a svg'
            : '[data-slot="component-preview"] button[aria-label="Play music"] svg';

      const upstream = await glyph(reference.locator(selector).first());
      const local = await glyph(page.locator(selector).first());
      measurements.push({ upstream, local });
      expect(local).toEqual(upstream);
    }

    await info.attach(`${surface}-pinned-react-geometry.json`, {
      body: JSON.stringify(measurements, null, 2),
      contentType: "application/json",
    });
    await reference.close();
  });
}

test("knob cap paint servers have unique instance-owned SVG IDs", async ({
  page,
}, info) => {
  await page.goto("/docs/components/knob");
  const caps = page.locator('[data-slot="knob-cap"]');
  await expect(caps).not.toHaveCount(0);

  const ids = await caps
    .locator("[id]")
    .evaluateAll((nodes) => nodes.map((node) => node.id));

  expect(new Set(ids).size).toBe(ids.length);

  const references = await caps.evaluateAll((nodes) =>
    nodes.flatMap((cap) =>
      [...cap.querySelectorAll("[fill], [filter]")].flatMap((part) =>
        ["fill", "filter"].flatMap((attribute) => {
          const value = part.getAttribute(attribute);
          const id = value?.match(/^url\(#(.+)\)$/)?.[1];

          return id
            ? [{ id, owned: Boolean(cap.querySelector(`#${CSS.escape(id)}`)) }]
            : [];
        })
      )
    )
  );

  expect(references.every(({ owned }) => owned)).toBe(true);
  await info.attach("knob-instance-paint-servers.json", {
    body: JSON.stringify({ ids, references }, null, 2),
    contentType: "application/json",
  });
});

test("open audio select uses pinned React popup and selected glyph styling", async ({
  browser,
  page,
}, info) => {
  test.skip(!referenceURL, "Requires the pinned React production renderer.");
  const reference = await browser.newPage();
  const captures = [];

  for (const current of [reference, page]) {
    await current.goto(
      `${current === reference ? referenceURL : ""}/docs/components/audio-device-select`
    );
    await current
      .locator('[data-slot="component-preview"]')
      .nth(1)
      .locator('[data-slot="audio-device-select-trigger"]')
      .first()
      .click();
    const popup = current.locator('[data-slot="audio-device-select-content"]');
    await expect(popup).toBeVisible();

    const style = await popup.evaluate((node) => {
      const css = getComputedStyle(node);

      const item = node.querySelector(
        '[data-slot="audio-device-select-item"]'
      )!;

      const itemCSS = getComputedStyle(item);

      return {
        radius: css.borderRadius,
        background: css.backgroundColor,
        itemRadius: itemCSS.borderRadius,
        itemPadding: itemCSS.padding,
      };
    });

    const selected = popup.locator('[role="option"][aria-selected="true"] svg');
    captures.push({ style, selectedGlyph: await glyph(selected) });
  }

  expect(captures[1]).toEqual(captures[0]);
  await info.attach("open-select-pinned-react-style.json", {
    body: JSON.stringify(captures, null, 2),
    contentType: "application/json",
  });
  await reference.close();
});

test("empty and loading audio device values match React placeholder colors", async ({
  browser,
  page,
}, info) => {
  test.skip(!referenceURL, "Requires the pinned React production renderer.");
  const reference = await browser.newPage();
  const captures = [];

  for (const current of [reference, page]) {
    await current.goto(
      `${current === reference ? referenceURL : ""}/docs/components/audio-device-select`
    );

    const colors = await current
      .locator('[data-slot="audio-device-select-trigger"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          color: getComputedStyle(node).color,
          valueColor: getComputedStyle(
            node.querySelector('[data-slot="audio-device-select-value"]')!
          ).color,
        }))
      );

    captures.push(colors);
  }

  expect(captures[1]).toEqual(captures[0]);
  await info.attach("device-select-placeholder-colors.json", {
    body: JSON.stringify(captures, null, 2),
    contentType: "application/json",
  });
  await reference.close();
});

test("a disappeared copy source does not cancel the prior feedback reset", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.goto("/docs/installation");

  const code = page
    .locator("figure")
    .filter({ has: page.locator("pre") })
    .first();

  const copy = code.getByRole("button");
  await copy.click();
  await expect(copy).toHaveAccessibleName("Copied Text");
  await code.locator('[role="region"]').evaluate((viewport) => {
    viewport.querySelector = () => null;
  });
  await copy.click();
  await expect(copy).toHaveAccessibleName("Copy Text");
});

test("AI actions menu matches React material and row geometry", async ({
  browser,
  page,
}, info) => {
  test.skip(!referenceURL, "Requires the pinned React production renderer.");
  const reference = await browser.newPage();
  const captures = [];

  for (const current of [reference, page]) {
    await current.goto(
      `${current === reference ? referenceURL : ""}/docs/components/sound-pad`
    );
    await current
      .getByRole("button", { name: "More actions for AI agents" })
      .click();
    const menu = current.getByRole("menu");

    const style = await menu.evaluate((node) => {
      const css = getComputedStyle(node);
      const item = node.querySelector('[role="menuitem"]')!;

      return {
        radius: css.borderRadius,
        background: css.backgroundColor,
        border: css.borderWidth,
        width: node.getBoundingClientRect().width,
        height: node.getBoundingClientRect().height,
        itemRadius: getComputedStyle(item).borderRadius,
        itemPadding: getComputedStyle(item).padding,
      };
    });

    captures.push(style);
  }

  expect(captures[1]).toEqual(captures[0]);
  await info.attach("ai-actions-menu-geometry.json", {
    body: JSON.stringify(captures, null, 2),
    contentType: "application/json",
  });
  await reference.close();
});
