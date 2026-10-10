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
    selectOutsideEvents: {
      type: string;
      phase: "capture" | "post-dispatch";
      timestamp: number;
      defaultPrevented: boolean;
      target: unknown;
      pointerType: string | null;
      coordinates: { x: number; y: number } | null;
      state: unknown;
    }[];
    selectOutsideCleanup?: () => void;
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
          const outsideTapPath = info.outputPath("outside-tap.json");

          const outsideTapBefore = await page.evaluate(
            ({ popup, anchor }) => {
              const ancestry = (element: Element | null) => {
                const nodes = [];

                for (
                  let node: Element | null = element;
                  node;
                  node = node.parentElement
                ) {
                  const style = getComputedStyle(node);
                  nodes.push({
                    tagName: node.tagName,
                    id: node.id || null,
                    role: node.getAttribute("role"),
                    label: node.getAttribute("aria-label"),
                    pointerEvents: style.pointerEvents,
                  });
                }

                return nodes;
              };

              const point = { x: 8, y: 600 };
              const hit = document.elementFromPoint(point.x, point.y);

              const inside = (bounds: typeof popup) =>
                point.x >= bounds.x &&
                point.x <= bounds.x + bounds.width &&
                point.y >= bounds.y &&
                point.y <= bounds.y + bounds.height;

              const style = (element: Element) => {
                const computed = getComputedStyle(element);

                return {
                  overflow: computed.overflow,
                  overflowX: computed.overflowX,
                  overflowY: computed.overflowY,
                  touchAction: computed.touchAction,
                  pointerEvents: computed.pointerEvents,
                  position: computed.position,
                };
              };

              window.selectOutsideEvents = [];

              const eventTypes = [
                "pointerdown",
                "pointerup",
                "pointercancel",
                "touchstart",
                "touchend",
                "touchcancel",
                "mousedown",
                "mouseup",
                "click",
                "focusin",
                "focusout",
                "interactOutside.pointerDownOutside",
                "interactOutside.focusOutside",
              ];

              const listeners: [string, EventListener][] = [];

              const snapshot = () => {
                const active = document.activeElement;

                const combobox = document.querySelector(
                  '[role="combobox"][aria-label="Output device"]'
                );

                const listbox = document.querySelector('[role="listbox"]');

                return {
                  timestamp: performance.now(),
                  scrollY,
                  activeElement:
                    active instanceof Element
                      ? {
                          tagName: active.tagName,
                          role: active.getAttribute("role"),
                          label: active.getAttribute("aria-label"),
                          id: active.id || null,
                        }
                      : null,
                  selectExpanded: combobox?.getAttribute("aria-expanded"),
                  listboxVisible:
                    listbox instanceof HTMLElement &&
                    listbox.getClientRects().length > 0,
                };
              };

              const describeEventTarget = (target: EventTarget | null) =>
                target instanceof Element
                  ? {
                      ancestry: ancestry(target),
                      text: target.textContent?.trim().slice(0, 80),
                    }
                  : target instanceof Node
                    ? { nodeName: target.nodeName }
                    : null;

              for (const type of eventTypes) {
                const recordEvent = (
                  event: Event,
                  phase: "capture" | "post-dispatch"
                ) => {
                  if (window.selectOutsideEvents.length >= 40) return;

                  const pointer = event instanceof PointerEvent ? event : null;
                  const mouse = event instanceof MouseEvent ? event : null;
                  const touch = event instanceof TouchEvent ? event : null;

                  const touchPoint =
                    touch?.changedTouches[0] ?? touch?.touches[0];

                  window.selectOutsideEvents.push({
                    type: event.type,
                    phase,
                    timestamp: performance.now(),
                    defaultPrevented: event.defaultPrevented,
                    target: describeEventTarget(event.target),
                    pointerType: pointer?.pointerType ?? null,
                    coordinates: mouse
                      ? { x: mouse.clientX, y: mouse.clientY }
                      : touchPoint
                        ? {
                            x: touchPoint.clientX,
                            y: touchPoint.clientY,
                          }
                        : null,
                    state: snapshot(),
                  });
                };

                const listener: EventListener = (event) => {
                  recordEvent(event, "capture");
                  queueMicrotask(() => recordEvent(event, "post-dispatch"));
                };

                document.addEventListener(type, listener, true);
                listeners.push([type, listener]);
              }

              window.selectOutsideCleanup = () => {
                for (const [type, listener] of listeners)
                  document.removeEventListener(type, listener, true);
              };

              return {
                point,
                popup,
                anchor,
                viewport: { width: innerWidth, height: innerHeight },
                popupOutside: !inside(popup),
                anchorOutside: !inside(anchor),
                hitTarget: describeEventTarget(hit),
                htmlStyle: style(document.documentElement),
                bodyStyle: style(document.body),
                initialState: snapshot(),
              };
            },
            { popup: popup!, anchor: anchor! }
          );

          let outsideTapAfter: unknown;

          try {
            expect(outsideTapBefore.point).toEqual({ x: 8, y: 600 });
            expect(outsideTapBefore.point.x).toBeLessThan(
              outsideTapBefore.viewport.width
            );
            expect(outsideTapBefore.point.y).toBeLessThan(
              outsideTapBefore.viewport.height
            );
            expect(outsideTapBefore.popupOutside).toBe(true);
            expect(outsideTapBefore.anchorOutside).toBe(true);
            await page.touchscreen.tap(8, 600);
          } finally {
            outsideTapAfter = await page.evaluate(() => {
              window.selectOutsideCleanup?.();
              const active = document.activeElement;

              const combobox = document.querySelector(
                '[role="combobox"][aria-label="Output device"]'
              );

              const listbox = document.querySelector('[role="listbox"]');

              return {
                timestamp: performance.now(),
                scrollY,
                activeElement:
                  active instanceof Element
                    ? {
                        tagName: active.tagName,
                        role: active.getAttribute("role"),
                        label: active.getAttribute("aria-label"),
                        id: active.id || null,
                      }
                    : null,
                selectExpanded: combobox?.getAttribute("aria-expanded"),
                listboxVisible:
                  listbox instanceof HTMLElement &&
                  listbox.getClientRects().length > 0,
              };
            });

            const outsideTap = await page.evaluate(
              ({ before, after }) => ({
                ...before,
                after,
                events: window.selectOutsideEvents,
              }),
              { before: outsideTapBefore, after: outsideTapAfter }
            );

            await writeFile(
              outsideTapPath,
              `${JSON.stringify(outsideTap, null, 2)}\n`
            );
            await info.attach("outside-tap.json", {
              path: outsideTapPath,
              contentType: "application/json",
            });
          }
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
