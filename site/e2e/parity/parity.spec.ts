import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { readPrerenderedRoutes } from "../../scripts/prerendered-routes";
import allowlist from "./allowlist.json" with { type: "json" };
import { inspectPage } from "./metrics";

// Explicit comparison scope. Remaining prerendered routes are inventoried as gaps below.
const routes = [
  "/",
  "/docs",
  "/docs/installation",
  "/docs/concepts/decibels",
  "/docs/concepts/feeding-data",
  "/docs/concepts/theming",
  "/docs/concepts/accessibility",
  "/docs/concepts/custom-engine",
  "/docs/components",
  "/docs/components/level-meter",
  "/docs/components/db-scale",
  "/docs/components/db-readout",
  "/docs/components/clip-indicator",
  "/docs/components/bar-visualizer",
  "/docs/components/electric-bar-visualizer",
  "/docs/components/electric-waveform",
  "/docs/components/smooth-waveform",
  "/docs/components/live-waveform",
  "/docs/components/spectrum",
  "/docs/components/fader",
  "/docs/components/parameter-slider",
  "/docs/components/knob",
  "/docs/components/pan-control",
  "/docs/components/channel-toggle",
  "/docs/components/volume-control",
  "/docs/components/channel-strip",
  "/docs/components/mixer",
  "/docs/hooks/use-demo-signal",
  "/docs/hooks/use-frame-source",
  "/docs/hooks/use-level",
  "/docs/hooks/use-gain-node",
  "/docs/hooks/use-audio-devices",
  "/docs/hooks/use-system-audio",
  "/docs/hooks/use-audio-player",
  "/docs/hooks/use-sound",
  "/docs/hooks/use-waveform-data",
  "/docs/hooks/use-web-audio-mixer",
  "/docs/hooks/use-clip-hold",
  "/docs/hooks/use-reduced-motion",
  "/docs/hooks/use-visibility",
  "/docs/hooks/use-audio-context",
  "/docs/hooks/use-audio-analyser",
  "/docs/hooks/use-microphone",
  "/docs/hooks/use-mixer",
  "/docs/blocks",
] as const;

const artifactDirectory = join(import.meta.dirname, "../../artifacts/parity");

const expectedExamples = async (root: string, route: string) => {
  if (route === "/") return [];
  const relative = route.slice("/docs".length) || "/index";
  let path = join(root, "content/docs", `${relative.slice(1)}.mdx`);

  if (route === "/docs/components" || route === "/docs/blocks")
    path = join(root, `content${route}/index.mdx`);
  const source = await readFile(path, "utf8");

  return Array.from(
    source.matchAll(/<ComponentPreview\s+name="([^"]+)"/g),
    ([, name]) => name
  );
};

const capturePage = async (page: Page, url: string, path: string) => {
  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const metrics = await inspectPage(page);
    await page.screenshot({ fullPage: true, path });

    return { metrics, status: response?.status() ?? 0 };
  } catch (error) {
    return { error: String(error) };
  }
};

