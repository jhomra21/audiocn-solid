import type { Page } from "@playwright/test";

import { adaptHead, inspectHead, normalizeLocalHead } from "./head";
import type { HeadTag } from "./head";
import notFoundAdapters from "./not-found-adapters.json" with { type: "json" };

export interface NotFoundState {
  actions: { href: string; name: string }[];
  head: HeadTag[];
  heading: string;
  status: number;
}

/** The rendered not-found page's head tags, heading and action links. */
export const readNotFound = async (page: Page) => ({
  ...(await page.locator("main").evaluate((main) => ({
    actions: [...main.querySelectorAll<HTMLAnchorElement>("a[href]")].map(
      (link) => ({
        href: link.getAttribute("href") ?? "",
        name: link.textContent?.trim() ?? "",
      })
    ),
    heading: main.querySelector("h1")?.textContent?.trim() ?? "",
  }))),
  head: await inspectHead(page),
});

/** An unknown URL's response code plus what it renders. */
export const inspectNotFound = async (
  page: Page,
  url: string
): Promise<NotFoundState> => {
  const response = await page.goto(url, { waitUntil: "networkidle" });

  return { ...(await readNotFound(page)), status: response?.status() ?? 0 };
};

/**
 * Upstream's not-found state as our static site must render it. Its head is
 * the home page's plus `noindex`, so it adapts like the home route. Each status
 * entry replaces one exact upstream value and throws once upstream stops
 * sending it.
 */
export const adaptNotFound = (upstream: NotFoundState): NotFoundState => {
  const adapted = { ...upstream, head: adaptHead("/", upstream.head) };

  for (const entry of notFoundAdapters) {
    if (String(upstream.status) !== entry.upstream)
      throw new Error(`Stale not-found adapter: status: ${entry.reason}`);

    adapted.status = Number(entry.local);
  }

  return adapted;
};

/** Our side only differs by build-time icon/image fingerprints. */
export const normalizeLocalNotFound = (
  local: NotFoundState
): NotFoundState => ({
  ...local,
  head: normalizeLocalHead(local.head),
});
