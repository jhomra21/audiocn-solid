import { expect, test } from "@playwright/test";

test("search contains links, theme actions, swatches and the current selection", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  await page.getByRole("button", { exact: true, name: "Search ⌘ K" }).click();
  const dialog = page.getByRole("dialog", { name: "Search documentation" });
  await expect(dialog.locator("h3")).toHaveText([
    "Getting started",
    "Components",
    "Blocks",
    "Hooks",
    "Concepts",
    "Links",
    "Theme",
  ]);
  await expect(
    dialog.getByRole("link", { name: "Contributors", exact: true })
  ).toHaveAttribute("href", "/contributors");
  await expect(
    dialog.getByRole("link", { name: "GitHub", exact: true })
  ).toHaveAttribute("href", "https://github.com/jhomra21/audiocn-solid");
  await expect(dialog.getByRole("button", { name: "Dark mode" })).toContainText(
    "D"
  );

  for (const label of ["Stone", "Ocean", "Rose", "Forest", "Violet", "Mono"]) {
    await expect(
      dialog
        .getByRole("button", { name: label, exact: true })
        .locator("[data-swatch]")
    ).toHaveCount(1);
  }

  await expect(
    dialog
      .getByRole("button", { name: "Stone", exact: true })
      .locator('[aria-label="Current theme"]')
  ).toHaveCount(1);
  await dialog.getByRole("button", { name: "Ocean", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
});

for (const [query, name, role] of [
  ["repository source", "GitHub", "link"],
  ["contributors", "Contributors", "link"],
  ["color ocean", "Ocean", "button"],
  ["light dark", "Dark mode", "button"],
] as const) {
  test(`search AND-matches extra keywords: ${query}`, async ({ page }) => {
    await page.goto("/docs");
    await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("searchbox").fill(query);
    await expect(dialog.getByRole(role, { name, exact: true })).toBeVisible();
    await expect(dialog.getByTestId("docs-search-groups")).toHaveCount(0);
  });
}

test("arrow selection, Enter, Escape and native modal focus containment", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  const trigger = page.getByRole("button", { name: "Search ⌘ K", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("searchbox");
  await expect(input).toBeFocused();

  for (const key of ["Shift+Tab", "Tab", "Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement)
      )
    ).toBe(true);
  }

  await input.focus();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/docs\/installation$/);
  await trigger.click();
  await dialog.getByRole("searchbox").press("ArrowUp");
  await dialog.getByRole("searchbox").press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "mono");
  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("typed results are AND-matched page groups with heading links that also close the current page", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("circular dragging");
  const group = dialog.getByRole("region", { name: "Knob", exact: true });
  await expect(group).toBeVisible();
  await expect(group.getByRole("link").first()).toHaveAttribute(
    "href",
    "/docs/components/knob"
  );
  await expect(group.getByRole("link").nth(1)).toHaveAttribute(
    "href",
    /\/docs\/components\/knob#/
  );
  await group.getByRole("link").nth(1).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/docs\/components\/knob#/);
  await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
  await dialog.getByRole("searchbox").fill("circular thisworddoesnotexist");
  await expect(
    dialog.getByRole("region", { name: "Knob", exact: true })
  ).toHaveCount(0);
});
