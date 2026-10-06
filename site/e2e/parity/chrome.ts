import type { Page } from "@playwright/test";

import { siteConfig } from "../../lib/site";

/**
 * One interactive element of the site chrome, in document order:
 * `region role "accessible name" [states] -> href`.
 */
export type ChromeItem = string;

// The floating panel holds the collapsed sidebar's expand and search controls.
const CHROME_REGIONS = "header, aside, footer, [data-sidebar-panel]";

const ITEM_LINE =
  /^\s*- (link|button|combobox|switch|checkbox|searchbox|textbox|menuitem|menuitemcheckbox|menuitemradio|tab|paragraph)(?: "((?:[^"\\]|\\.)*)")?((?: \[[^\]]+\])*)(?::(?: (.+))?)?$/;

const URL_LINE = /^\s*- \/url: (.*)$/;

/**
 * Reads roles, accessible names and hrefs from Playwright's accessibility
 * tree. Paragraphs only count when they are a bare label, like the docs
 * sidebar's group headings.
 */
export const parseSnapshot = (region: string, snapshot: string) => {
  const items: ChromeItem[] = [];
  const lines = snapshot.split("\n");

  for (const [index, line] of lines.entries()) {
    const match = ITEM_LINE.exec(line);

    if (!match) continue;
    const [, role, quoted = "", states = "", text = ""] = match;

    if (role === "paragraph" && !text) continue;
    const name = role === "paragraph" ? text : quoted;

    const href =
      role === "link" ? URL_LINE.exec(lines[index + 1] ?? "")?.[1] : "";

    items.push(
      `${region} ${role} "${name}"${states}${href ? ` -> ${href}` : ""}`
    );
  }

  return items;
};

/** Every chrome landmark (header, sidebar, footer) as it is currently rendered. */
export const inspectChrome = async (page: Page): Promise<ChromeItem[]> => {
  const items: ChromeItem[] = [];

  for (const region of await page.locator(CHROME_REGIONS).all()) {
    const tag = await region.evaluate((element) =>
      element.tagName.toLowerCase()
    );

    items.push(...parseSnapshot(tag, await region.ariaSnapshot()));
  }

  return items;
};

const SETTLE_ATTEMPTS = 20;

const SETTLE_INTERVAL_MS = 250;

/**
 * Opens the controls that only exist behind a button at this width, so their
 * contents are part of the inventory: the docs drawer and the home menu.
 */
export const inspectMobileMenu = async (page: Page): Promise<ChromeItem[]> => {
  const trigger = page
    .getByRole("button", { name: /^(Open Sidebar|Toggle Menu)$/ })
    .first();

  await trigger.click();
  await page.locator("aside, header [aria-expanded=true]").first().waitFor();

  // Upstream's drawer fills in after it opens (its star link arrives late), so read until two reads agree.
  let items = await inspectChrome(page);

  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
    await page.waitForTimeout(SETTLE_INTERVAL_MS);
    const next = await inspectChrome(page);
    const settled = JSON.stringify(next) === JSON.stringify(items);

    items = next;

    if (settled) break;
  }

  return items;
};

/** The brand context menu both sites attach to their logo. */
export const inspectBrandMenu = async (page: Page): Promise<ChromeItem[]> => {
  await page
    .getByRole("link", { name: /^audiocn/ })
    .first()
    .click({ button: "right" });

  const menu = page.getByRole("menu");

  await menu.waitFor();
  const items = parseSnapshot("menu", await menu.ariaSnapshot());

  await page.keyboard.press("Escape");

  return items;
};

export interface SidebarState {
  aside: {
    collapsed: string;
    hovered: string;
    inert: boolean;
    width: number;
    x: number;
  };
  /** Which control has focus after the step, and whether it sits in the sidebar. */
  focus: { inSidebar: boolean; label: string };
  layoutCollapsed: string;
  panelInert: boolean;
  triggers: {
    collapsed: string;
    controls: string;
    expanded: string;
    inert: boolean;
    label: string;
  }[];
}

export interface SidebarStep {
  chrome: ChromeItem[];
  sidebar: SidebarState;
}

