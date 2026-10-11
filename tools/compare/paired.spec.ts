import { createHash } from "node:crypto";
import { readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface FrameFixture {
  bands: number[];
  history: number[];
  historyStart: number;
  historyLength: number;
  historyUpdatedAt: number;
  historyIntervalMs: number;
  peakDb: number;
}

declare global {
  interface Window {
    paired: {
      ready: boolean;
      emit: (frame: FrameFixture) => void;
      dispose: () => void;
    };
  }
}

const openPair = async (pages: Page[], query: string, clock = false) => {
  for (const [index, page] of pages.entries()) {
    if (clock) {
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1);
    }

    await page.goto(`http://127.0.0.1:${index === 0 ? 4501 : 4502}/?${query}`);
    await expect
      .poll(() => page.evaluate(() => window.paired?.ready))
      .toBe(true);
    await page.evaluate(() => document.fonts.ready);

    if (clock) await page.clock.runFor(64);
  }
};

test("tabs default activation and unmatched string defaults follow pinned Base UI", async ({
  browser,
}, info) => {
  const pages = await Promise.all([browser.newPage(), browser.newPage()]);
  const evidence = [];

  for (const noDefault of [false, true]) {
    await openPair(pages, `family=tabs${noDefault ? "&no-default" : ""}`);
    const states = [];

    for (const page of pages) {
      const tabs = page.getByRole("tab");

      const selected = () =>
        tabs.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("aria-selected"))
        );

      const initial = await selected();
      await tabs.first().focus();
      await page.keyboard.press("ArrowRight");
      await expect(tabs.nth(1)).toBeFocused();
      const afterArrow = await selected();
      await page.keyboard.press("Enter");
      const afterEnter = await selected();
      states.push({ initial, afterArrow, afterEnter });
    }

    evidence.push({ noDefault, states });
    expect.soft(states[1]).toEqual(states[0]);
  }

  await info.attach("tabs-default-paired.json", {
    body: JSON.stringify(evidence),
    contentType: "application/json",
  });
  await Promise.all(pages.map((page) => page.close()));
});

test("prevented popover trigger keeps the paired popup closed", async ({
  browser,
}, info) => {
  const pages = await Promise.all([browser.newPage(), browser.newPage()]);
  const evidence = [];

  for (const native of [false, true]) {
    await openPair(pages, `family=popover${native ? "&native" : ""}`);
    const states = [];

    for (const page of pages) {
      await page.getByRole("button", { name: "Prevent opening" }).click();
      states.push(await page.locator('[data-slot="popover-content"]').count());
    }

    evidence.push({ native, states });
    expect.soft(states).toEqual(native ? [1, 1] : [0, 0]);
  }

  await info.attach("popover-prevented-paired.json", {
    body: JSON.stringify(evidence),
    contentType: "application/json",
  });
  await Promise.all(pages.map((page) => page.close()));
});

test("actual contributor owners agree with identical fixture data, glyphs and accessible suffix", async ({
  browser,
}, info) => {
  const pages = await Promise.all([browser.newPage(), browser.newPage()]);
  const evidence = [];

  for (const width of [320, 760]) {
    for (const commits of [1, 1234]) {
      await openPair(
        pages,
        `family=contributor&width=${width}&commits=${commits}`
      );
      const states = [];

      for (const page of pages) {
        const card = page.locator('a[href="https://github.com/fixture-user"]');
        states.push(
          await card.evaluate((node) => {
            const svg = node.querySelector("svg");

            return {
              accessibleSuffix: node
                .querySelector(".sr-only")
                ?.textContent?.trim(),
              glyph: svg
                ? {
                    viewBox: svg.getAttribute("viewBox"),
                    path: svg.querySelector("path")?.getAttribute("d"),
                    width: getComputedStyle(svg).width,
                    height: getComputedStyle(svg).height,
                  }
                : null,
              width: node.getBoundingClientRect().width,
              height: node.getBoundingClientRect().height,
              badge: node
                .querySelector('[data-slot="badge"]')
                ?.textContent?.trim(),
            };
          })
        );
      }

      evidence.push({ width, commits, states });
      expect.soft(states[1]).toEqual(states[0]);
    }
  }

  await info.attach("contributors-identical-fixtures.json", {
    body: JSON.stringify(evidence),
    contentType: "application/json",
  });
  await Promise.all(pages.map((page) => page.close()));
});

