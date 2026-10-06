import { expect, type Page } from "@playwright/test";

export const openSearchMenu = async (page: Page) => {
  await page
    .getByRole("button", { name: /^Search|^Open Search$/iu })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").locator("input")).toBeFocused();
};

/** Compare real open-menu content, not the closed search trigger or inferred data. */
export const inspectOpenSearch = (page: Page) =>
  page.getByRole("dialog").evaluate((dialog) => {
    const text = (element: Element) =>
      (element.textContent ?? "").replace(/\s+/gu, " ").trim();

    const groups = [
      ...dialog.querySelectorAll('h3, [role="presentation"]'),
    ].flatMap((element) =>
      element.closest("button, a") ? [] : [text(element)]
    );

    const items = [
      ...dialog.querySelectorAll('[role="option"], [data-item-index]'),
    ].map((element) => {
      const hint = element.querySelector("kbd");

      const swatch = element.querySelector<HTMLElement>(
        '[data-swatch], [style*="--swatch"]'
      );

      return {
        title: hint
          ? text(element).slice(0, -text(hint).length).trim()
          : text(element),
        icons: [...element.querySelectorAll("svg")].map((svg) => ({
          viewBox: svg.getAttribute("viewBox"),
          paths: [...svg.querySelectorAll("path")].map((path) =>
            path.getAttribute("d")
          ),
        })),
        hint: hint ? text(hint) : null,
        swatch: swatch ? getComputedStyle(swatch).backgroundColor : null,
        current: element.querySelector('[aria-label="Current theme"]') !== null,
      };
    });

    return { groups, items };
  });
