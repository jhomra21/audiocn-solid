import { mkdir, readFile, writeFile } from "node:fs/promises";
import { request } from "node:http";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { startStaticHost } from "./static-host";

const siteRoot = join(import.meta.dirname, "..");

const clientDirectory = join(siteRoot, "dist/client");

const artifactPath = join(siteRoot, "artifacts/static-host-404-evidence.json");

declare global {
  interface Window {
    __mains: { added: number; removed: number };
    __sameDocument?: boolean;
    _$HY?: { done?: boolean };
  }
}

interface DocumentLog {
  consoleErrors: string[];
  documentLoads: number;
  pageErrors: string[];
}

let host: Awaited<ReturnType<typeof startStaticHost>>;

const controls: object[] = [];

const notFound: object[] = [];

const traversal: object[] = [];

const markdown: object[] = [];

let recovery: object | undefined;

test.beforeAll(async () => {
  host = await startStaticHost(clientDirectory);
});

test.afterAll(async () => {
  await host.close();
  await mkdir(join(siteRoot, "artifacts"), { recursive: true });
  await writeFile(
    artifactPath,
    `${JSON.stringify(
      {
        commands: [
          "cd site && bun run build",
          "cd site && bunx playwright test e2e/static-host.spec.ts",
        ],
        controls,
        markdown,
        notFound,
        recovery,
        traversal,
      },
      null,
      2
    )}\n`
  );
});

/** Everything that proves the document hydrated cleanly instead of failing. */
const watchDocument = async (page: Page) => {
  const log: DocumentLog = {
    consoleErrors: [],
    documentLoads: 0,
    pageErrors: [],
  };

  page.on("pageerror", (error) => log.pageErrors.push(error.message));
  page.on("console", (message) => {
    // The browser reports the document's own 404 here; the status is asserted separately.
    if (
      (message.type() === "error" || message.type() === "warning") &&
      message.location().url !== page.url()
    )
      log.consoleErrors.push(message.text());
  });
  page.on("load", () => {
    log.documentLoads += 1;
  });

  // Hydration must claim the server-rendered <main>; a client re-render adds a
  // second one and removes the first.
  await page.addInitScript(() => {
    const mains = { added: 0, removed: 0 };

    const count = (nodes: NodeList, key: keyof typeof mains) => {
      for (const node of nodes)
        if (node instanceof Element && node.matches("main")) mains[key] += 1;
    };

    window.__mains = mains;
    new MutationObserver((records) => {
      for (const record of records) {
        count(record.addedNodes, "added");
        count(record.removedNodes, "removed");
      }
    }).observe(document, { childList: true, subtree: true });
  });

  return log;
};

const hydrated = (page: Page) => page.waitForFunction(() => window._$HY?.done);

const unknownPaths = [
  "/no-such-page",
  "/docs/missing",
  "/docs/components/no-such-component",
  "/spikes/unknown",
  "/spikes/search",
  "/assets/no-such-chunk.js",
];

for (const path of unknownPaths) {
  test(`the static host answers ${path} with 404 and hydrates the not-found page`, async ({
    page,
  }) => {
    const log = await watchDocument(page);
    const response = await page.goto(`${host.origin}${path}`);

    await hydrated(page);
    await page.waitForLoadState("networkidle");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "Page not found" })
    ).toBeVisible();
    await expect(page.locator("[data-docs-ssr-error]")).toHaveCount(0);

    // The host answers every unknown path with the root catch-all's HTML.
    // Hydration keeps that markup's attributes even when the client router
    // picks the /docs catch-all, so the docs marker is only recorded for
    // paths there; the root catch-all must never carry it.
    const docsMarker = await page.evaluate(
      () =>
        document
          .querySelector("[data-docs-route-unavailable]")
          ?.getAttribute("data-docs-route-unavailable") ?? null
    );

    if (!path.startsWith("/docs/")) expect(docsMarker).toBeNull();

    const mains = await page.evaluate(() => window.__mains);

    expect(log.pageErrors).toEqual([]);
    expect(log.consoleErrors).toEqual([]);
    expect(log.documentLoads).toBe(1);
    expect(mains).toEqual({ added: 1, removed: 0 });

    notFound.push({
      consoleErrors: log.consoleErrors,
      docsMarker,
      documentLoads: log.documentLoads,
      headers: Object.fromEntries(
        Object.entries(response?.headers() ?? {}).filter(
          ([name]) => name !== "date"
        )
      ),
      mains,
      pageErrors: log.pageErrors,
      path,
      status: response?.status(),
    });
  });
}

