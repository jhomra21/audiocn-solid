import { expect, test } from "@playwright/test";

for (const width of [320, 390, 1280]) {
  test(`footer credits the Solid port and preserves original attribution at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toContainText("Solid port by jhomra21.");
    await expect(footer).toContainText(
      "Original AudioCN by fortysevenfx and orcdev."
    );

    for (const [name, href] of [
      ["jhomra21", "https://github.com/jhomra21"],
      ["fortysevenfx", "https://x.com/fortysevenfx"],
      ["orcdev", "https://x.com/orcdev"],
      ["Contributors", "/contributors"],
    ]) {
      const link = footer.getByRole("link", { name, exact: true });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href!);
    }

    expect(
      await footer.evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true);
    await info.attach("footer", {
      body: await footer.screenshot(),
      contentType: "image/png",
    });
  });
}