const painterCases = [
  ["electric-bars", "bars", "static"],
  ["electric-waveform", "line", "static"],
  ["smooth", "line", "static"],
  ["smooth", "line", "scrolling"],
  ["live", "bars", "static"],
  ["live", "line", "static"],
  ["live", "mirror", "static"],
  ["spectrum", "bars", "static"],
  ["spectrum", "line", "static"],
  ["spectrum", "area", "static"],
] as const;

const pixels = (page: Page) =>
  page.locator("canvas").evaluateAll((nodes) =>
    nodes.map((canvas) => {
      const context = canvas.getContext("2d")!;

      return {
        width: canvas.width,
        height: canvas.height,
        rgba: [...context.getImageData(0, 0, canvas.width, canvas.height).data],
      };
    })
  );

for (const [family, variant, mode] of painterCases) {
  test(`deterministic backing pixels: ${family}/${variant}/${mode}`, async ({
    browser,
  }, info) => {
    const pages = await Promise.all([browser.newPage(), browser.newPage()]);
    await openPair(
      pages,
      `family=${family}&variant=${variant}&mode=${mode}`,
      true
    );
    const evidence = [];

    const payload: FrameFixture = {
      bands: [0.1, 0.4, 0.8, 0.6, 0.2, 0.9, 0.3, 0.7],
      history: [0.2, 0.8, 0.4, 0.7, 0.1, 0.9, 0.5, 0.3],
      historyStart: 0,
      historyLength: 8,
      historyUpdatedAt: 65,
      historyIntervalMs: 50,
      peakDb: -6,
    };

    for (const state of ["signal", "changed-signal"] as const) {
      if (state === "changed-signal")
        payload.bands = payload.bands.map((value) => 1 - value);
      const frames = [];

      for (const page of pages) {
        await page.evaluate((frame) => window.paired.emit(frame), payload);
        await page.clock.runFor(256);
        frames.push(await pixels(page));
      }

      expect(frames[0].length).toBeGreaterThan(0);
      expect(frames[1].map(({ width, height }) => [width, height])).toEqual(
        frames[0].map(({ width, height }) => [width, height])
      );

      const equal = frames[1].every((frame, index) =>
        Buffer.from(frame.rgba).equals(Buffer.from(frames[0][index].rgba))
      );

      const hashes = frames.map((canvases) =>
        canvases.map((canvas) => ({
          width: canvas.width,
          height: canvas.height,
          sha256: createHash("sha256")
            .update(Buffer.from(canvas.rgba))
            .digest("hex"),
          nonzeroAlphaPixels: canvas.rgba.filter(
            (value, index) => index % 4 === 3 && value !== 0
          ).length,
        }))
      );

      expect(hashes[0].some((canvas) => canvas.nonzeroAlphaPixels > 0)).toBe(
        true
      );
      expect(hashes[1].some((canvas) => canvas.nonzeroAlphaPixels > 0)).toBe(
        true
      );
      evidence.push({
        state,
        payload: structuredClone(payload),
        hashes,
        equal,
      });
      expect.soft(equal, `${family} ${state} actual backing RGBA`).toBe(true);
    }

    // The assertion must detect a nonblank, one-pixel corruption of real paint.
    const before = await pixels(pages[1]);
    await pages[1]
      .locator("canvas")
      .first()
      .evaluate((canvas) => {
        const context = canvas.getContext("2d")!;
        context.fillStyle = "#ff00ff";
        context.fillRect(1, 1, 1, 1);
      });
    const mutated = await pixels(pages[1]);
    expect(
      Buffer.from(mutated[0].rgba).equals(Buffer.from(before[0].rgba))
    ).toBe(false);
    await info.attach(`${family}-${variant}-${mode}-backing-pixels.json`, {
      body: JSON.stringify({ evidence, mutationDetected: true }),
      contentType: "application/json",
    });
    await Promise.all(pages.map((page) => page.close()));
  });
}

