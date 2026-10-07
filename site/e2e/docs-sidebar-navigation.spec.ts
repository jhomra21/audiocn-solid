import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

const artifactDir = join(
  import.meta.dirname,
  "../artifacts/sidebar-navigation-fidelity"
);

test("desktop docs navigation preserves sidebar position across routes", async ({
  page,
}) => {
  await mkdir(artifactDir, { recursive: true });

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/docs/hooks/use-demo-signal");

  const measure = () =>
    page.evaluate(() => {
      const sidebar = document.querySelector<HTMLElement>("#nd-sidebar")!;

      const viewport = sidebar.querySelector<HTMLElement>(
        ":scope > div:nth-child(2)"
      )!;

      const rect = sidebar.getBoundingClientRect();

      return {
        height: rect.height,
        left: rect.left,
        maxScrollTop: viewport.scrollHeight - viewport.clientHeight,
        scrollTop: viewport.scrollTop,
        top: rect.top,
        viewportHeight: viewport.clientHeight,
        width: rect.width,
      };
    });

  const navigationViewport = page.locator(
    "#nd-sidebar [data-docs-navigation-viewport]"
  );

  await expect(
    page.locator(
      '#nd-sidebar [data-docs-navigation-viewport] a[href="/docs/hooks/use-demo-signal"]'
    )
  ).toBeInViewport();

  await navigationViewport.evaluate((element) => {
    element.scrollTop = 1300;
  });

  const measurements = [
    { route: "/docs/hooks/use-demo-signal (direct)", ...(await measure()) },
  ];

  await page.screenshot({
    path: join(artifactDir, "before.png"),
  });

  for (const route of [
    "/docs/hooks/use-frame-source",
    "/docs/hooks/use-level",
    "/docs/hooks/use-clip-hold",
  ]) {
    const link = page.locator(
      `#nd-sidebar [data-docs-navigation-viewport] a[href="${route}"]`
    );

    await expect(link).toBeInViewport();

    const beforeNavigation = await measure();

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("#nd-sidebar [aria-current=page]")).toBeVisible();

    const afterNavigation = await measure();
    expect(afterNavigation).toEqual(beforeNavigation);
    measurements.push({ route, ...afterNavigation });
  }

  await navigationViewport.evaluate((element) => {
    element.scrollTop = 1400;
  });

  const beforeRevisit = await measure();

  const revisit = page.locator(
    '#nd-sidebar [data-docs-navigation-viewport] a[href="/docs/hooks/use-frame-source"]'
  );

  await expect(revisit).toBeInViewport();

  await revisit.click();
  await expect(page).toHaveURL(/\/docs\/hooks\/use-frame-source$/);
  expect(await measure()).toEqual(beforeRevisit);

  measurements.push({
    route: "/docs/hooks/use-frame-source (revisit)",
    ...(await measure()),
  });

  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/hooks\/use-clip-hold$/);
  expect(await measure()).toEqual(beforeRevisit);
  await page.goForward();
  await expect(page).toHaveURL(/\/docs\/hooks\/use-frame-source$/);
  expect(await measure()).toEqual(beforeRevisit);

  await navigationViewport.evaluate((element) => {
    element.scrollTop = 0;
  });

  const minimumRevealScrollTop = await navigationViewport.evaluate(
    (element) => {
      const target = element.querySelector(
        'a[href="/docs/hooks/use-clip-hold"]'
      )!;

      return (
        target.getBoundingClientRect().bottom -
        element.getBoundingClientRect().bottom
      );
    }
  );

  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/hooks\/use-clip-hold$/);
  await expect(
    page.locator(
      '#nd-sidebar [data-docs-navigation-viewport] a[aria-current="page"]'
    )
  ).toBeInViewport();
  expect((await measure()).scrollTop).toBeCloseTo(minimumRevealScrollTop, 0);
  measurements.push({
    route: "/docs/hooks/use-clip-hold (offscreen back)",
    ...(await measure()),
  });
  await page.screenshot({
    path: join(artifactDir, "after.png"),
  });
  await writeFile(
    join(artifactDir, "measurements.json"),
    `${JSON.stringify(measurements, null, 2)}\n`
  );
});

test("search navigation reveals a distant active sidebar page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/docs");

  const navigationViewport = page.locator(
    "#nd-sidebar [data-docs-navigation-viewport]"
  );

  await navigationViewport.evaluate((element) => {
    element.scrollTop = 0;
  });

  await page.getByRole("button", { name: "Search ⌘ K", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search documentation" });
  await dialog.getByRole("searchbox").fill("useDemoSignal");

  const result = dialog
    .locator('a[href="/docs/hooks/use-demo-signal"]')
    .first();

  await expect(result).toBeVisible();
  await result.click();
  await expect(page).toHaveURL(/\/docs\/hooks\/use-demo-signal$/);

  const activeLink = page.locator(
    '#nd-sidebar [data-docs-navigation-viewport] a[aria-current="page"]'
  );

  await expect(activeLink).toHaveAttribute(
    "href",
    "/docs/hooks/use-demo-signal"
  );
  await expect(activeLink).toBeInViewport();

  const before = await navigationViewport.evaluate(
    (element) => element.scrollTop
  );

  const visibleNeighbor = page.locator(
    '#nd-sidebar [data-docs-navigation-viewport] a[href="/docs/components/sound-pad"]'
  );

  await expect(visibleNeighbor).toBeInViewport();
  await visibleNeighbor.click();
  await expect(page).toHaveURL(/\/docs\/components\/sound-pad$/);
  await expect(
    page.locator(
      '#nd-sidebar [data-docs-navigation-viewport] a[aria-current="page"]'
    )
  ).toBeInViewport();
  expect(
    await navigationViewport.evaluate((element) => element.scrollTop)
  ).toBe(before);
});
