import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    selectScrollSamples: { scrollY: number; triggerTop: number }[];
    selectPointerDown:
      | (ReturnType<typeof selectSnapshot> & {
          eventType: string;
          pointerTarget: {
            tagName: string;
            role: string | null;
            text: string | undefined;
          } | null;
        })
      | null;
  }
}

function selectSnapshot(element: Element) {
  const rect = element.getBoundingClientRect();
  const visualViewport = window.visualViewport;

  return {
    scrollY,
    trigger: {
      top: rect.top,
      bottom: rect.bottom,
      documentTop: rect.top + scrollY,
      height: rect.height,
    },
    documentHeight: document.documentElement.scrollHeight,
    viewport: { width: innerWidth, height: innerHeight },
    visualViewport: visualViewport
      ? {
          offsetTop: visualViewport.offsetTop,
          pageTop: visualViewport.pageTop,
          width: visualViewport.width,
          height: visualViewport.height,
        }
      : null,
    activeElement:
      document.activeElement instanceof HTMLElement
        ? {
            tagName: document.activeElement.tagName,
            role: document.activeElement.getAttribute("role"),
            label: document.activeElement.getAttribute("aria-label"),
            text: document.activeElement.textContent?.trim().slice(0, 120),
          }
        : null,
  };
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
      await page.evaluate(() => document.fonts.ready);
      await trigger.evaluate((element) =>
        element.scrollIntoView({
          block: "center",
          inline: "nearest",
          behavior: "instant",
        })
      );
      await page.evaluate(() => window.scrollBy(0, -100));
      await expect(trigger).toBeInViewport({ ratio: 1 });

      const cycles: unknown[] = [];

      for (let cycle = 0; cycle < 3; cycle++) {
        const before = await trigger.evaluate(selectSnapshot);

        expect(before.scrollY).toBeGreaterThan(1000);
        await page.evaluate(() => {
          window.selectScrollSamples = [];
          window.selectPointerDown = null;

          const trigger = document.querySelector(
            '[role="combobox"][aria-label="Output device"]'
          );

          trigger?.addEventListener(
            "pointerdown",
            (event) => {
              const element = event.currentTarget;

              if (!(element instanceof Element)) return;

              const rect = element.getBoundingClientRect();
              const visualViewport = window.visualViewport;

              window.selectPointerDown = {
                scrollY,
                trigger: {
                  top: rect.top,
                  bottom: rect.bottom,
                  documentTop: rect.top + scrollY,
                  height: rect.height,
                },
                documentHeight: document.documentElement.scrollHeight,
                viewport: { width: innerWidth, height: innerHeight },
                visualViewport: visualViewport
                  ? {
                      offsetTop: visualViewport.offsetTop,
                      pageTop: visualViewport.pageTop,
                      width: visualViewport.width,
                      height: visualViewport.height,
                    }
                  : null,
                activeElement:
                  document.activeElement instanceof HTMLElement
                    ? {
                        tagName: document.activeElement.tagName,
                        role: document.activeElement.getAttribute("role"),
                        label:
                          document.activeElement.getAttribute("aria-label"),
                        text: document.activeElement.textContent
                          ?.trim()
                          .slice(0, 120),
                      }
                    : null,
                eventType: event.type,
                pointerTarget:
                  event.target instanceof Element
                    ? {
                        tagName: event.target.tagName,
                        role: event.target.getAttribute("role"),
                        text: event.target.textContent?.trim(),
                      }
                    : null,
              };
            },
            { capture: true, once: true }
          );

          const record = () => {
            const rect = document
              .querySelector('[role="combobox"][aria-label="Output device"]')
              ?.getBoundingClientRect();

            if (rect) {
              window.selectScrollSamples.push({
                scrollY,
                triggerTop: rect.top,
              });
            }

            if (document.documentElement.hasAttribute("data-record-scroll"))
              requestAnimationFrame(record);
          };

          document.documentElement.setAttribute("data-record-scroll", "");
          requestAnimationFrame(record);
        });
        await trigger.tap({ scroll: "none" });
        const listbox = page.getByRole("listbox");
        await expect(listbox).toBeVisible();

        const opened = await trigger.evaluate(selectSnapshot);
        const pointerDown = await page.evaluate(() => window.selectPointerDown);

        const samples = await page.evaluate(() => {
          return [...window.selectScrollSamples];
        });

        const opening = { before, pointerDown, opened, samples };
        const artifactPath = info.outputPath(`opening-${cycle}.json`);

        await writeFile(artifactPath, `${JSON.stringify(opening, null, 2)}\n`);
        await info.attach(`opening-${cycle}.json`, {
          path: artifactPath,
          contentType: "application/json",
        });

        expect(opened.scrollY).toBe(before.scrollY);
        expect(opened.trigger.top).toBe(before.trigger.top);
        expect(pointerDown).not.toBeNull();
        expect(pointerDown!.scrollY).toBe(before.scrollY);
        expect(pointerDown!.trigger.top).toBe(before.trigger.top);
        expect(
          samples.every((sample) => sample.scrollY === before.scrollY)
        ).toBe(true);
        await expect(
          listbox.locator('[aria-selected="true"]')
        ).toBeInViewport();
        await expect(listbox.locator('[aria-selected="true"]')).toBeFocused();
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

        const fullSamples = await page.evaluate(() => {
          document.documentElement.removeAttribute("data-record-scroll");

          return [...window.selectScrollSamples];
        });

        const after = await trigger.evaluate((element) => ({
          scrollY,
          top: element.getBoundingClientRect().top,
        }));

        const finalCycle = {
          before,
          after,
          samples: fullSamples,
          popup,
          anchor,
        };

        cycles.push(finalCycle);
        const cyclePath = info.outputPath(`scroll-cycle-${cycle}.json`);

        await writeFile(cyclePath, `${JSON.stringify(finalCycle, null, 2)}\n`);
        await info.attach(`scroll-cycle-${cycle}.json`, {
          path: cyclePath,
          contentType: "application/json",
        });
        expect(after.scrollY).toBe(before.scrollY);
        expect(after.top).toBe(before.trigger.top);
        expect(
          fullSamples.every((sample) => sample.scrollY === before.scrollY)
        ).toBe(true);
        expect(
          fullSamples.every(
            (sample) => sample.triggerTop === before.trigger.top
          )
        ).toBe(true);
      }

      const finalArtifactPath = info.outputPath("mobile-select-scroll.json");

      await writeFile(
        finalArtifactPath,
        `${JSON.stringify({ browserName, cycles, errors }, null, 2)}\n`
      );
      await info.attach("mobile-select-scroll.json", {
        path: finalArtifactPath,
        contentType: "application/json",
      });
      const screenshotPath = info.outputPath("mobile-select-scroll.png");

      await writeFile(screenshotPath, await page.screenshot());
      await info.attach("mobile-select-scroll.png", {
        path: screenshotPath,
        contentType: "image/png",
      });
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
}
