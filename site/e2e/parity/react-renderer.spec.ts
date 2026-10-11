import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { sitemapRoutes } from "./sitemap";

const referenceURL = process.env.AUDIOCN_REACT_BASELINE;

const sourceRoot = process.env.AUDIOCN_UPSTREAM_SOURCE;

const artifacts = join(
  import.meta.dirname,
  "../../../artifacts/react-solid-fidelity"
);

const inspect = (page: Page) =>
  page.evaluate(() => {
    const properties = [
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "letter-spacing",
      "color",
      "background-color",
      "border-radius",
      "border-width",
      "border-color",
      "padding",
      "gap",
      "box-shadow",
      "outline",
      "opacity",
      "display",
      "align-items",
      "justify-content",
      "stroke-width",
    ];

    const measureElement = (element: Element) => {
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();

      return {
        width: Math.round(bounds.width * 100) / 100,
        height: Math.round(bounds.height * 100) / 100,
        style: Object.fromEntries(
          properties.map((name) => [name, style.getPropertyValue(name)])
        ),
      };
    };

    const svg = (element: Element) => ({
      ...measureElement(element),
      viewBox: element.getAttribute("viewBox"),
      fill: element.getAttribute("fill"),
      stroke: element.getAttribute("stroke"),
      geometry: [
        ...element.querySelectorAll(
          "path, circle, rect, line, polyline, polygon, ellipse"
        ),
      ].map((part) => ({
        tag: part.tagName,
        attributes: Object.fromEntries(
          [...part.attributes].flatMap(({ name, value }) =>
            !name.startsWith("_") && !["class", "style", "id"].includes(name)
              ? [[name, value]]
              : []
          )
        ),
      })),
    });

    const inspectRoot = (root: Element) => {
      const slots: Record<string, ReturnType<typeof measureElement>[]> = {};

      for (const node of [root, ...root.querySelectorAll("[data-slot]")]) {
        const name = node.getAttribute("data-slot");

        if (!name) continue;
        (slots[name] ??= []).push(measureElement(node));
      }

      return {
        bounds: measureElement(root),
        slots,
        glyphs: [...root.querySelectorAll("svg")].map(svg),
        controls: [
          ...root.querySelectorAll(
            'button, [role="slider"], [role="switch"], [role="combobox"], input:not([aria-hidden="true"])'
          ),
        ].map((node) => ({
          slot: node.getAttribute("data-slot"),
          label: node.getAttribute("aria-label"),
          role: node.getAttribute("role"),
          disabled: node.hasAttribute("disabled"),
          checked: node.getAttribute("aria-checked"),
          expanded: node.getAttribute("aria-expanded"),
          value: node.getAttribute("aria-valuenow"),
          minimum: node.getAttribute("aria-valuemin"),
          maximum: node.getAttribute("aria-valuemax"),
          ...measureElement(node),
        })),
        canvases: [...root.querySelectorAll("canvas")].map(measureElement),
      };
    };

    const main =
      document.querySelector("main main") ??
      document.querySelector("main") ??
      document.body;

    return {
      theme: document.documentElement.className,
      overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      gaps: [
        ...document.querySelectorAll(
          "[data-not-yet-ported], [data-docs-ssr-error], [data-docs-route-unavailable]"
        ),
      ].map((node) => node.outerHTML),
      headings: [...main.querySelectorAll("h1, h2, h3")].map((node) => ({
        text: node.textContent?.replace("Copy Anchor Link", "").trim(),
        ...measureElement(node),
      })),
      previews: [
        ...document.querySelectorAll('[data-slot="component-preview"]'),
      ].map(inspectRoot),
      tiles: [...document.querySelectorAll('[data-slot="showcase-card"]')].map(
        inspectRoot
      ),
      chrome: {
        header: document.querySelector("header")
          ? inspectRoot(document.querySelector("header")!)
          : null,
        footer: document.querySelector("footer")
          ? inspectRoot(document.querySelector("footer")!)
          : null,
      },
    };
  });

type MeasurementValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MeasurementValue[]
  | { [field: string]: MeasurementValue };

const differences = (
  upstream: MeasurementValue,
  local: MeasurementValue,
  field = ""
): { field: string; upstream: MeasurementValue; local: MeasurementValue }[] => {
  if (JSON.stringify(upstream) === JSON.stringify(local)) return [];

  if (
    upstream !== null &&
    local !== null &&
    // The measured JSON contract includes both leaf values and nested records.
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    typeof upstream === "object" &&
    // oxlint-disable-next-line anti-slop/no-runtime-typeof
    typeof local === "object"
  ) {
    const left = new Map<string, MeasurementValue>(Object.entries(upstream));
    const right = new Map<string, MeasurementValue>(Object.entries(local));

    return [...new Set([...left.keys(), ...right.keys()])].flatMap((key) =>
      differences(left.get(key), right.get(key), `${field}.${key}`)
    );
  }

  return [{ field, upstream, local }];
};

