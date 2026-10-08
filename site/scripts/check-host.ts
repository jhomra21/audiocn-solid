import { readFile } from "node:fs/promises";

import { isSearchIndexPayload } from "../lib/search";
import { parseSiteOrigin } from "../lib/site-url";

const rawSiteUrl =
  process.env.AUDIOCN_SITE_URL ?? process.env.VITE_AUDIOCN_SITE_URL;

export { parseSiteOrigin };

export const readSitemapRoutes = (xml: string, origin: string): string[] => {
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map((match) =>
    match[1].trim()
  );

  if (!xml.includes("<urlset") || locations.length === 0) {
    throw new Error("Sitemap is empty or is not a urlset.");
  }

  const routes = locations.map((location) => {
    let url: URL;

    try {
      url = new URL(location);
    } catch {
      throw new Error(`Sitemap contains an invalid URL: "${location}".`);
    }

    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        `Sitemap URL is outside the hosted origin: "${location}".`
      );
    }

    return url.pathname;
  });

  if (
    new Set(routes).size !== routes.length ||
    routes.filter((route) => route.startsWith("/docs/") || route === "/docs")
      .length !== 55 ||
    routes.length !== 57 ||
    !routes.includes("/") ||
    !routes.includes("/contributors")
  ) {
    throw new Error(
      `Sitemap must contain 57 unique routes (55 docs, home, contributors); received ${routes.length}.`
    );
  }

  return routes;
};

export const assertSearchIndexDocumentCount = (documents: number): void => {
  if (documents !== 55) {
    throw new Error("Search index must contain all 55 documentation pages.");
  }
};

