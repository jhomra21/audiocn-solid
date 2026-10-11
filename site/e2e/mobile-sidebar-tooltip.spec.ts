import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

const artifactDir = join(
  import.meta.dirname,
  "../artifacts/mobile-sidebar-tooltip-fix-2026-10-09"
);

test.use({ hasTouch: true });

test("mobile sidebar opens without the star tooltip and keeps navigation accessible", async ({
  browserName,
  page,
}) => {
  await mkdir(artifactDir, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/level-meter");

  const tooltipEvents = await page.evaluateHandle(() => {
    const events: string[] = [];

    const isTooltipVisible = (element: Element) => {
      const style = getComputedStyle(element);

      return (
        style.visibility === "visible" &&
        style.display !== "none" &&
        style.opacity !== "0" &&
        element.getBoundingClientRect().width > 0
      );
    };

    const recordVisibleTooltips = () => {
      for (const tooltip of document.querySelectorAll(
        ".github-stars-tooltip"
      )) {
        if (isTooltipVisible(tooltip)) events.push("visible");
      }
    };

    document.addEventListener("focusin", (event) => {
      const target = event.target;

      if (
        target instanceof HTMLElement &&
        target.matches('a[aria-label$="stars on GitHub"]')
      ) {
        events.push("github-link-focused");
      }
    });

    new MutationObserver(recordVisibleTooltips).observe(
      document.documentElement,
      {
        attributes: true,
        childList: true,
        subtree: true,
      }
    );

    return events;
  });

  const openButton = page.getByRole("button", {
    name: "Open Sidebar",
    exact: true,
  });

  const eventsBeforeOpen = await tooltipEvents.evaluate(
    (events) => events.length
  );

  await openButton.tap();

  const dialog = page.getByRole("dialog", {
    name: "Documentation navigation",
  });

  const closeButton = dialog.getByRole("button", {
    name: "Close Sidebar",
    exact: true,
  });

  const tooltip = dialog.locator(".github-stars-tooltip");

  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(tooltip).toHaveCount(0);

  await expect(
    dialog.getByRole("link", { name: /stars on GitHub/ })
  ).toBeVisible();
  await expect(dialog.getByRole("combobox", { name: "Theme" })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Toggle Theme" })
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  expect(await tooltipEvents.evaluate((events) => events)).not.toContain(
    "visible"
  );
  expect(
    await tooltipEvents.evaluate(
      (events, start) => events.slice(start),
      eventsBeforeOpen
    )
  ).not.toContain("github-link-focused");

  const navigation = dialog.getByRole("navigation", {
    name: "Documentation",
  });

  const activeLink = navigation.getByRole("link", {
    name: "Level Meter",
    exact: true,
  });

  await expect(activeLink).toHaveAttribute("aria-current", "page");

  await page.screenshot({
    path: join(artifactDir, `${browserName}-mobile-sidebar-open.png`),
  });

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("link", { name: /stars on GitHub/ })
  ).toBeFocused();
  await expect(tooltip).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(openButton).toBeFocused();

  const eventsBeforeReopen = await tooltipEvents.evaluate(
    (events) => events.length
  );

  await openButton.tap();
  await expect(dialog).toBeVisible();
  await expect(closeButton).toBeFocused();
  await expect(tooltip).toHaveCount(0);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  expect(
    await tooltipEvents.evaluate(
      (events, start) => events.slice(start),
      eventsBeforeReopen
    )
  ).not.toContain("visible");

  await navigation.getByRole("link", { name: "Introduction" }).tap();
  await expect(page).toHaveURL(/\/docs$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".github-stars-tooltip")).toHaveCount(0);

  await writeFile(
    join(artifactDir, `${browserName}-mobile-sidebar-interactions.json`),
    `${JSON.stringify(
      {
        openedWithCloseButtonFocused: true,
        githubLinkNeverFocusedByOpeningDialog: true,
        tooltipAbsentOnOpen: true,
        transientTooltipNeverVisibleOnOpen: true,
        keyboardFocusOpensTooltip: true,
        escapeRestoresFocus: true,
        navigationClosesSidebar: true,
        viewport: { width: 390, height: 844 },
        browserName,
      },
      null,
      2
    )}\n`
  );
});

test("desktop GitHub tooltip still opens on hover and keyboard focus", async ({
  browser,
  browserName,
}) => {
  await mkdir(artifactDir, { recursive: true });

  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:4180",
    viewport: { width: 1280, height: 844 },
    hasTouch: false,
  });

  const page = await context.newPage();

  try {
    await page.goto("/docs");

    const stars = page
      .locator("#nd-sidebar")
      .getByRole("link", { name: /stars on GitHub/ });

    const tooltip = page.locator(".github-stars-tooltip");

    await stars.hover();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(0, 0);
    await expect(tooltip).toHaveCount(0);

    await stars.focus();
    await expect(tooltip).toBeVisible();

    await page.screenshot({
      path: join(artifactDir, `${browserName}-desktop-github-tooltip.png`),
    });
    await writeFile(
      join(artifactDir, `${browserName}-desktop-tooltip-interactions.json`),
      `${JSON.stringify(
        {
          hoverOpensTooltip: true,
          keyboardFocusOpensTooltip: true,
          viewport: { width: 1280, height: 844 },
          browserName,
        },
        null,
        2
      )}\n`
    );
  } finally {
    await context.close();
  }
});
