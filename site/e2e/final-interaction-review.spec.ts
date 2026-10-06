import { expect, test } from "@playwright/test";

import stars from "../lib/github-stars.json" with { type: "json" };

declare global {
  interface Window {
    __reviewMediaListeners: () => number;
  }
}

test.setTimeout(30_000);

test("nested native modals preserve their scroll lock in either cleanup order", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    let listeners = 0;
    const add = MediaQueryList.prototype.addEventListener;
    const remove = MediaQueryList.prototype.removeEventListener;

    MediaQueryList.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      listeners++;

      return add.call(this, type, listener, options);
    };

    MediaQueryList.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      listeners--;

      return remove.call(this, type, listener, options);
    };

    window.__reviewMediaListeners = () => listeners;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/knob");
  await page.evaluate(() => {
    document.body.style.overflow = "clip";
  });
  const original = "clip";
  const drawer = page.locator("#docs-sidebar-mobile");
  const search = page.getByRole("dialog", { name: "Search documentation" });
  const overflow = () => page.evaluate(() => document.body.style.overflow);
  const paths: string[][] = [];

  const baselineListeners = await page.evaluate(() =>
    window.__reviewMediaListeners()
  );

  for (let cycle = 0; cycle < 5; cycle++) {
    await page
      .getByRole("button", { name: "Open Sidebar", exact: true })
      .click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Meta+k");
    await expect(search).toBeVisible();
    const path = [await overflow()];
    expect(path[0]).toBe("hidden");
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(drawer).toHaveCount(0);
    await expect(search).toBeVisible();
    path.push(await overflow());
    expect(path[1]).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(search).toHaveCount(0);
    path.push(await overflow());
    expect(path[2]).toBe(original);
    expect(await page.evaluate(() => window.__reviewMediaListeners())).toBe(
      baselineListeners
    );
    paths.push(path);

    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Open Sidebar", exact: true })
      .click();
    await page.keyboard.press("Meta+k");
    await expect(search).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(search).toHaveCount(0);
    await expect(drawer).toBeVisible();
    expect(await overflow()).toBe("hidden");
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    expect(await overflow()).toBe(original);
    expect(await page.evaluate(() => window.__reviewMediaListeners())).toBe(
      baselineListeners
    );
  }

  await info.attach("nested-lock-paths", {
    body: JSON.stringify({ original, paths, baselineListeners }),
    contentType: "application/json",
  });
});

test("GitHub star tooltip paints inside the mobile modal and retains desktop placement", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/knob");
  await page.getByRole("button", { name: "Open Sidebar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Documentation navigation" });
  const trigger = dialog.getByRole("link", { name: /stars on GitHub/ });
  await trigger.focus();
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveText(
    `${new Intl.NumberFormat("en-US").format(stars.stargazersCount)} stars`
  );
  expect(
    await tooltip.evaluate((node) => node.closest("dialog") !== null)
  ).toBe(true);

  const painted = await tooltip.evaluate((node) => {
    const rect = node.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
      inViewport:
        rect.left >= 0 &&
        rect.top >= 0 &&
        rect.right <= innerWidth &&
        rect.bottom <= innerHeight,
      hit: document
        .elementsFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        .some((element) => element === node || node.contains(element)),
    };
  });

  expect(painted.width).toBeGreaterThan(0);
  expect(painted.height).toBeGreaterThan(0);
  expect(painted.inViewport).toBe(true);
  expect(painted.hit).toBe(true);
  await page.screenshot({
    path: info.outputPath("mobile-tooltip-painted.png"),
  });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page
    .locator("aside")
    .getByRole("link", { name: /stars on GitHub/ })
    .focus();
  await expect(tooltip).toBeVisible();
  expect(
    await tooltip.evaluate((node) => node.closest("dialog") === null)
  ).toBe(true);
  await info.attach("tooltip-paint", {
    body: JSON.stringify(painted),
    contentType: "application/json",
  });
});