test("known routes are served with 200 and not the 404 page", async ({
  page,
}) => {
  for (const { heading, path } of [
    { heading: "Audio UI, mixed and mastered.", path: "/" },
    { heading: "Introduction", path: "/docs" },
    { heading: "Contributors", path: "/contributors" },
  ]) {
    const response = await page.goto(`${host.origin}${path}`);

    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: heading })
    ).toBeVisible();
    controls.push({ path, status: response?.status() });
  }
});

test("markdown endpoints use the deployment content type", async () => {
  for (const [path, generated] of [
    ["/docs/components/knob.md", "docs/components/knob.md"],
    ["/llms.mdx", "docs.md"],
    ["/llms.mdx/components/knob", "docs/components/knob.md"],
    ["/llms.mdx/components/knob/", "docs/components/knob.md"],
  ] as const) {
    const response = await fetch(`${host.origin}${path}`);
    const body = await response.text();

    expect(response.status, path).toBe(200);
    expect(response.headers.get("content-type"), path).toBe(
      "text/markdown; charset=utf-8"
    );
    expect(body, path).toBe(
      await readFile(join(clientDirectory, generated), "utf8")
    );
    markdown.push({
      path,
      generated,
      status: response.status,
      contentType: response.headers.get("content-type"),
      bodyMatchesGenerated: true,
    });
  }

  const unknown = await fetch(`${host.origin}/llms.mdx/missing`);
  expect(unknown.status).toBe(404);
  expect(unknown.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(await unknown.text()).toBe(
    await readFile(join(clientDirectory, "404.html"), "utf8")
  );
});

test("the static host never serves files outside dist/client", async () => {
  const outside = await readFile(join(siteRoot, "package.json"), "utf8");

  const get = (target: string) =>
    new Promise<{ body: string; status: number }>((done, fail) => {
      request(`${host.origin}${target}`, (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          done({
            body: Buffer.concat(chunks).toString("utf8"),
            status: response.statusCode ?? 0,
          })
        );
      })
        .on("error", fail)
        .end();
    });

  for (const target of [
    "/..%2fpackage.json",
    "/%2e%2e/package.json",
    "/..%2f..%2fsite/package.json",
    "/assets/..%2f..%2fpackage.json",
    "/%00",
    "/%E0%A4%A",
  ]) {
    const { body, status } = await get(target);

    expect(status, target).toBe(404);
    expect(body, target).not.toBe(outside);
    expect(body, target).toContain("Page not found");
    traversal.push({ status, target });
  }
});

test("a failed route load recovers through client navigation", async ({
  page,
}) => {
  const log = await watchDocument(page);

  const errorHeading = page.getByRole("heading", {
    level: 1,
    name: "Something went wrong",
  });

  await page.goto(host.origin);
  await hydrated(page);
  await page.route("**/assets/contributors-*.js", (route) => route.abort());
  await page.evaluate(() => {
    window.__sameDocument = true;
  });
  await page
    .getByRole("navigation", { name: "Secondary" })
    .getByRole("link", { name: "Contributors" })
    .click();
  await expect(errorHeading).toBeVisible();

  const pageErrorsBefore = log.pageErrors.length;
  const loadsBefore = log.documentLoads;

  await page.getByRole("link", { name: "Browse documentation" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Introduction" })
  ).toBeVisible();

  const sameDocument = await page.evaluate(() => window.__sameDocument);

  recovery = {
    documentLoadsAfterRecovery: log.documentLoads - loadsBefore,
    errorHeadingsAfterRecovery: await errorHeading.count(),
    newPageErrorsAfterRecovery: log.pageErrors.length - pageErrorsBefore,
    pageErrorsBeforeRecovery: pageErrorsBefore,
    recoveredPath: new URL(page.url()).pathname,
    sameDocument,
  };

  expect(recovery).toEqual({
    documentLoadsAfterRecovery: 0,
    errorHeadingsAfterRecovery: 0,
    newPageErrorsAfterRecovery: 0,
    pageErrorsBeforeRecovery: pageErrorsBefore,
    recoveredPath: "/docs",
    sameDocument: true,
  });
  await expect(page.locator("[data-docs-ssr-error]")).toHaveCount(0);
});
