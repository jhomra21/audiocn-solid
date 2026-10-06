import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const UPSTREAM_SITEMAP = "https://www.audiocn.dev/sitemap.xml";

const LOCATION = /<loc>([^<]+)<\/loc>/g;

/** Public routes listed in a sitemap, as sorted paths, whichever origin wrote them. */
export const sitemapRoutes = (xml: string): string[] =>
  Array.from(xml.matchAll(LOCATION), ([, location]) => {
    const { pathname } = new URL(location);

    return pathname.length > 1 ? pathname.replace(/\/$/, "") : "/";
  }).sort((left, right) => left.localeCompare(right));

export const readLocalSitemap = async (): Promise<string> =>
  readFile(join(import.meta.dirname, "../../dist/client/sitemap.xml"), "utf8");

export const readUpstreamSitemap = async (): Promise<string> => {
  const response = await fetch(UPSTREAM_SITEMAP);

  if (!response.ok)
    throw new Error(`Upstream sitemap returned ${response.status}`);

  return response.text();
};

/** What each side publishes that the other does not. */
export const inventoryDifferences = (upstream: string[], local: string[]) => ({
  extra: local.filter((route) => !upstream.includes(route)),
  missing: upstream.filter((route) => !local.includes(route)),
});