/** The sidebar's collapse, peek and re-expand contract as the page exposes it. */
export const inspectSidebarState = async (page: Page): Promise<SidebarState> =>
  page.evaluate(() => {
    const aside = document.querySelector("#nd-sidebar");
    const box = aside?.getBoundingClientRect();
    const focused = document.activeElement;

    return {
      aside: {
        collapsed: aside?.getAttribute("data-collapsed") ?? "",
        hovered: aside?.getAttribute("data-hovered") ?? "",
        inert: aside instanceof HTMLElement && aside.inert,
        width: Math.round(box?.width ?? 0),
        x: Math.round(box?.x ?? 0),
      },
      focus: {
        inSidebar: Boolean(focused?.closest("#nd-sidebar")),
        label: focused?.getAttribute("aria-label") ?? focused?.tagName ?? "",
      },
      layoutCollapsed:
        document
          .querySelector("#nd-docs-layout")
          ?.getAttribute("data-sidebar-collapsed") ?? "",
      panelInert: Boolean(
        document.querySelector<HTMLElement>("[data-sidebar-panel]")?.inert
      ),
      triggers: [
        ...document.querySelectorAll('[aria-controls="nd-sidebar"]'),
      ].map((trigger) => ({
        collapsed: trigger.getAttribute("data-collapsed") ?? "",
        controls: trigger.getAttribute("aria-controls") ?? "",
        expanded: trigger.getAttribute("aria-expanded") ?? "",
        inert: Boolean(trigger.closest("[inert]")),
        label: trigger.getAttribute("aria-label") ?? "",
      })),
    };
  });

const SETTLE_PASSES = 5;

const settleAnimations = async (page: Page) => {
  await page.evaluate(async (passes) => {
    for (let pass = 0; pass < passes; pass += 1) {
      // Looping animations (meters, spinners) never finish and are not part of the sidebar.
      const running = document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect !== null &&
            Number.isFinite(animation.effect.getComputedTiming().endTime)
        );

      if (running.length === 0) return;

      // A transition replaced by a newer one rejects; the next pass awaits the new one.
      await Promise.all(
        running.map((animation) => animation.finished.catch(() => undefined))
      );
    }
  }, SETTLE_PASSES);
};

export const captureSidebarStep = async (page: Page): Promise<SidebarStep> => {
  await settleAnimations(page);

  return {
    chrome: await inspectChrome(page),
    sidebar: await inspectSidebarState(page),
  };
};

const SIDEBAR_EDGE_X = 5;

const PAGE_CENTER = { x: 640, y: 400 };

/** Collapses the desktop sidebar and parks the pointer away from its edge. */
export const collapseSidebar = async (page: Page) => {
  await page
    .locator("aside")
    .getByRole("button", { name: "Collapse Sidebar" })
    .click();
  await page.mouse.move(PAGE_CENTER.x, PAGE_CENTER.y);
};

/**
 * Collapses the desktop sidebar, peeks it by hovering the left edge, moves
 * away, then expands it with the floating control that remains.
 */
export const inspectCollapsedSidebar = async (page: Page) => {
  await collapseSidebar(page);
  const collapsed = await captureSidebarStep(page);

  await page.mouse.move(SIDEBAR_EDGE_X, PAGE_CENTER.y);
  await page.locator('aside[data-hovered="true"]').waitFor();
  const peek = await captureSidebarStep(page);

  await page.mouse.move(PAGE_CENTER.x, PAGE_CENTER.y);
  await page.locator('aside[data-hovered="false"]').waitFor();
  await settleAnimations(page);

  await page
    .locator('[data-sidebar-panel] button[aria-controls="nd-sidebar"]')
    .click();
  const expanded = await captureSidebarStep(page);

  return { collapsed, expanded, peek };
};

export type CollapsedSidebar = Awaited<
  ReturnType<typeof inspectCollapsedSidebar>
>;

const STARS = /\d+ stars on GitHub/;

const PROGRESS = /^(\w+ button )"\d[\d.]* /;

const UPSTREAM_REPOSITORY = "https://github.com/audiocn/ui";

/** Star counts and the reading-progress value are live data, so only their wording is compared. */
export const normalizeChrome = (items: ChromeItem[]): ChromeItem[] =>
  items.map((item) =>
    item.replace(STARS, "N stars on GitHub").replace(PROGRESS, '$1"')
  );

/**
 * Upstream's chrome as our site must render it: the brand carries the Solid
 * port's name and the star link points at our repository.
 */
export const adaptChrome = (items: ChromeItem[]): ChromeItem[] =>
  normalizeChrome(items).map((item) =>
    item
      .replace(/^(\w+ link )"audiocn"( -> \/)$/, `$1"${siteConfig.name}"$2`)
      .replace(
        ` -> ${UPSTREAM_REPOSITORY}`,
        ` -> https://github.com/${siteConfig.githubRepo}`
      )
  );

const mapSteps = (
  steps: CollapsedSidebar,
  chrome: (items: ChromeItem[]) => ChromeItem[]
): CollapsedSidebar => ({
  collapsed: { ...steps.collapsed, chrome: chrome(steps.collapsed.chrome) },
  expanded: { ...steps.expanded, chrome: chrome(steps.expanded.chrome) },
  peek: { ...steps.peek, chrome: chrome(steps.peek.chrome) },
});

export const adaptCollapsedSidebar = (steps: CollapsedSidebar) =>
  mapSteps(steps, adaptChrome);

export const normalizeCollapsedSidebar = (steps: CollapsedSidebar) =>
  mapSteps(steps, normalizeChrome);
