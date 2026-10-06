import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { siteConfig } from "../lib/site";

const clientDirectory = join(import.meta.dirname, "../dist/client");

test("the build ships a prerendered 404.html for the static host", async () => {
  const html = await readFile(join(clientDirectory, "404.html"), "utf8");

  expect(html).toContain("Page not found");
  expect(html).toContain('href="/docs"');
  expect(html).not.toContain("data-docs-ssr-error");
  // Like upstream, the not-found page inherits the root metadata plus noindex.
  expect(html).toContain(`>${siteConfig.title}</title>`);
  expect(html).toContain(`href="${siteConfig.url}" rel="canonical"`);
  expect(html).toContain(`content="${siteConfig.url}" property="og:url"`);
  expect(html).toContain('content="noindex" name="robots"');
});

test("unknown URLs render the not-found page", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse documentation" })
  ).toHaveAttribute("href", "/docs");
  await expect(page.getByRole("link", { name: "Go home" })).toHaveAttribute(
    "href",
    "/"
  );
  await expect(page.locator("[data-docs-route-unavailable]")).toHaveCount(0);

  await page.goto("/docs/missing-page");
  await expect(
    page.getByRole("heading", { level: 1, name: "Page not found" })
  ).toBeVisible();
  await expect(page.locator("[data-docs-route-unavailable]")).toHaveAttribute(
    "data-docs-route-unavailable",
    "/docs/missing-page"
  );
});

test("a failed route load shows the error state and retries", async ({
  page,
}) => {
  await page.goto("/");
  await page.route("**/assets/contributors-*.js", (route) => route.abort());
  await page
    .getByRole("navigation", { name: "Secondary" })
    .getByRole("link", { name: "Contributors" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Something went wrong" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse documentation" })
  ).toHaveAttribute("href", "/docs");

  await page.unroute("**/assets/contributors-*.js");

  // A failed dynamic import stays failed until the document reloads, so the
  // retry button must reload exactly once.
  const reloaded = page.waitForEvent("load");

  await page.getByRole("button", { name: "Try again" }).click();
  await reloaded;
  await expect(
    page.getByRole("heading", { level: 1, name: "Contributors" })
  ).toBeVisible();
});
