import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { readPrerenderedRoutes } from "../scripts/prerendered-routes";

const artifactPath = join(import.meta.dirname, "../artifacts/routes.json");

test("prerendered routes have content and a recorded status", async ({
  page,
}) => {
  const routes = await readPrerenderedRoutes();

  for (const { html, items, page: pageMarker, route } of routes) {
    if (route === "/") {
      expect(html.match(/data-slot="showcase-card"/g)).toHaveLength(14);
      expect(html.match(/data-slot="skeleton"/g)).toHaveLength(14);
    }

    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
    expect(body.trim(), `${route} has an empty prerendered body`).not.toBe("");
    expect(body, `${route} has a caught SSR preview failure`).not.toMatch(
      /\sdata-docs-ssr-error=/
    );
    expect(
      html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1],
      `${route} has a literal JSX title`
    ).not.toMatch(/\$\{|`/);

    if (route.startsWith("/docs/")) {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();

      if (pageMarker) {
        await expect(
          page.locator(
            "[data-docs-route-not-yet-ported], [data-route-not-yet-ported]"
          )
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Read the upstream documentation" })
        ).toBeVisible();
      } else {
        await expect(page.locator("[data-not-yet-ported]")).toHaveCount(
          items.length
        );
      }
    }
  }

  await mkdir(join(import.meta.dirname, "../artifacts"), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(
      routes.map(({ items, page: pageMarker, route }) => ({
        notPorted: items,
        route,
        status: pageMarker
          ? "not-yet-ported"
          : items.length > 0
            ? "partially-ported"
            : "ported",
      })),
      null,
      2
    )}\n`
  );
});
