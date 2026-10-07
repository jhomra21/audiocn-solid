import { expect, test } from "@playwright/test";

test("contributors is a complete static page with safe profiles and contribution links", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await page
    .getByRole("contentinfo")
    .getByRole("link", { name: "Contributors" })
    .click();
  await expect(page).toHaveURL(/\/contributors$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Contributors" })
  ).toBeVisible();
  await expect(
    page.locator("[data-route-not-yet-ported], [data-not-yet-ported]")
  ).toHaveCount(0);
  const list = page.getByRole("region", { name: "Contributor list" });
  await expect(
    list
      .getByRole("link")
      .first()
      .or(
        list.getByText("The contributor list is unavailable right now.", {
          exact: false,
        })
      )
  ).toBeVisible();

  for (const link of await list.getByRole("link").all()) {
    await expect(link).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/[\w-]+$/
    );
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }

  const contribute = page.getByRole("region", { name: "How to contribute" });
  await expect(
    contribute.getByRole("link", { name: "View the repository" })
  ).toHaveAttribute("href", "https://github.com/jhomra21/audiocn-solid");
  await expect(
    contribute.getByRole("link", { name: "Browse open issues" })
  ).toHaveAttribute("href", "https://github.com/jhomra21/audiocn-solid/issues");
  expect(failures).toEqual([]);
  await page.screenshot({
    path: "artifacts/contributors-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  await page.screenshot({
    path: "artifacts/contributors-mobile.png",
    fullPage: true,
  });
});

test("contributors fits narrow viewports with long repository and profile names", async ({
  page,
}) => {
  await page.goto("/contributors");
  await page.waitForFunction(() => window._$HY?.done);
  await page
    .getByRole("region", { name: "Contributor list" })
    .evaluate((list) => {
      const repository = list.querySelector("h2 + p");

      if (repository)
        repository.textContent = "owner/" + "repository".repeat(20);

      for (const name of list.querySelectorAll("a .font-heading")) {
        name.textContent = "contributor".repeat(20);
      }
    });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width);
    await page.screenshot({
      path: `artifacts/contributors-long-names-${width}.png`,
      fullPage: true,
    });
  }
});
