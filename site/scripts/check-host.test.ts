import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { isSearchIndexPayload } from "../lib/search";
import {
  assertSearchIndexDocumentCount,
  checkHostedRelease,
  parseSiteOrigin,
  readSitemapRoutes,
} from "./check-host";

describe("hosted release checker inputs", () => {
  const rawData = {
    docs: {},
    index: {},
    internalDocumentIDStore: {},
    language: "english",
    pinning: {},
    sorting: {},
  };

  test("normalizes HTTPS origins but rejects URL components", () => {
    expect(parseSiteOrigin("https://example.workers.dev///")).toBe(
      "https://example.workers.dev"
    );

    for (const input of [
      "http://example.workers.dev",
      "https://user@example.workers.dev",
      "https://example.workers.dev/path",
      "https://example.workers.dev/..",
      "https://example.workers.dev?preview=1",
      "https://example.workers.dev/#fragment",
      " https://example.workers.dev",
      "not a URL",
    ]) {
      expect(() => parseSiteOrigin(input)).toThrow();
    }
  });

  test("accepts only complete, same-origin sitemap routes", () => {
    const routes = [
      "/",
      "/contributors",
      ...Array.from({ length: 55 }, (_, index) => `/docs/page-${index}`),
    ];

    const xml = `<urlset>${routes.map((route) => `<url><loc>https://example.workers.dev${route}</loc></url>`).join("")}</urlset>`;

    expect(readSitemapRoutes(xml, "https://example.workers.dev")).toEqual(
      routes
    );

    for (const xml of [
      "<urlset><url><loc>https://elsewhere.test/</loc></url></urlset>",
      "<urlset><url><loc>https://user@example.workers.dev/</loc></url></urlset>",
      "<urlset><url><loc>/docs/installation</loc></url></urlset>",
      `<urlset>${Array.from({ length: 57 }, () => "<url><loc>https://example.workers.dev/docs/a</loc></url>").join("")}</urlset>`,
      "<urlset></urlset>",
    ]) {
      expect(() =>
        readSitemapRoutes(xml, "https://example.workers.dev")
      ).toThrow();
    }
  });

  test("rejects credentials in a complete otherwise-valid sitemap", () => {
    const routes = [
      "/",
      "/contributors",
      ...Array.from({ length: 55 }, (_, index) => `/docs/page-${index}`),
    ];

    const xml = `<urlset>${routes
      .map(
        (route, index) =>
          `<url><loc>https://${index === 2 ? "user@" : ""}example.workers.dev${route}</loc></url>`
      )
      .join("")}</urlset>`;

    expect(() =>
      readSitemapRoutes(xml, "https://example.workers.dev")
    ).toThrow();
  });

  test("requires the shipped search index to contain all 55 docs", () => {
    expect(assertSearchIndexDocumentCount(55)).toBeUndefined();

    for (const value of [
      null,
      { version: 2, documents: 55, index: rawData },
      { version: 1, documents: 55 },
    ]) {
      expect(isSearchIndexPayload(value)).toBe(false);
    }

    expect(
      isSearchIndexPayload({
        version: 1,
        documents: 54,
        index: rawData,
      })
    ).toBe(true);

    expect(() => assertSearchIndexDocumentCount(54)).toThrow();
  });
});

describe("hosted release checker requests", () => {
  const origin = "https://example.workers.dev";

  const routes = [
    "/",
    "/contributors",
    ...Array.from({ length: 55 }, (_, index) => `/docs/page-${index}`),
  ];

  const registry = JSON.parse(
    readFileSync(new URL("../../registry.json", import.meta.url), "utf8")
  );

  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(png.buffer).setUint32(16, 1200);
  new DataView(png.buffer).setUint32(20, 630);

  const responseFor = (url: string): Response => {
    const pathname = new URL(url).pathname;
    let body: string | Uint8Array<ArrayBuffer> = "";
    let type = "text/plain";
    let status = 200;

    if (pathname === "/sitemap.xml") {
      body = `<urlset>${routes.map((route) => `<url><loc>${origin}${route}</loc></url>`).join("")}</urlset>`;
    } else if (pathname === "/search-index.json") {
      type = "application/json";
      body = JSON.stringify({
        version: 1,
        documents: 55,
        index: {
          docs: {},
          index: {},
          internalDocumentIDStore: {},
          language: "english",
          pinning: {},
          sorting: {},
        },
      });
    } else if (pathname === "/robots.txt") {
      body = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml`;
    } else if (pathname === "/llms.txt") {
      body = `${origin}/r/solid1/{name}.json\n${origin}/r/solid2/{name}.json`;
    } else if (pathname === "/llms-full.txt") {
      body = "# Installation";
    } else if (pathname === "/social.png") {
      type = "image/png";
      body = png;
    } else if (pathname === "/brand/logo.svg") {
      type = "image/svg+xml";
      body = "<svg />";
    } else if (pathname.endsWith(".md")) {
      type = "text/markdown";
      body = "# Documentation";
    } else if (pathname.startsWith("/r/")) {
      type = "application/json";
      const name = pathname.split("/").at(-1)?.replace(".json", "");
      body = JSON.stringify(
        name === "registry"
          ? {
              items: registry.items.map(({ name }: { name: string }) => ({
                name,
              })),
            }
          : {
              name,
              registryDependencies: ["@audiocn-solid/channel-strip"],
            }
      );
    } else if (pathname.includes("host-check-not-found")) {
      type = "text/html";
      status = 404;
      body = "<html>Page not found</html>";
    } else {
      type = "text/html";
      const route = pathname === "/" ? "/" : pathname.replace(/\/$/u, "");
      body = `<html><link rel="canonical" href="${origin}${route === "/" ? "" : route}"><meta property="og:image" content="${origin}/social.png"></html>`;
    }

    const response = new Response(body, {
      status,
      headers: { "content-type": type },
    });

    Object.defineProperty(response, "url", { value: url });

    return response;
  };

  const redirect = (url: string, location: string) => {
    const response = new Response(null, {
      status: 308,
      headers: { location },
    });

    Object.defineProperty(response, "url", { value: url });

    return response;
  };

  test("checks all resources and allows only the expected directory slash redirect", async () => {
    const requested: string[] = [];
    await checkHostedRelease(origin, async (url, init) => {
      expect(init.redirect).toBe("manual");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      requested.push(new URL(url).pathname);

      return url === `${origin}/contributors`
        ? redirect(url, "/contributors/")
        : responseFor(url);
    });
    expect(requested).toContain("/contributors/");
    expect(requested.filter((path) => path.endsWith(".md"))).toHaveLength(55);
    expect(
      requested.filter((path) => /^\/r\/solid[12]\/[^/]+\.json$/u.test(path))
    ).toHaveLength(132);
    expect(requested.at(-1)).toBe("/__audiocn-solid-host-check-not-found__");
  });

  for (const location of [
    "https://elsewhere.test/contributors/",
    "/docs/page-0/",
    "/contributors/?preview=1",
    "/contributors/#fragment",
    `https://user@${new URL(origin).host}/contributors/`,
  ]) {
    test(`rejects directory redirect to ${location}`, async () => {
      await expect(
        checkHostedRelease(origin, async (url) =>
          url.endsWith("/contributors")
            ? redirect(url, location)
            : responseFor(url)
        )
      ).rejects.toThrow("redirect");
    });
  }

  test("rejects redirects on resource endpoints", async () => {
    await expect(
      checkHostedRelease(origin, async (url) => redirect(url, "/sitemap.xml/"))
    ).rejects.toThrow("redirect");
  });

  test("bounds directory redirect loops to one follow-up request", async () => {
    let redirects = 0;
    await expect(
      checkHostedRelease(origin, async (url) => {
        if (url.includes("/contributors")) {
          redirects++;

          return redirect(url, "/contributors/");
        }

        return responseFor(url);
      })
    ).rejects.toThrow("redirect");
    expect(redirects).toBe(2);
  });

  test("times out requests using an abort signal", async () => {
    await expect(
      checkHostedRelease(
        origin,
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(init.signal?.reason)
            );
          }),
        10
      )
    ).rejects.toThrow();
  });

  test("times out a stalled response body", async () => {
    await expect(
      checkHostedRelease(
        origin,
        async (url, init) => {
          const response = new Response(
            new ReadableStream({
              start(controller) {
                init.signal.addEventListener("abort", () =>
                  controller.error(init.signal.reason)
                );
              },
            })
          );

          Object.defineProperty(response, "url", { value: url });

          return response;
        },
        10
      )
    ).rejects.toThrow();
  });

  for (const [path, body, type, message] of [
    ["/search-index.json", "<html>fallback</html>", "text/html", "JSON"],
    ["/r/solid1/registry.json", "<html>fallback</html>", "text/html", "JSON"],
    ["/docs/page-0.md", "<html>fallback</html>", "text/html", "Markdown"],
    ["/contributors", "not html", "text/html", "HTML"],
    [
      "/contributors",
      `<html><link rel="canonical" href="${origin}/wrong"><meta property="og:image" content="${origin}/social.png"></html>`,
      "text/html",
      "canonical",
    ],
    [
      "/contributors",
      `<html><meta name="robots" content="noindex"></html>`,
      "text/html",
      "noindex",
    ],
    [
      "/r/solid1/level-meter.json",
      '{"name":"wrong"}',
      "application/json",
      "identity",
    ],
    [
      "/r/solid2/mixer.json",
      '{"name":"mixer","registryDependencies":[]}',
      "application/json",
      "channel-strip",
    ],
    ["/social.png", png.slice(0, 8), "image/png", "1200x630 PNG"],
    ["/social.png", png.slice(0, 20), "image/png", "1200x630 PNG"],
  ] as const) {
    test(`rejects corrupt ${path} response (${message}, ${body.length} bytes)`, async () => {
      await expect(
        checkHostedRelease(origin, async (url) => {
          if (new URL(url).pathname !== path) return responseFor(url);

          const response = new Response(body, {
            headers: { "content-type": type },
          });

          Object.defineProperty(response, "url", { value: url });

          return response;
        })
      ).rejects.toThrow(message);
    });
  }

  test("accepts both CLI origin aliases and fails invalid input before requests", async () => {
    for (const alias of ["AUDIOCN_SITE_URL", "VITE_AUDIOCN_SITE_URL"]) {
      const child = Bun.spawn({
        cmd: ["bun", "run", "site/scripts/check-host.ts"],
        cwd: new URL("../..", import.meta.url).pathname,
        env: {
          ...process.env,
          AUDIOCN_SITE_URL: undefined,
          VITE_AUDIOCN_SITE_URL: undefined,
          [alias]: " https://example.workers.dev",
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      expect(await child.exited).not.toBe(0);
      expect(await new Response(child.stderr).text()).toContain("HTTPS origin");
    }
  });
});
