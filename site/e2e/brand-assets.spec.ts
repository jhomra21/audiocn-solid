import { expect, test } from "@playwright/test";

test("brand links offer keyboard and pointer copy/download actions without navigating", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  for (const route of ["/", "/docs"]) {
    await page.goto(route);

    const brand = page
      .locator("[data-brand-assets-trigger]")
      .filter({ visible: true })
      .first();

    await brand.focus();
    await page.keyboard.press("Shift+F10");
    await expect(
      page.getByRole("menu", { name: "Brand assets" })
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('viewBox="0 0 128 128"');
    await expect(page.getByRole("status")).toContainText("Copied as SVG");
    await brand.click({ button: "right" });
    const download = page.waitForEvent("download");
    await page
      .getByRole("menuitem", { name: "Download brand assets", exact: true })
      .click();
    expect((await download).suggestedFilename()).toBe(
      "audiocn-brand-assets.zip"
    );
    await expect(page).toHaveURL(
      new RegExp(`${route === "/" ? "/$" : "/docs$"}`)
    );
  }

  await page.screenshot({ path: "artifacts/brand-assets.png" });
});