const referenceRoot = process.env.AUDIOCN_UPSTREAM_SOURCE;

const exampleNames = readdirSync(
  resolve(import.meta.dirname, "../../components/examples")
)
  .filter(
    (name) =>
      name.endsWith(".tsx") &&
      referenceRoot &&
      existsSync(resolve(referenceRoot, "components/examples", name))
  )
  .map((name) => name.slice(0, -4))
  .sort();

for (const name of exampleNames) {
  test(`actual example idle glyph/material contract: ${name}`, async ({
    browser,
  }, info) => {
    const pages = await Promise.all([browser.newPage(), browser.newPage()]);
    const errors: string[] = [];

    for (const page of pages)
      page.on("pageerror", (error) => errors.push(error.message));
    await openPair(pages, `name=${name}`, true);

    // Offline synthesis finishes outside the fake animation clock. Assert the
    // actual player exists before comparing paint, rather than its placeholder.
    if (name === "music-player-demo") {
      for (const page of pages) {
        await expect(page.locator('[data-slot="audio-player"]')).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
      }
    }

    const captures = [];

    for (const page of pages) {
      await page.clock.runFor(256);
      captures.push(
        await page.locator("#root").evaluate((root) => {
          interface GlyphGeometry {
            tag: string;
            attributes: [string, string | GlyphGeometry][];
            children: GlyphGeometry[];
          }

          const geometry = (part: Element): GlyphGeometry => ({
            tag: part.tagName,
            attributes: [...part.attributes]
              .flatMap<[string, string | GlyphGeometry]>(({ name, value }) => {
                if (["class", "id", "xmlns"].includes(name)) return [];
                const id = value.match(/^url\(#(.+)\)$/)?.[1];

                if (!id) return [[name, value]];
                const target = document.getElementById(id);

                if (!target)
                  throw new Error(`Broken SVG paint reference: ${id}`);

                return [[name, geometry(target)]];
              })
              .sort(([a], [b]) => String(a).localeCompare(String(b))),
            children: [...part.children].map(geometry),
          });

          const glyphs = [...root.querySelectorAll("svg")].map((svg) => ({
            viewBox: svg.getAttribute("viewBox"),
            width: getComputedStyle(svg).width,
            height: getComputedStyle(svg).height,
            geometry: [...svg.children].flatMap((part) =>
              part.tagName === "defs" ? [] : [geometry(part)]
            ),
          }));

          const material = [...root.querySelectorAll("[data-slot]")].flatMap(
            (node) => {
              if (
                node.closest("svg") ||
                node
                  .getAttribute("data-slot")
                  ?.match(
                    /(?:bar$|hold$|fill$|value$|db-readout|clip-indicator|canvas)/
                  )
              )
                return [];
              const style = getComputedStyle(node);

              return [
                {
                  slot: node.getAttribute("data-slot"),
                  style: Object.fromEntries(
                    [
                      "border-radius",
                      "border-color",
                      "border-width",
                      "background-color",
                      "font-size",
                      "font-weight",
                      "line-height",
                      "padding",
                      "gap",
                    ].map((key) => [key, style.getPropertyValue(key)])
                  ),
                },
              ];
            }
          );

          return {
            glyphs,
            material,
            fonts: [...document.fonts].flatMap((font) =>
              font.status !== "loaded"
                ? []
                : [
                    {
                      family: font.family,
                      style: font.style,
                      weight: font.weight,
                    },
                  ]
            ),
            gaps: root.querySelectorAll(
              "[data-not-yet-ported], [data-docs-ssr-error]"
            ).length,
          };
        })
      );
    }

    await info.attach(`${name}-idle-paired.json`, {
      body: JSON.stringify({ captures, errors, clockMs: 321 }),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
    expect(captures[1].gaps).toBe(0);
    expect
      .soft(captures[1].glyphs, "actual SVG shapes and resolved paint targets")
      .toEqual(captures[0].glyphs);
    expect
      .soft(captures[1].material, "explicit stable owner material fields")
      .toEqual(captures[0].material);
    expect(captures[1].fonts).toEqual(captures[0].fonts);
    await Promise.all(pages.map((page) => page.close()));
  });
}
