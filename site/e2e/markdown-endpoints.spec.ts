import { expect, test } from "@playwright/test";

import metadata from "../lib/docs/page-metadata.json" with { type: "json" };
import { siteConfig } from "../lib/site";

test("every docs page has equal static Markdown twins and no executable MDX wrappers", async ({
  request,
}, info) => {
  const verified: string[] = [];

  for (const page of metadata) {
    const response = await request.get(`${page.url}.md`);

    const endpoint = await request.get(
      `/llms.mdx${page.url.slice("/docs".length)}`
    );

    expect(response.status(), page.url).toBe(200);
    expect(endpoint.status(), page.url).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const markdown = await response.text();
    expect(await endpoint.text(), page.url).toBe(markdown);
    let marker = "";

    const prose = markdown
      .split("\n")
      .flatMap((line) => {
        const fence = /^(`{3,}|~{3,})/u.exec(line)?.[0];

        if (marker) {
          if (line.startsWith(marker)) marker = "";

          return [];
        }

        if (fence) {
          marker = fence;

          return [];
        }

        return [line];
      })
      .join("\n");

    expect(prose, page.url).not.toMatch(
      /<(?:ComponentPreview|PropsTable|Callout|Steps|Step|Tab|Tabs)\b/u
    );
    expect(markdown).toContain(`> Source: ${siteConfig.url}${page.url}`);
    expect(markdown).toMatch(/[^\n]\n$/u);

    if (
      page.url.startsWith("/docs/components/") ||
      page.url.startsWith("/docs/hooks/") ||
      page.url.startsWith("/docs/blocks/")
    ) {
      expect(markdown).toContain(`${siteConfig.url}/r/solid2/{name}.json`);
      expect(markdown).not.toContain("npx shadcn@latest add @audiocn/");
      expect(markdown).not.toContain("@base-ui/react");
      expect(markdown).not.toContain("React 19");
    }

    verified.push(page.url);
  }

  expect(verified).toHaveLength(55);
  await info.attach("markdown-endpoint-inventory", {
    body: JSON.stringify(verified, null, 2),
    contentType: "application/json",
  });
});

test("page actions reset status icons, retry a failed prefetch and follow the visible package tabs", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  let attempts = 0;
  await page.route("**/docs/components/knob.md", (route) => {
    attempts += 1;

    return route.fulfill({
      status: attempts === 1 ? 500 : 200,
      body: "# Knob\n",
    });
  });
  await page.goto("/docs/components/knob");

  const button = page.getByRole("button", {
    name: "Copy prompt for AI",
    exact: true,
  });

  await button.hover();
  await expect.poll(() => attempts).toBe(1);
  await button.click();
  await expect(page.getByRole("status")).toHaveText("Prompt for Knob copied");
  await expect(page.locator('[data-slot="done-icon"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="done-icon"]')).toHaveCount(0);
  await page.getByRole("tab", { name: "bun", exact: true }).click();
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page
    .getByRole("button", { name: "More actions for AI agents" })
    .click();
  await page.getByRole("menuitem", { name: "Copy install command" }).click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("bunx --bun shadcn@latest add @audiocn-solid/knob");
});

test("installation docs render the configured registry origin in HTML and Markdown", async ({
  page,
  request,
}) => {
  await page.goto("/docs/installation");
  await expect(page.locator("main")).toContainText(
    `${siteConfig.url}/r/solid1/{name}.json`
  );
  await expect(page.locator("main")).toContainText(
    `${siteConfig.url}/r/solid2/{name}.json`
  );

  const markdown = await (await request.get("/docs/installation.md")).text();

  expect(markdown).toContain(`${siteConfig.url}/r/solid1/{name}.json`);
  expect(markdown).toContain(`${siteConfig.url}/r/solid2/{name}.json`);
  expect(markdown).not.toContain("https://<domain>");
});
