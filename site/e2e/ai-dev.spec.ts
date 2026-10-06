import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test.skip(
  process.env.AUDIOCN_AI_DEV !== "1",
  "real Vite development host only"
);

test("development Markdown reflects source edits without a static build", async ({
  request,
}, testInfo) => {
  const sourcePath = resolve(
    import.meta.dirname,
    "../content/docs/components/knob.mdx"
  );

  const original = await readFile(sourcePath, "utf8");
  const marker = "Live Markdown source freshness acceptance marker.";

  for (const pathname of ["/docs/components/knob", "/docs/installation"]) {
    const response = await request.get(`${pathname}.md`, { timeout: 10_000 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["x-audiocn-markdown-source"]).toBe("live-mdx");
    expect(await response.text()).not.toContain(marker);
    const head = await request.head(`${pathname}.md`, { timeout: 10_000 });
    expect(head.status()).toBe(200);
    expect(head.headers()["content-type"]).toContain("text/markdown");
    expect(await head.body()).toHaveLength(0);
  }

  try {
    await writeFile(sourcePath, `${original}\n\n${marker}\n`);

    const response = await request.get("/docs/components/knob.md", {
      timeout: 10_000,
    });

    const body = await response.text();
    expect(body).toContain(marker);

    const alias = await request.get("/llms.mdx/components/knob", {
      timeout: 10_000,
    });

    expect(alias.headers()["content-type"]).toContain("text/markdown");
    expect(await alias.text()).toBe(body);
  } finally {
    await writeFile(sourcePath, original);
  }

  const restored = await request.get("/docs/components/knob.md", {
    timeout: 10_000,
  });

  expect(await restored.text()).not.toContain(marker);
  await testInfo.attach("live-markdown-provenance", {
    body: JSON.stringify({
      sourcePath,
      sourceRestored: (await readFile(sourcePath, "utf8")) === original,
      liveEditObserved: true,
      aliasMatches: true,
      noBuildRequired: true,
    }),
    contentType: "application/json",
  });
});

test("development SSR HTML completes repeatedly for home and docs without client rendering", async ({
  request,
}, testInfo) => {
  const timings: { pathname: string; durationMs: number }[] = [];

  for (const pathname of [
    "/docs/components/knob",
    "/",
    "/docs/installation",
    "/docs/components/knob",
    "/",
  ]) {
    const started = Date.now();

    const response = await request.get(pathname, {
      headers: { accept: "text/html" },
      timeout: 12_000,
    });

    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/html");
    expect(html).toContain("<h1");
    expect(html).not.toContain("Internal server error");

    if (pathname === "/docs/components/knob") {
      expect(html).toContain("data-page-actions");
      expect(html).toContain("Copy prompt for AI");
    }

    if (pathname === "/docs/installation") {
      expect(html).toContain("For AI agents");
    }

    timings.push({ pathname, durationMs: Date.now() - started });
  }

  await testInfo.attach("server-rendered-navigation-timings", {
    body: JSON.stringify(timings),
    contentType: "application/json",
  });
});

for (const pathname of ["/docs/components/knob", "/docs/installation"]) {
  test(`development serves fresh Markdown and real page actions for ${pathname}`, async ({
    page,
    request,
    context,
  }, testInfo) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await request.get(`${pathname}.md`, { timeout: 10_000 });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    expect(response.headers()["x-audiocn-markdown-source"]).toBe("live-mdx");
    const body = await response.text();

    const alias = await request.get(
      `/llms.mdx${pathname.slice("/docs".length)}`,
      { timeout: 10_000 }
    );

    expect(alias.headers()["content-type"]).toContain("text/markdown");
    expect(await alias.text()).toBe(body);
    expect(body).toContain(
      pathname === "/docs/installation" ? "# Installation" : "# Add Knob"
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(pathname, { timeout: 15_000 });

    if (pathname === "/docs/installation") {
      await expect(
        page.getByRole("heading", {
          name: "For AI agents Copy Anchor Link",
          exact: true,
        })
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Copy prompt for AI", exact: true })
      ).toHaveCount(0);
    } else {
      await page
        .getByRole("button", { name: "Copy prompt for AI", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Prompt for Knob copied"
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        body
      );
      await page
        .getByRole("button", { name: "More actions for AI agents" })
        .click();
      await expect(
        page.getByRole("menuitem", { name: "View as Markdown" })
      ).toHaveAttribute("href", `${pathname}.md`);
      await page.goto("/docs/installation", { timeout: 15_000 });
      await expect(
        page.getByRole("heading", { name: "Installation", exact: true })
      ).toBeVisible();
      await page.goto(pathname, { timeout: 15_000 });
      await page
        .getByRole("button", { name: "Copy prompt for AI", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Prompt for Knob copied"
      );
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
        body
      );
    }

    expect(pageErrors).toEqual([]);
    await testInfo.attach("development-page-action-result", {
      body: JSON.stringify({
        pathname,
        markdownMime: response.headers()["content-type"],
        aliasMatches: true,
        clipboardMatchesServedBody: pathname !== "/docs/installation",
        pageErrors,
      }),
      contentType: "application/json",
    });
  });
}
