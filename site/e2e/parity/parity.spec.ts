import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface PageMetrics {
  examples: number;
  headings: { level: number; text: string }[];
  slots: Record<string, number>;
}

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
  "/docs/hooks/use-clip-hold",
  "/docs/hooks/use-reduced-motion",
  "/docs/hooks/use-visibility",
  "/docs/hooks/use-audio-context",
  "/docs/hooks/use-audio-analyser",
  "/docs/hooks/use-microphone",
  "/docs/hooks/use-mixer",
] as const;

const artifactDirectory = join(import.meta.dirname, "../../artifacts/parity");

const allowlistPath = join(import.meta.dirname, "allowlist.json");

const parseAllowlist = (
  text: string
): { field: string; route: string; reason: string }[] => JSON.parse(text);

const allowlist = new Set<string>(
  parseAllowlist(await readFile(allowlistPath, "utf8")).map(
    ({ field, route }) => `${route}:${field}`
  )
);

const inspectPage = async (page: Page): Promise<PageMetrics> =>
  page.locator("body").evaluate((body) => {
    const main = body.querySelector("main") ?? body;

    const headings = [...main.querySelectorAll("h1, h2, h3")].flatMap(
      (heading) => {
        if (heading.closest("aside")) {
          return [];
        }

        const text = (heading.textContent ?? "")
          .replace("Copy Anchor Link", "")
          .trim();

        return {
          level: Number(heading.tagName.slice(1)),
          text,
        };
      }
    );

    const slots = [...main.querySelectorAll("[data-slot]")].reduce<
      Record<string, number>
    >((counts, element) => {
      const slot = element.getAttribute("data-slot") ?? "";
      counts[slot] = (counts[slot] ?? 0) + 1;

      return counts;
    }, {});

    return {
      examples: main.querySelectorAll('[data-slot="component-preview"]').length,
      headings,
      slots,
    };
  });

test("compare upstream and local page structure", async ({ page }) => {
  test.setTimeout(600_000);

  await mkdir(artifactDirectory, { recursive: true });
  await page.emulateMedia({ colorScheme: "light" });

  const summary = [];

  for (const route of routes) {
    const slug = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");

    const viewports = [
      { height: 900, name: "1280x900", width: 1280 },
      { height: 844, name: "390x844", width: 390 },
    ];

    const routeReport = [];

    for (const viewport of viewports) {
      await page.setViewportSize({
        height: viewport.height,
        width: viewport.width,
      });
      await page.goto(`https://www.audiocn.dev${route}`, {
        waitUntil: "domcontentloaded",
      });
      const upstream = await inspectPage(page);
      await page.screenshot({
        fullPage: true,
        path: join(artifactDirectory, `${slug}-upstream-${viewport.name}.png`),
      });

      await page.goto(`http://127.0.0.1:4180${route}`, {
        waitUntil: "domcontentloaded",
      });
      const local = await inspectPage(page);
      await page.screenshot({
        fullPage: true,
        path: join(artifactDirectory, `${slug}-local-${viewport.name}.png`),
      });

      const differences = [];

      if (
        JSON.stringify(upstream.headings) !== JSON.stringify(local.headings)
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

      if (upstream.examples !== local.examples) {
        differences.push({
          field: "examples",
          local: local.examples,
          upstream: upstream.examples,
        });
      }

      const unallowed = differences.filter(
        (difference) =>
          !allowlist.has(`${route}:${difference.field}`) &&
          !allowlist.has(`*:${difference.field}`)
      );

      routeReport.push({
        differences,
        unallowed: unallowed.length,
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

  expect(
    summary.filter(({ unallowed }) => unallowed > 0),
    "unallowlisted upstream/local structure differences"
  ).toEqual([]);
});
