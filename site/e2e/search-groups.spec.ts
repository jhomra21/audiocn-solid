import { expect, test } from "@playwright/test";

test("the search dialog lists docs sections, overview first, before anything is typed", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  await page.getByRole("button", { exact: true, name: "Search ⌘ K" }).click();

  const dialog = page.getByRole("dialog", { name: "Search documentation" });
  const groups = dialog.getByTestId("docs-search-groups");

  await expect(groups.locator("h3")).toHaveText([
    "Getting started",
    "Components",
    "Blocks",
    "Hooks",
    "Concepts",
    "Links",
    "Theme",
  ]);

  const section = (name: string) => groups.getByRole("region", { name });

  await expect(section("Getting started").getByRole("link")).toHaveText([
    "Introduction",
    "Installation",
  ]);
  await expect(section("Components").getByRole("link").first()).toHaveText(
    "All components"
  );
  await expect(
    section("Components").getByRole("link", { name: "All components" })
  ).toHaveAttribute("href", "/docs/components");
  await expect(section("Components").getByRole("link").nth(1)).toHaveText(
    "Level Meter"
  );
  await expect(
    section("Blocks").getByRole("link", { name: "All blocks" })
  ).toHaveAttribute("href", "/docs/blocks");
  await expect(section("Blocks").getByRole("link").nth(1)).toHaveText(
    "System Audio Mixer"
  );
  await expect(section("Hooks").getByRole("link").first()).toHaveText(
    "useDemoSignal"
  );
  await expect(section("Concepts").getByRole("link").first()).toHaveText(
    "Decibels and levels"
  );

  await dialog.getByRole("searchbox").fill("Level Meter");
  await expect(groups).toHaveCount(0);
  await expect(
    dialog.getByRole("link", { name: /Level Meter/ }).first()
  ).toBeVisible();
});

const SEARCH_TARGETS = [
  { name: "Knob", path: "/docs/components/knob" },
  { name: "Level Meter", path: "/docs/components/level-meter" },
] as const;

for (const typed of [false, true]) {
  for (const { name, path } of SEARCH_TARGETS) {
    test(`choosing ${name} ${typed ? "from search results" : "from the section list"} closes the dialog and ends on ${path}`, async ({
      page,
    }) => {
      await page.goto("/docs/components/knob");
      await page.evaluate(() => {
        Object.assign(window, { clientNavigationMarker: true });
      });
      await page
        .getByRole("button", { exact: true, name: "Search ⌘ K" })
        .click();

      const dialog = page.getByRole("dialog", { name: "Search documentation" });

      if (typed) {
        await dialog.getByRole("searchbox").fill(name);
        await expect(
          dialog.getByTestId("docs-search-results").getByRole("link").first()
        ).toBeVisible();
      }

      const scope = typed
        ? dialog.getByTestId("docs-search-results")
        : dialog.getByTestId("docs-search-groups");

      await scope.getByRole("link", { exact: !typed, name }).first().click();

      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      expect(
        await page.evaluate(() => "clientNavigationMarker" in window)
      ).toBe(true);
    });
  }
}