export const checkHostedRelease = async (
  origin: string,
  fetcher: (
    url: string,
    init: { redirect: "manual"; signal: AbortSignal }
  ) => Promise<Response> = fetch,
  timeoutMs = 10_000
) => {
  const siteUrl = parseSiteOrigin(origin);

  const get = (pathname: string) =>
    fetcher(`${siteUrl}${pathname}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

  const expectStatus = async (
    pathname: string,
    status = 200,
    htmlRoute = false
  ) => {
    let response = await get(pathname);

    if ([301, 302, 307, 308].includes(response.status)) {
      if (!htmlRoute) {
        throw new Error(`${pathname}: resources must not redirect.`);
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new Error(`${pathname}: HTML redirect has no Location header.`);
      }

      const target = new URL(location, `${siteUrl}${pathname}`);
      const expectedPath = `${pathname}/`;

      if (
        target.origin !== siteUrl ||
        target.username ||
        target.password ||
        pathname.endsWith("/") ||
        target.pathname !== expectedPath ||
        target.search ||
        target.hash
      ) {
        throw new Error(`${pathname}: unexpected HTML redirect target.`);
      }

      response = await get(expectedPath);

      if (
        [301, 302, 307, 308].includes(response.status) ||
        new URL(response.url).pathname !== expectedPath
      ) {
        throw new Error(`${pathname}: HTML redirect did not resolve once.`);
      }
    }

    if (response.status !== status) {
      throw new Error(
        `${pathname}: expected HTTP ${status}, received ${response.status}.`
      );
    }

    if (new URL(response.url).origin !== siteUrl) {
      throw new Error(`${pathname}: response escaped the hosted origin.`);
    }

    return response;
  };

  const sitemapResponse = await expectStatus("/sitemap.xml");
  const sitemap = await sitemapResponse.text();
  const routes = readSitemapRoutes(sitemap, siteUrl);
  const searchIndexResponse = await expectStatus("/search-index.json");

  if (
    !(searchIndexResponse.headers.get("content-type") ?? "").includes(
      "application/json"
    )
  ) {
    throw new Error("Search index is not served as JSON.");
  }

  const searchIndex: unknown = await searchIndexResponse.json();

  if (!isSearchIndexPayload(searchIndex)) {
    throw new Error("Search index payload is invalid.");
  }

  assertSearchIndexDocumentCount(searchIndex.documents);

  const robots = await (await expectStatus("/robots.txt")).text();

  if (
    !robots.includes("User-agent: *") ||
    !robots.includes("Allow: /") ||
    !robots.includes("Disallow: /api/") ||
    !robots.includes(`Sitemap: ${siteUrl}/sitemap.xml`)
  ) {
    throw new Error(
      "robots.txt does not contain the expected crawl directives."
    );
  }

  const llms = await (await expectStatus("/llms.txt")).text();

  if (
    !llms.includes(`${siteUrl}/r/solid1/{name}.json`) ||
    !llms.includes(`${siteUrl}/r/solid2/{name}.json`)
  ) {
    throw new Error("llms.txt does not contain the deployed registry origins.");
  }

  const llmsFull = await (await expectStatus("/llms-full.txt")).text();

  if (!llmsFull.includes("# Installation")) {
    throw new Error("llms-full.txt does not contain the installation page.");
  }

  const ogImages = new Set<string>();

  for (const route of routes) {
    const response = await expectStatus(route, 200, true);
    const contentType = response.headers.get("content-type") ?? "";
    const html = await response.text();

    if (!contentType.includes("text/html") || !/<html[\s>]/iu.test(html)) {
      throw new Error(
        `${route}: expected an HTML page, received "${contentType}".`
      );
    }

    if (
      /<meta\b(?=[^>]*\bname="robots")(?=[^>]*\bcontent="[^"]*noindex)/iu.test(
        html
      )
    ) {
      throw new Error(`${route}: sitemap page is marked noindex.`);
    }

    const canonical = html.match(
      /<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="([^"]+)")[^>]*>/iu
    )?.[1];

    const expectedCanonical = route === "/" ? siteUrl : `${siteUrl}${route}`;

    if (canonical !== expectedCanonical) {
      throw new Error(
        `${route}: canonical link does not match the hosted route.`
      );
    }

    const image = html.match(
      /<meta\b(?=[^>]*\bproperty="og:image")(?=[^>]*\bcontent="([^"]+)")[^>]*>/iu
    )?.[1];

    if (!image) {
      throw new Error(`${route}: Open Graph image is missing.`);
    }

    const imageUrl = new URL(image, siteUrl);

    if (imageUrl.origin !== siteUrl) {
      throw new Error(
        `${route}: Open Graph image is outside the hosted origin.`
      );
    }

    ogImages.add(imageUrl.pathname);
  }

  for (const pathname of [...ogImages, "/brand/logo.svg"]) {
    const response = await expectStatus(pathname);
    const type = response.headers.get("content-type") ?? "";

    if (pathname.endsWith(".svg")) {
      if (
        !type.includes("image/svg+xml") ||
        !(await response.text()).includes("<svg")
      ) {
        throw new Error(`${pathname}: expected a valid SVG image.`);
      }
    } else {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const signature = [137, 80, 78, 71, 13, 10, 26, 10];

      if (
        !type.includes("image/png") ||
        bytes.length < 24 ||
        !signature.every((byte, index) => bytes[index] === byte) ||
        new DataView(bytes.buffer, bytes.byteOffset).getUint32(16) !== 1200 ||
        new DataView(bytes.buffer, bytes.byteOffset).getUint32(20) !== 630
      ) {
        throw new Error(`${pathname}: expected a 1200x630 PNG social card.`);
      }
    }
  }

  const markdownRoutes = routes
    .filter((route) => route.startsWith("/docs/") || route === "/docs")
    .map((route) => `${route}.md`);

  for (const pathname of markdownRoutes) {
    const response = await expectStatus(pathname);
    const contentType = response.headers.get("content-type") ?? "";
    const markdown = await response.text();

    if (
      !contentType.startsWith("text/markdown") ||
      !markdown.startsWith("# ")
    ) {
      throw new Error(
        `${pathname}: expected a Markdown page, received "${contentType}".`
      );
    }
  }

  const sourceRegistry = JSON.parse(
    await readFile(new URL("../../registry.json", import.meta.url), "utf8")
  );

  const sourceNames = sourceRegistry.items
    .map((item: { name: string }) => item.name)
    .sort();

  for (const runtime of ["solid1", "solid2"]) {
    const indexResponse = await expectStatus(`/r/${runtime}/registry.json`);

    if (
      !(indexResponse.headers.get("content-type") ?? "").includes(
        "application/json"
      )
    ) {
      throw new Error(`${runtime}: registry index is not served as JSON.`);
    }

    const index = await indexResponse.json();

    if (
      !Array.isArray(index.items) ||
      index.items.length !== 65 ||
      new Set(index.items.map((item: { name?: string }) => item.name)).size !==
        65 ||
      JSON.stringify(
        index.items.map((item: { name: string }) => item.name).sort()
      ) !== JSON.stringify(sourceNames)
    ) {
      throw new Error(
        `${runtime}: registry inventory must contain 65 unique items.`
      );
    }

    for (const item of index.items) {
      const itemResponse = await expectStatus(
        `/r/${runtime}/${item.name}.json`
      );

      if (
        !(itemResponse.headers.get("content-type") ?? "").includes(
          "application/json"
        )
      ) {
        throw new Error(
          `${runtime}/${item.name}: registry item is not served as JSON.`
        );
      }

      const entry = await itemResponse.json();

      if (entry.name !== item.name) {
        throw new Error(
          `${runtime}/${item.name}: registry item identity does not match.`
        );
      }

      if (
        item.name === "mixer" &&
        !entry.registryDependencies?.includes("@audiocn-solid/channel-strip")
      ) {
        throw new Error(
          `${runtime}/mixer: channel-strip registry dependency is missing.`
        );
      }
    }
  }

  const missing = await expectStatus(
    "/__audiocn-solid-host-check-not-found__",
    404
  );

  if (!/page not found/i.test(await missing.text())) {
    throw new Error(
      "The deployed 404 response did not contain the not-found page."
    );
  }

  return {
    markdownRoutes: markdownRoutes.length,
    ogImages: ogImages.size,
    registryItems: 130,
    routes: routes.length,
  };
};

if (import.meta.main) {
  if (!rawSiteUrl) {
    throw new Error(
      "Set AUDIOCN_SITE_URL or VITE_AUDIOCN_SITE_URL to the deployed HTTPS origin."
    );
  }

  const siteUrl = parseSiteOrigin(rawSiteUrl);
  const result = await checkHostedRelease(siteUrl);
  console.log(
    `Hosted release checks passed for ${siteUrl}: ${result.routes} routes, ${result.markdownRoutes} Markdown endpoints, ${result.ogImages} social cards, ${result.registryItems} registry items.`
  );
}
