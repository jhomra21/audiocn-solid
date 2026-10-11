import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";

interface TouchProof {
  runtime: string;
  browserName: string;
  evidence: object[];
}

const attachTouchProof = async (
  info: TestInfo,
  name: string,
  evidence: TouchProof
) => {
  const path = info.outputPath(name);

  await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`);
  await info.attach(name, { path, contentType: "application/json" });
};

declare global {
  interface Window {
    touchProof: {
      event: Event;
      time: number;
      originalPointerId: number | null;
    }[];
  }
}

const touchGesture = async (
  page: Page,
  variant: string,
  targetId = "outside"
) =>
  page.getByTestId(targetId).evaluate(async (target, variant) => {
    const rect = target.getBoundingClientRect();

    const init = {
      bubbles: true,
      cancelable: true,
      pointerId: 41,
      pointerType: "touch",
      isPrimary: true,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
    };

    const point = {
      identifier: 7,
      target,
      clientX: init.clientX,
      clientY: init.clientY,
    };

    const touch = (type: string, touches: (typeof point)[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperties(event, {
        touches: { value: touches },
        changedTouches: { value: [point] },
      });
      target.dispatchEvent(event);
    };

    const prevent = (event: Event) => event.preventDefault();

    if (variant === "prevent-down")
      window.addEventListener("pointerdown", prevent, { once: true });

    if (variant === "prevent-up")
      window.addEventListener("pointerup", prevent, { once: true });

    if (variant === "prevent-start")
      window.addEventListener("touchstart", prevent, {
        once: true,
        passive: false,
      });

    if (variant === "prevent-end")
      window.addEventListener("touchend", prevent, {
        once: true,
        passive: false,
      });
    target.dispatchEvent(new PointerEvent("pointerdown", init));
    touch("touchstart", [point]);

    if (variant === "multi") {
      target.dispatchEvent(
        new PointerEvent("pointerdown", {
          ...init,
          pointerId: 42,
          isPrimary: false,
        })
      );
      touch("touchstart", [point, { ...point, identifier: 8 }]);
    }

    if (variant === "move")
      target.dispatchEvent(
        new PointerEvent("pointermove", { ...init, clientX: init.clientX + 30 })
      );

    if (variant === "touch-move")
      touch("touchmove", [{ ...point, clientX: point.clientX + 30 }]);

    if (variant === "scroll") document.dispatchEvent(new Event("scroll"));

    if (variant === "pointer-cancel")
      target.dispatchEvent(new PointerEvent("pointercancel", init));

    if (variant === "touch-cancel") touch("touchcancel", []);

    if (variant === "long")
      await new Promise((resolve) => setTimeout(resolve, 550));

    if (variant === "cancel") {
      target.dispatchEvent(new PointerEvent("pointercancel", init));
      touch("touchcancel", []);
    } else {
      const inside = document
        .querySelector('[data-testid="inside"]')
        ?.getBoundingClientRect();

      const end =
        variant === "end-inside" && inside
          ? { ...init, clientX: inside.x + 2, clientY: inside.y + 2 }
          : init;

      target.dispatchEvent(new PointerEvent("pointerup", end));
      touch("touchend", []);
    }
  }, variant);

export const runPopoverSuite = (runtime: string) => {
  test.describe("native popover touch", () => {
    test.use({ hasTouch: true });
    test("volume popover opens once on a native touch and closes on a second touch", async ({
      page,
    }, info) => {
      await page.goto("/popover");
      const trigger = page.getByRole("button", { name: "Volume", exact: true });
      await trigger.tap();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByRole("dialog")).toBeVisible();
      await trigger.tap();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await info.attach("native-popover-touch", {
        body: JSON.stringify({
          runtime,
          openedOnce: true,
          closedOnSecondTouch: true,
        }),
        contentType: "application/json",
      });
    });
  });

  test("volume popover supports keyboard, mute restore, outside dismissal and focus return", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/popover");
    const trigger = page.getByRole("button", { name: "Volume", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const popup = page.getByRole("dialog");
    await expect(popup).toBeVisible();
    const slider = popup.getByRole("slider", { name: "Volume", exact: true });
    await expect(slider).toHaveAttribute("aria-valuetext", "80%");
    await popup.getByRole("button", { name: "Mute" }).click();
    await expect(popup.getByRole("button", { name: "Unmute" })).toBeVisible();
    await popup.getByRole("button", { name: "Unmute" }).click();
    await expect(slider).toHaveAttribute("aria-valuetext", "80%");
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole("button", { name: "Outside popover" }).click();
    await expect(popup).toHaveCount(0);
    await mkdir(`test-results/popover/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/popover/${runtime}/dismissed-${info.repeatEachIndex}.png`,
    });
    expect(errors).toEqual([]);
  });

  test("a completed outside touch dismisses without a compatibility click", async ({
    page,
  }, info) => {
    await page.goto("/popover");
    const trigger = page.getByRole("button", { name: "Volume", exact: true });
    const popup = page.getByRole("dialog");

    const outside = page.getByRole("button", {
      name: "Outside popover",
      exact: true,
    });

    await trigger.click();
    await expect(popup).toBeVisible();

    // Model WebKit's native-touch sequence: the touch pointer completes, but
    // no compatibility click follows. This intentionally doesn't move focus.
    await outside.evaluate((target) => {
      const rect = target.getBoundingClientRect();

      const init = {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
        pointerType: "touch",
        isPrimary: true,
        clientX: rect.x + rect.width / 2,
        clientY: rect.y + rect.height / 2,
      };

      target.dispatchEvent(new PointerEvent("pointerdown", init));
      target.dispatchEvent(new PointerEvent("pointerup", init));
    });

    await expect(popup).toHaveCount(0, { timeout: 1000 });
    await info.attach("outside-touch-without-click", {
      body: JSON.stringify({
        runtime,
        closedWithoutCompatibilityClick: true,
      }),
      contentType: "application/json",
    });
  });

  for (const browserName of ["chromium", "webkit"] as const) {
    test(`touch completion gesture contracts (${browserName})`, async ({
      playwright,
      baseURL,
    }, info) => {
      const browser = await playwright[browserName].launch({
        args: browserName === "chromium" ? ["--disable-audio-output"] : [],
      });

      const page = await browser.newPage({ baseURL, hasTouch: true });
      const evidence: object[] = [];

      try {
        for (const variant of [
          "valid",
          "prevent-down",
          "prevent-up",
          "prevent-start",
          "prevent-end",
          "cancel",
          "pointer-cancel",
          "touch-cancel",
          "move",
          "touch-move",
          "scroll",
          "multi",
          "long",
          "end-inside",
          "custom-prevent",
          "inside",
          "excluded",
        ]) {
          await page.goto("/popover?touch-layers");
          const layer = page.getByTestId("outer-layer");
          await expect(layer).toBeVisible();

          if (variant === "custom-prevent")
            await page.getByTestId("prevent").click();

          const before = await page.evaluate(() => ({
            focus: document.activeElement?.tagName,
            scrollY,
          }));

          await page.evaluate(() => {
            window.touchProof = [];

            for (const type of [
              "pointerdown",
              "pointerup",
              "pointercancel",
              "touchstart",
              "touchend",
              "touchcancel",
              "click",
              "focusin",
              "interactOutside.pointerDownOutside",
            ]) {
              document.addEventListener(
                type,
                (event) => {
                  const original =
                    event instanceof CustomEvent
                      ? event.detail.originalEvent
                      : null;

                  window.touchProof.push({
                    event,
                    time: performance.now(),
                    originalPointerId:
                      original instanceof PointerEvent
                        ? original.pointerId
                        : null,
                  });
                },
                true
              );
            }
          });
          await touchGesture(
            page,
            variant,
            variant === "inside" || variant === "excluded" ? variant : "outside"
          );
          // Beyond the 400ms compatibility-click grace, including the final task.
          await page.waitForTimeout(500);

          const state = {
            variant,
            open: await layer.count(),
            calls: await page.getByTestId("outside-calls").textContent(),
            dismissals: await page.getByTestId("dismissals").textContent(),
            before,
            after: await page.evaluate(() => ({
              focus: document.activeElement?.tagName,
              scrollY,
            })),
            events: await page.evaluate(() =>
              window.touchProof.map(({ event, ...record }) => ({
                ...record,
                type: event.type,
                finalDefaultPrevented: event.defaultPrevented,
              }))
            ),
          };

          evidence.push(state);
          expect.soft(state.open, variant).toBe(variant === "valid" ? 0 : 1);
          expect
            .soft(state.calls, variant)
            .toBe(
              variant === "valid" || variant === "custom-prevent" ? "1" : "0"
            );
          expect
            .soft(state.dismissals, variant)
            .toBe(variant === "valid" ? "1" : "0");
          expect.soft(state.after.scrollY).toBe(state.before.scrollY);
          expect.soft(state.after.focus).toBe(state.before.focus);
          expect
            .soft(state.events.filter((event) => event.type === "click"))
            .toHaveLength(0);

          if (variant.startsWith("prevent-"))
            expect
              .soft(
                state.events.some((event) => event.finalDefaultPrevented),
                variant
              )
              .toBe(true);

          if (variant === "valid" || variant === "custom-prevent") {
            const outside = state.events.filter(
              (event) => event.type === "interactOutside.pointerDownOutside"
            );

            expect.soft(outside).toHaveLength(1);
            expect.soft(outside[0]?.originalPointerId).toBe(41);
            expect
              .soft(outside[0]?.finalDefaultPrevented)
              .toBe(variant === "custom-prevent");
          }
        }
      } finally {
        await attachTouchProof(info, "touch-gesture-matrix.json", {
          runtime,
          browserName,
          evidence,
        });
        await browser.close();
      }
    });

    test(`touch completion click races (${browserName})`, async ({
      playwright,
      baseURL,
    }, info) => {
      const browser = await playwright[browserName].launch({
        args: browserName === "chromium" ? ["--disable-audio-output"] : [],
      });

      const page = await browser.newPage({ baseURL, hasTouch: true });
      const evidence: object[] = [];

      try {
        for (const delay of [0, 350, 450]) {
          await page.goto("/popover?touch-layers");
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await page.getByTestId("prevent").click();
          await touchGesture(page, "valid", "outside-action");
          await page.waitForTimeout(delay);

          const click = await page
            .getByTestId("outside-action")
            .evaluate((target) => {
              const rect = target.getBoundingClientRect();

              const event = new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                detail: 1,
                clientX: rect.x + rect.width / 2,
                clientY: rect.y + rect.height / 2,
              });

              target.dispatchEvent(event);

              return { prevented: event.defaultPrevented };
            });

          await page.waitForTimeout(500);
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await expect(page.getByTestId("outside-calls")).toHaveText("1");
          expect
            .soft(click.prevented, `canceled dismissal at ${delay}ms`)
            .toBe(false);
          expect
            .soft(await page.getByTestId("activations").textContent())
            .toBe("1");
          evidence.push({
            delay,
            click,
            activations: await page.getByTestId("activations").textContent(),
            canceledCustomEventConsumedOnce: true,
          });
        }

        await page.goto("/popover?touch-layers");
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await touchGesture(page, "valid");
        // Stay within the bounded late-click guard, rather than locator polling's
        // progressively longer intervals that can miss the entire 400ms window.
        await page.waitForFunction(
          () => !document.querySelector('[data-testid="outer-layer"]')
        );
        await page.getByTestId("reopen").evaluate((element) => {
          if (element instanceof HTMLElement) element.click();
        });

        const replacement = await page
          .getByTestId("outside")
          .evaluate((target) => {
            const rect = target.getBoundingClientRect();
            // A distinct hit target is actually exposed after dismissal, not the
            // unchanged original outside button used by the former proof.
            const exposed = document.createElement("button");

            exposed.className = target.className;
            exposed.dataset.testid = "outside";
            exposed.textContent = "Exposed action";
            target.replaceWith(exposed);
            exposed.addEventListener(
              "click",
              () => exposed.setAttribute("data-click-through", "true"),
              { once: true }
            );

            const event = new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              detail: 1,
              clientX: rect.x + rect.width / 2,
              clientY: rect.y + rect.height / 2,
            });

            exposed.dispatchEvent(event);

            return {
              prevented: event.defaultPrevented,
              distinctTarget: exposed !== target,
            };
          });

        expect(replacement).toEqual({ prevented: true, distinctTarget: true });
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await expect(page.getByTestId("outside")).not.toHaveAttribute(
          "data-click-through",
          "true"
        );
        await touchGesture(page, "valid");
        await expect(page.getByTestId("outer-layer")).toHaveCount(0);
        evidence.push({
          replacementUnaffectedByLateClick: true,
          replacement,
          nextGestureStillWorks: true,
        });
        await page.goto("/popover");

        const trigger = page.getByRole("button", {
          name: "Volume",
          exact: true,
        });

        await trigger.click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await trigger.evaluate((target) => {
          const rect = target.getBoundingClientRect();

          const init = {
            bubbles: true,
            cancelable: true,
            pointerId: 41,
            pointerType: "touch",
            isPrimary: true,
            clientX: rect.x + 2,
            clientY: rect.y + 2,
          };

          target.dispatchEvent(new PointerEvent("pointerdown", init));
          target.dispatchEvent(new PointerEvent("pointerup", init));
        });
        await page.waitForTimeout(500);
        await expect(page.getByRole("dialog")).toBeVisible();
        evidence.push({ triggerExcludedFromFallback: true });
      } finally {
        await attachTouchProof(info, "touch-click-races.json", {
          runtime,
          browserName,
          evidence,
        });
        await browser.close();
      }
    });

    test(`touch completion late original activation (${browserName})`, async ({
      playwright,
      baseURL,
    }, info) => {
      const browser = await playwright[browserName].launch({
        args: browserName === "chromium" ? ["--disable-audio-output"] : [],
      });

      const page = await browser.newPage({ baseURL, hasTouch: true });
      const evidence: object[] = [];

      try {
        for (const canceled of [false, true]) {
          for (const downTarget of ["outside-action", "outside-child"]) {
            await page.goto("/popover?touch-layers");
            await expect(page.getByTestId("outer-layer")).toBeVisible();

            if (canceled) await page.getByTestId("prevent").click();
            await touchGesture(page, "valid", downTarget);
            await page.waitForTimeout(450);

            const clickTarget =
              downTarget === "outside-action"
                ? "outside-child"
                : "outside-action";

            const click = await page
              .getByTestId(clickTarget)
              .evaluate((target) => {
                const rect = target.getBoundingClientRect();

                const event = new MouseEvent("click", {
                  bubbles: true,
                  cancelable: true,
                  detail: 1,
                  clientX: rect.x + rect.width / 2,
                  clientY: rect.y + rect.height / 2,
                });

                target.dispatchEvent(event);

                return { prevented: event.defaultPrevented };
              });

            await page.waitForTimeout(100);

            const state = {
              canceled,
              downTarget,
              clickTarget,
              click,
              activations: await page.getByTestId("activations").textContent(),
              calls: await page.getByTestId("outside-calls").textContent(),
              open: await page.getByTestId("outer-layer").count(),
            };

            evidence.push(state);
            expect.soft(state.click.prevented).toBe(false);
            expect.soft(state.activations).toBe("1");
            expect.soft(state.calls).toBe("1");
            expect.soft(state.open).toBe(canceled ? 1 : 0);
          }
        }
      } finally {
        await attachTouchProof(info, "touch-late-activation.json", {
          runtime,
          browserName,
          evidence,
        });
        await browser.close();
      }
    });

    test(`touch completion transient layer (${browserName})`, async ({
      playwright,
      baseURL,
    }, info) => {
      const browser = await playwright[browserName].launch({
        args: browserName === "chromium" ? ["--disable-audio-output"] : [],
      });

      const page = await browser.newPage({ baseURL, hasTouch: true });
      const evidence: object[] = [];

      try {
        await page.goto("/popover?touch-layers");
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await touchGesture(page, "valid");
        await page.getByTestId("open-inner").evaluate((element) => {
          if (element instanceof HTMLElement) element.click();
        });
        await expect(page.getByTestId("inner-layer")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("inner-layer")).toHaveCount(0);
        await page.waitForTimeout(500);

        const state = {
          open: await page.getByTestId("outer-layer").count(),
          calls: await page.getByTestId("outside-calls").textContent(),
          dismissals: await page.getByTestId("dismissals").textContent(),
        };

        evidence.push(state);
        expect.soft(state.open).toBe(1);
        expect.soft(state.calls).toBe("0");
        expect.soft(state.dismissals).toBe("0");
      } finally {
        await attachTouchProof(info, "touch-transient-layer.json", {
          runtime,
          browserName,
          evidence,
        });
        await browser.close();
      }
    });

    test(`touch completion lifecycle and layers (${browserName})`, async ({
      playwright,
      baseURL,
    }, info) => {
      const browser = await playwright[browserName].launch({
        args: browserName === "chromium" ? ["--disable-audio-output"] : [],
      });

      const page = await browser.newPage({ baseURL, hasTouch: true });
      const evidence: object[] = [];

      try {
        for (const modal of [false, true]) {
          await page.goto("/popover?touch-layers");

          if (modal) await page.getByTestId("modal").click();
          await page.getByTestId("open-inner").click();
          await expect(page.getByTestId("inner-layer")).toBeVisible();
          await touchGesture(page, "valid", "inner-layer");
          await page.waitForTimeout(500);
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await expect(page.getByTestId("inner-layer")).toBeVisible();
          await touchGesture(page, "valid");
          await page.waitForTimeout(500);
          await expect(page.getByTestId("inner-layer")).toHaveCount(0);
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await expect(page.getByTestId("outside-calls")).toHaveText("0");
          await touchGesture(page, "valid");
          await expect(page.getByTestId("outer-layer")).toHaveCount(0);
          expect(
            await page.evaluate(() => document.body.style.pointerEvents)
          ).not.toBe("none");
          evidence.push({
            modal,
            onlyTopLayerDismissed: true,
            pointerBlockingRestored: true,
          });
        }

        for (const operation of ["reopen", "dispose", "new-layer"]) {
          await page.goto("/popover?touch-layers");
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await touchGesture(page, "valid");

          if (operation === "reopen") {
            await page.getByTestId("close").evaluate((element) => {
              if (element instanceof HTMLElement) element.click();
            });
            await expect(page.getByTestId("outer-layer")).toHaveCount(0);
            await page.getByTestId("reopen").evaluate((element) => {
              if (element instanceof HTMLElement) element.click();
            });
          } else if (operation === "dispose") {
            await page.getByTestId("mount").evaluate((element) => {
              if (element instanceof HTMLElement) element.click();
            });
            await expect(page.getByTestId("outer-layer")).toHaveCount(0);
            await page.getByTestId("mount").evaluate((element) => {
              if (element instanceof HTMLElement) element.click();
            });
          } else {
            await page.getByTestId("open-inner").evaluate((element) => {
              if (element instanceof HTMLElement) element.click();
            });
            await expect(page.getByTestId("inner-layer")).toBeVisible();
          }

          await page.waitForTimeout(500);
          await expect(page.getByTestId("outer-layer")).toBeVisible();
          await expect(page.getByTestId("outside-calls")).toHaveText("0");

          if (operation === "new-layer")
            await expect(page.getByTestId("inner-layer")).toBeVisible();

          evidence.push({ operation, staleCompletionIgnored: true });
        }

        // Real native touch cancellation after document capture must be honored.
        await page.goto("/popover?touch-layers");
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await page.evaluate(() =>
          window.addEventListener(
            "touchend",
            (event) => event.preventDefault(),
            { once: true, passive: false }
          )
        );
        await page.getByTestId("outside").tap();
        await page.waitForTimeout(500);
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await expect(page.getByTestId("outside-calls")).toHaveText("0");
        evidence.push({ preventedNativeTouchEndRetainedLayer: true });
        await page.goto("/popover?touch-layers");
        await expect(page.getByTestId("outer-layer")).toBeVisible();
        await page.getByTestId("outside").tap();
        await expect(page.getByTestId("outer-layer")).toHaveCount(0);
        await expect(page.getByTestId("outside-calls")).toHaveText("1");
        evidence.push({ unpreventedNativeBlankTapDismissed: true });
      } finally {
        await attachTouchProof(info, "touch-lifecycle.json", {
          runtime,
          browserName,
          evidence,
        });
        await browser.close();
      }
    });
  }
};