test("compare upstream and local page structure", async ({ page }) => {
  test.setTimeout(600_000);

  await mkdir(artifactDirectory, { recursive: true });
  await page.emulateMedia({ colorScheme: "light" });
  page.setDefaultNavigationTimeout(30_000);

  const summary = [];
  const routeInventory = await readPrerenderedRoutes();

  const gaps = routeInventory.flatMap(({ route, page, items }) =>
    page || items.length ? [{ route, page, items }] : []
  );

  await writeFile(
    join(artifactDirectory, "gaps.json"),
    JSON.stringify(
      {
        gaps,
        outsideComparisonScope: routeInventory
          .filter(
            ({ route }) => !routes.some((supported) => supported === route)
          )
          .map(({ route, page, items }) => ({ route, page, items })),
      },
      null,
      2
    )
  );

  for (const route of routes) {
    const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");

    const viewports = [
      { height: 900, name: "1280x900", width: 1280 },
      { height: 844, name: "390x844", width: 390 },
    ];

    const routeReport = [];

    const expected = await expectedExamples(
      join(import.meta.dirname, "../.."),
      route
    );

    const upstreamExpected = await expectedExamples(
      process.env.AUDIOCN_UPSTREAM_SOURCE ?? "/tmp/audiocn-ui-ref",
      route
    );

    for (const viewport of viewports) {
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });

      const upstreamCapture = await capturePage(
        page,
        `https://www.audiocn.dev${route}`,
        join(artifactDirectory, `${slug}-upstream-${viewport.name}.png`)
      );

      const localCapture = await capturePage(
        page,
        `http://127.0.0.1:4180${route}`,
        join(artifactDirectory, `${slug}-local-${viewport.name}.png`)
      );

      const differences = [];

      if (!upstreamCapture.metrics || !localCapture.metrics) {
        differences.push({
          field: "unavailableRoute",
          upstream: upstreamCapture.error,
          local: localCapture.error,
        });
        routeReport.push({
          differences,
          upstream: upstreamCapture,
          local: localCapture,
          expectedExamples: expected,
          upstreamExpectedExamples: upstreamExpected,
          unallowed: differences.length,
          viewport: viewport.name,
        });
        continue;
      }

      const upstream = upstreamCapture.metrics;
      const local = localCapture.metrics;

      if (upstreamCapture.status >= 400 || localCapture.status >= 400) {
        differences.push({
          field: "unavailableRoute",
          upstream: upstreamCapture.status,
          local: localCapture.status,
        });
      }

      if (JSON.stringify(upstreamExpected) !== JSON.stringify(expected)) {
        differences.push({
          field: "documentedExamples",
          upstream: upstreamExpected,
          local: expected,
        });
      }

      const normalizedHeadings = upstream.headings.flatMap((heading) => {
        const exception = allowlist.find(
          (entry) =>
            entry.route === route &&
            entry.upstream === heading.text &&
            entry.level === heading.level
        );

        return exception
          ? exception.local === null
            ? []
            : [{ ...heading, text: exception.local }]
          : [heading];
      });

      if (
        JSON.stringify(normalizedHeadings) !== JSON.stringify(local.headings)
      ) {
        differences.push({
          field: "headings",
          local: local.headings,
          upstream: upstream.headings,
        });
      }

      if (JSON.stringify(upstream.slots) !== JSON.stringify(local.slots)) {
        differences.push({
          field: "slots",
          local: local.slots,
          upstream: upstream.slots,
        });
      }

      if (
        JSON.stringify(upstream.examples) !== JSON.stringify(local.examples)
      ) {
        differences.push({
          field: "examples",
          local: local.examples,
          upstream: upstream.examples,
        });
      }

      if (JSON.stringify(upstream.content) !== JSON.stringify(local.content)) {
        differences.push({
          field: "content",
          upstream: upstream.content,
          local: local.content,
        });
      }

      if (local.overflow > 0) {
        differences.push({
          field: "overflow",
          upstream: upstream.overflow,
          local: local.overflow,
        });
      }

      if (JSON.stringify(upstream.layout) !== JSON.stringify(local.layout)) {
        differences.push({
          field: "layout",
          upstream: upstream.layout,
          local: local.layout,
        });
      }

      if (
        JSON.stringify(expected) !== JSON.stringify(local.registeredExamples)
      ) {
        differences.push({
          field: "registeredExamples",
          local: local.registeredExamples,
          upstream: expected,
        });
      }

      if (
        local.gaps.length ||
        local.examples.some((example) => !example.nonempty)
      ) {
        differences.push({ field: "gaps", local: local.gaps, upstream: [] });
      }

      routeReport.push({
        differences,
        local,
        upstream,
        expectedExamples: expected,
        upstreamExpectedExamples: upstreamExpected,
        unallowed: differences.length,
        viewport: viewport.name,
      });
    }

    await writeFile(
      join(artifactDirectory, `${slug}.json`),
      `${JSON.stringify({ route, results: routeReport }, null, 2)}\n`
    );
    summary.push({
      route,
      unallowed: routeReport.reduce(
        (count, result) => count + result.unallowed,
        0
      ),
    });
  }

  await writeFile(
    join(artifactDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`
  );

  expect
    .soft(
      gaps,
      "Known unported pages, examples and tiles remain parity gaps; see gaps.json"
    )
    .toEqual([]);

  expect(
    summary.filter(({ unallowed }) => unallowed > 0),
    "unallowlisted upstream/local structure differences"
  ).toEqual([]);
});
