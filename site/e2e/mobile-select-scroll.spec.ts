import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    selectScrollSamples: number[];
  }
}

for (const browserName of ["webkit", "chromium"] as const) {
  test(`mobile Output select never scrolls the homepage (${browserName})`, async ({
    playwright,
    baseURL,
  }, info) => {
    const browser = await playwright[browserName].launch({
      args: browserName === "chromium" ? ["--disable-audio-output"] : [],
    });

    const context = await browser.newContext({
      ...playwright.devices["iPhone 13"],
      baseURL,
      viewport: { width: 390, height: 844 },
    });

    const page = await context.newPage();

    try {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const trigger = page.getByRole("combobox", { name: "Output device" });
      await trigger.scrollIntoViewIfNeeded();
      await expect(trigger).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(
          () =>
            page.evaluate(
              () =>
                [
                  ...document.querySelectorAll(
                    '[data-slot="showcase-card"] [data-slot="skeleton"]'
                  ),
                ].filter((skeleton) => {
                  const { bottom, top } = skeleton.getBoundingClientRect();

                  return bottom >= -200 && top <= window.innerHeight + 200;
                }).length
            ),
          { message: "nearby lazy showcase tiles finish loading" }
        )
        .toBe(0);
      await page.evaluate(() => window.scrollBy(0, -100));

      const cycles: unknown[] = [];

      for (let cycle = 0; cycle < 3; cycle++) {
        const before = await trigger.evaluate((element) => ({
          scrollY,
          top: element.getBoundingClientRect().top,
        }));

        expect(before.scrollY).toBeGreaterThan(1000);
        await page.evaluate(() => {
          window.selectScrollSamples = [];

          const record = () => {
            window.selectScrollSamples.push(scrollY);

            if (document.documentElement.hasAttribute("data-record-scroll"))
              requestAnimationFrame(record);
          };

          document.documentElement.setAttribute("data-record-scroll", "");
          requestAnimationFrame(record);
        });
        await trigger.tap();
        const listbox = page.getByRole("listbox");
        await expect(listbox).toBeVisible();

        const opened = await trigger.evaluate((element) => ({
          scrollY,
          top: element.getBoundingClientRect().top,
        }));

        await info.attach(`opening-${cycle}.json`, {
          body: JSON.stringify({ before, opened }, null, 2),
          contentType: "application/json",
        });
        expect(opened.scrollY).toBe(before.scrollY);
        await expect(
          listbox.locator('[aria-selected="true"]')
        ).toBeInViewport();
        const popup = await listbox.boundingBox();
        const anchor = await trigger.boundingBox();
        expect(popup).not.toBeNull();
        expect(anchor).not.toBeNull();
        expect(
          Math.min(
            Math.abs(popup!.y - (anchor!.y + anchor!.height)),
            Math.abs(popup!.y + popup!.height - anchor!.y)
          )
        ).toBeLessThanOrEqual(12);
        await page.keyboard.press("Home");
        await expect(
          page.getByRole("option", { name: "MacBook Pro Speakers" })
        ).toBeFocused();
        await page.keyboard.type("Air");
        await expect(
          page.getByRole("option", { name: /AirPods Pro/ })
        ).toBeFocused();

        if (cycle === 0) {
          await page.keyboard.press("Enter");
          await expect(trigger).toContainText("AirPods Pro");
        } else if (cycle === 1) {
          await page.keyboard.press("Escape");
        } else {
          await page.touchscreen.tap(8, 600);
        }

        await expect(listbox).toBeHidden();

        if (cycle < 2) await expect(trigger).toBeFocused();

        const after = await trigger.evaluate((element) => ({
          scrollY,
          top: element.getBoundingClientRect().top,
        }));

        const samples = await page.evaluate(() => {
          document.documentElement.removeAttribute("data-record-scroll");

          return window.selectScrollSamples;
        });

        cycles.push({ before, after, samples, popup, anchor });
        await info.attach(`scroll-cycle-${cycle}.json`, {
          body: JSON.stringify(cycles.at(-1), null, 2),
          contentType: "application/json",
        });
        expect(after.scrollY).toBe(before.scrollY);
        expect(after.top).toBe(before.top);
        expect(samples.every((value) => value === before.scrollY)).toBe(true);
      }

      await info.attach("mobile-select-scroll.json", {
        body: JSON.stringify({ browserName, cycles, errors }, null, 2),
        contentType: "application/json",
      });
      await info.attach("mobile-select-scroll.png", {
        body: await page.screenshot(),
        contentType: "image/png",
      });
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}