for (const width of [390, 1280]) {
  for (const theme of ["light", "dark"] as const) {
    test(`measure pinned React renderer: ${width}px ${theme}`, async ({
      browser,
      baseURL,
    }, info) => {
      test.skip(
        !referenceURL || !sourceRoot,
        "Requires the pinned React renderer and its extracted source tree."
      );
      test.setTimeout(1_800_000);
      await mkdir(artifacts, { recursive: true });

      const routes = sitemapRoutes(
        await readFile(
          join(import.meta.dirname, "../../dist/client/sitemap.xml"),
          "utf8"
        )
      );

      const upstreamSitemap = await fetch(`${referenceURL}/sitemap.xml`);
      expect(upstreamSitemap.ok).toBe(true);
      expect(sitemapRoutes(await upstreamSitemap.text())).toEqual(routes);
      expect(routes).toHaveLength(57);

      const contexts = await Promise.all(
        [referenceURL!, baseURL!].map(() =>
          browser.newContext({
            viewport: { width, height: 844 },
            colorScheme: theme,
          })
        )
      );

      for (const context of contexts) {
        await context.addInitScript((mode) => {
          localStorage.setItem("theme", mode);
          localStorage.setItem("packageManager", '"pnpm"');
        }, theme);
      }

      const pages = await Promise.all(
        contexts.map((context) => context.newPage())
      );

      const report = [];
      let sensitivity: unknown;

      for (const route of routes) {
        const slug =
          route === "/" ? "home" : route.slice(1).replaceAll("/", "-");

        const captures = [];

        for (const [index, origin] of [referenceURL!, baseURL!].entries()) {
          const page = pages[index];
          const response = await page.goto(`${origin}${route}`);
          expect(response?.status(), `${origin}${route}`).toBe(200);
          await page.evaluate(() => document.fonts.ready);
          await page.waitForFunction(
            () =>
              Boolean(document.querySelector("main h1")) &&
              (!window._$HY || window._$HY.done)
          );

          if (route === "/") {
            for (const card of await page
              .locator('[data-slot="showcase-card"]')
              .all()) {
              await card.scrollIntoViewIfNeeded();
              await expect(card.locator('[data-slot="skeleton"]')).toHaveCount(
                0
              );
            }

            await page.evaluate(() => scrollTo(0, 0));
          } else {
            // React discovers live channel counts only once demos become visible.
            // Inspect mounted examples on both sides, not React's silent fallback.
            for (const preview of await page
              .locator('[data-slot="component-preview"]')
              .all()) {
              await preview.scrollIntoViewIfNeeded();
              await page.evaluate(
                () =>
                  new Promise<void>((resolve) =>
                    requestAnimationFrame(() =>
                      requestAnimationFrame(() => resolve())
                    )
                  )
              );
            }

            await page.evaluate(() => scrollTo(0, 0));
          }

          await expect(
            page.locator('[data-slot="waveform-skeleton"]')
          ).toHaveCount(0);
          const measurement = await inspect(page);
          expect(measurement.gaps).toEqual([]);
          const screenshot = `${slug}-${index === 0 ? "react" : "solid"}-${width}-${theme}.png`;
          await page.screenshot({
            path: join(artifacts, screenshot),
            fullPage: true,
          });
          captures.push({ origin, screenshot, measurement });
        }

        if (!sensitivity) {
          const before = await inspect(pages[1]);
          await pages[1]
            .locator('[data-slot="showcase-card"] > a svg')
            .first()
            .evaluate((node) => {
              node.setAttribute("viewBox", "0 0 99 99");
              node.setAttribute("style", "width:37px!important");
            });
          const corrupted = await inspect(pages[1]);
          const detected = differences(before, corrupted);
          expect(detected.some(({ field }) => field.endsWith("viewBox"))).toBe(
            true
          );
          expect(detected.some(({ field }) => field.endsWith("width"))).toBe(
            true
          );
          sensitivity = detected;
        }

        report.push({
          route,
          captures,
          differences: differences(
            captures[0].measurement,
            captures[1].measurement
          ),
        });
        await writeFile(
          join(artifacts, `measurements-${width}-${theme}.json`),
          JSON.stringify(
            {
              sourceCommit: "4234aa114b8696e2704db7825c1289cf74d1e4f2",
              sourceRoot,
              referenceURL,
              localURL: baseURL,
              width,
              theme,
              status: "MEASURED_NOT_ZERO_DRIFT_CERTIFIED",
              screenshotPolicy: "Paired captures, not asserted pixel goldens.",
              dynamicPolicy:
                "Animation, demo clocks and canvas pixels are not synchronized; their differences require deterministic fixtures before attribution.",
              compoundStates:
                "UNTESTED outside the separate interaction suites",
              sensitivity,
              report,
            },
            null,
            2
          )
        );
      }

      await info.attach(`renderer-measurements-${width}-${theme}`, {
        path: join(artifacts, `measurements-${width}-${theme}.json`),
        contentType: "application/json",
      });
      await Promise.all(contexts.map((context) => context.close()));
    });
  }
}
