import { expect, test } from "@playwright/test";

const docsComponents = [
  "callout",
  "steps",
  "step",
  "tabs",
  "tab",
  "component-preview",
  "component-source",
  "install-command",
  "props-table",
  "type-table",
] as const;

test("MDX pipeline prerenders docs content and custom components", async ({
  page,
  request,
}) => {
  const docsResponse = await request.get("/docs/components/level-meter");
  const docsHtml = await docsResponse.text();

  expect(docsResponse.ok()).toBe(true);
  expect(docsHtml).toContain("Level Meter for Solid");
  expect(docsHtml).toContain(
    "A peak and RMS level meter with zones, peak hold, a scale, a readout and a clip light."
  );
  expect(docsHtml).toContain('id="installation"');
  expect(docsHtml).toContain("<table");
  expect(docsHtml).toContain('class="shiki');

  await page.goto("/spikes/mdx");

  const mdx = page.locator('[data-spike="mdx"]');

  await expect(
    mdx.getByRole("heading", { name: "MDX Component Fixture", level: 1 })
  ).toBeVisible();
  await expect(mdx.locator('a[href="#callout"]').first()).toBeVisible();
  await expect(
    mdx.locator('[data-docs-component="component-source"] figure.shiki')
  ).toBeVisible();

  for (const name of docsComponents) {
    await expect(
      mdx.locator(`[data-docs-component="${name}"]`).first()
    ).toBeVisible();
  }
});
