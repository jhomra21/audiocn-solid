import type { Page } from "@playwright/test";

import { siteConfig } from "../../lib/site";
import adapters from "./head-adapters.json" with { type: "json" };

export const UPSTREAM_ORIGIN = "https://audiocn.dev";

export interface HeadTag {
  /** `title`, a `meta` name/property, or a `link` rel. */
  key: string;
  kind: "link" | "meta" | "title";
  sizes: string;
  type: string;
  /** Meta content, link href, or the document title. */
  value: string;
}

const byTag = (left: HeadTag, right: HeadTag) =>
  left.key.localeCompare(right.key) ||
  left.value.localeCompare(right.value) ||
  left.sizes.localeCompare(right.sizes);

export const inspectHead = async (page: Page): Promise<HeadTag[]> =>
  page.evaluate(() => {
    const tags: HeadTag[] = [
      {
        key: "title",
        kind: "title",
        sizes: "",
        type: "",
        value: document.title,
      },
    ];

    for (const meta of document.head.querySelectorAll("meta")) {
      const key = meta.getAttribute("property") ?? meta.getAttribute("name");

      if (
        key &&
        (key === "description" ||
          key === "robots" ||
          key.startsWith("og:") ||
          key.startsWith("twitter:"))
      )
        tags.push({
          key,
          kind: "meta",
          sizes: "",
          type: "",
          value: meta.getAttribute("content") ?? "",
        });
    }

    for (const link of document.head.querySelectorAll("link")) {
      const rel = link.getAttribute("rel") ?? "";

      if (rel === "canonical" || rel === "icon" || rel === "apple-touch-icon")
        tags.push({
          key: rel,
          kind: "link",
          sizes: link.getAttribute("sizes") ?? "",
          type: link.getAttribute("type") ?? "",
          value: link.getAttribute("href") ?? "",
        });
    }

    return tags;
  });

const OG_IMAGE_HASH = /-[0-9a-f]{12}(\.png)$/;

/** Next fingerprints icon files with a `?` token; ours are plain paths. */
const normalizeLink = (tag: HeadTag): HeadTag =>
  tag.kind === "link" && !tag.value.includes("://")
    ? { ...tag, value: tag.value.replace(/\?.*$/, "") }
    : tag;

/** Content hashes differ per build, so the image's name is the comparable part. */
const normalizeImage = (tag: HeadTag): HeadTag =>
  tag.key.endsWith("image")
    ? { ...tag, value: tag.value.replace(OG_IMAGE_HASH, "$1") }
    : tag;

const TEXT_KEYS = new Set([
  "description",
  "og:description",
  "og:image:alt",
  "og:title",
  "title",
  "twitter:description",
  "twitter:image:alt",
  "twitter:title",
]);

/** Exact, source-backed substitutions for the Solid port of the site. */
const TEXT_REWRITES = [
  { from: / — audiocn$/, to: ` — ${siteConfig.name}` },
  { from: /\bfor React\b/g, to: "for Solid" },
] as const;

const adaptText = (value: string) =>
  TEXT_REWRITES.reduce((text, { from, to }) => text.replace(from, to), value);

const adaptOrigin = (value: string) =>
  value === UPSTREAM_ORIGIN || value.startsWith(`${UPSTREAM_ORIGIN}/`)
    ? `${siteConfig.url}${value.slice(UPSTREAM_ORIGIN.length)}`
    : value;

/**
 * Rewrites upstream's head into what our site must emit. Only provable,
 * intended differences are applied: the site origin and name, React wording,
 * per-build image hashes, icon fingerprints, and the exact route-scoped text
 * in `head-adapters.json`, which throws once it no longer matches upstream.
 */
export const adaptHead = (route: string, tags: HeadTag[]): HeadTag[] => {
  const routeAdapters = adapters.filter((entry) => entry.route === route);
  const used = new Set<string>();

  const adapted = tags.map((tag) => {
    let next = tag;

    if (tag.key === "og:site_name") next = { ...next, value: siteConfig.name };
    else if (TEXT_KEYS.has(tag.key)) {
      const exact = routeAdapters.find(
        (entry) => entry.upstream === tag.value && entry.keys.includes(tag.key)
      );

      if (exact) used.add(`${exact.upstream}\0${tag.key}`);
      next = { ...next, value: exact ? exact.local : adaptText(tag.value) };
    }

    return normalizeImage(
      normalizeLink({ ...next, value: adaptOrigin(next.value) })
    );
  });

  for (const entry of routeAdapters)
    for (const key of entry.keys)
      if (!used.has(`${entry.upstream}\0${key}`))
        throw new Error(`Stale head adapter: ${route} ${key}: ${entry.reason}`);

  return adapted.sort(byTag);
};

/** Our side only differs by build-time icon/image fingerprints. */
export const normalizeLocalHead = (tags: HeadTag[]): HeadTag[] =>
  tags.map((tag) => normalizeImage(normalizeLink(tag))).sort(byTag);

export interface ImageCheck {
  contentType: string;
  height: number;
  status: number;
  width: number;
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

const PNG_WIDTH_OFFSET = 16;

const PNG_HEIGHT_OFFSET = 20;

export const pngSize = (bytes: Buffer) =>
  bytes.subarray(0, 4).equals(PNG_SIGNATURE)
    ? {
        height: bytes.readUInt32BE(PNG_HEIGHT_OFFSET),
        width: bytes.readUInt32BE(PNG_WIDTH_OFFSET),
      }
    : { height: 0, width: 0 };

/** Loads the declared og:image from our own server and measures the PNG. */
export const checkOgImage = async (
  page: Page,
  tags: HeadTag[]
): Promise<ImageCheck> => {
  const declared = tags.find((tag) => tag.key === "og:image")?.value ?? "";
  const url = new URL(new URL(declared, siteConfig.url).pathname, page.url());
  const response = await page.request.get(url.href);
  const size = pngSize(await response.body());

  return {
    contentType: response.headers()["content-type"] ?? "",
    height: size.height,
    status: response.status(),
    width: size.width,
  };
};
