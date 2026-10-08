import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

export const runSupportParitySuite = (runtime: string) => {
  test("context menu compound items toggle, skip disabled choices and navigate submenus", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/support");
    const trigger = page.getByTestId("support-menu-trigger");
    await trigger.focus();
    const open = () => trigger.click({ button: "right" });
    await open();
    const checkbox = page.getByRole("menuitemcheckbox", { name: "Monitor" });
    await expect(checkbox).toHaveAttribute("aria-checked", "false");
    await checkbox.click();
    await expect(checkbox).toHaveAttribute("aria-checked", "true");
    await expect(checkbox.locator("svg")).toHaveAttribute(
      "viewBox",
      "0 0 256 256"
    );
    await expect(
      page.getByRole("menuitemcheckbox", { name: "Unavailable" })
    ).toHaveAttribute("aria-disabled", "true");
    const sub = page.getByRole("menuitem", { name: "Routing" });
    await sub.hover();
    await sub.focus();
    await page.keyboard.press("ArrowRight");
    const stereo = page.getByRole("menuitemradio", { name: "Stereo" });
    await expect(stereo).toBeVisible();
    await stereo.click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await open();
    await sub.hover();
    await sub.focus();
    await page.keyboard.press("ArrowRight");
    await expect(stereo).toHaveAttribute("aria-checked", "true");
    await expect(stereo.locator("svg path")).toHaveAttribute(
      "d",
      "M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"
    );
    // Solid 2's primitive defers autofocus until paint. Navigate only once
    // focus has actually entered the submenu, not while the parent is focused.
    await expect
      .poll(() =>
        page
          .locator('[data-slot="context-menu-sub-content"]')
          .evaluate((node) => node.contains(document.activeElement))
      )
      .toBe(true);
    await page.keyboard.press("ArrowLeft");
    await expect(sub).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
    await info.attach(`context-menu-compounds-${runtime}.json`, {
      body: JSON.stringify({
        checkbox: true,
        radio: "stereo",
        submenuKeyboard: true,
        disabled: true,
      }),
      contentType: "application/json",
    });
  });

  test("select scroll arrows move only the bounded listbox and stop on dismissal", async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/support");
    const trigger = page.getByRole("combobox", { name: "Support select" });
    await trigger.click();
    const list = page.getByRole("listbox");
    const up = page.locator('[data-slot="select-scroll-up-button"]');
    const down = page.locator('[data-slot="select-scroll-down-button"]');
    await expect(up).toBeHidden();
    await expect(down).toBeVisible();
    const pageY = await page.evaluate(() => scrollY);
    await down.hover();
    await expect
      .poll(() => list.evaluate((node) => node.scrollTop))
      .toBeGreaterThan(48);
    await trigger.hover();
    const stopped = await list.evaluate((node) => node.scrollTop);
    await page.waitForTimeout(150);
    expect(await list.evaluate((node) => node.scrollTop)).toBe(stopped);
    await expect(up).toBeVisible();
    await up.hover();
    await expect
      .poll(() => list.evaluate((node) => node.scrollTop))
      .toBeLessThan(stopped);
    expect(await page.evaluate(() => scrollY)).toBe(pageY);
    await page.keyboard.press("Escape");
    await expect(list).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect(errors).toEqual([]);
    await info.attach(`select-scroll-compounds-${runtime}.json`, {
      body: JSON.stringify({ pageY, stopped, boundedScroll: true }),
      contentType: "application/json",
    });
  });

  test("support owners expose the upstream compound parts and variant functions", async ({
    page,
  }, info) => {
    await page.goto("/contracts");

    const exports = await page.evaluate(
      async (root) => {
        const select = await import(/* @vite-ignore */ `${root}/select.tsx`);

        const menu = await import(
          /* @vite-ignore */ `${root}/context-menu.tsx`
        );

        const toggle = await import(/* @vite-ignore */ `${root}/toggle.tsx`);
        const tabs = await import(/* @vite-ignore */ `${root}/tabs.tsx`);

        return {
          select: Object.keys(select),
          menu: Object.keys(menu),
          toggle: Object.keys(toggle),
          tabs: Object.keys(tabs),
        };
      },
      `/@fs${resolve(import.meta.dirname, "../components/ui")}`
    );

    expect(exports.select).toEqual(
      expect.arrayContaining([
        "SelectLabel",
        "SelectSeparator",
        "SelectScrollUpButton",
        "SelectScrollDownButton",
      ])
    );
    expect(exports.menu).toEqual(
      expect.arrayContaining([
        "ContextMenuCheckboxItem",
        "ContextMenuPortal",
        "ContextMenuShortcut",
        "ContextMenuSub",
        "ContextMenuSubContent",
        "ContextMenuSubTrigger",
      ])
    );
    expect(exports.toggle).toContain("toggleVariants");
    expect(exports.tabs).toContain("tabsListVariants");
    await info.attach(`support-exports-${runtime}.json`, {
      body: JSON.stringify(exports),
      contentType: "application/json",
    });
  });

  for (const coarse of [false, true]) {
    test.describe(`fader ${coarse ? "coarse" : "fine"} pointer hit regions`, () => {
      test.use({ hasTouch: coarse });

      for (const id of ["rtl-slider", "fader-vertical-drag"]) {
        test(`${id} accepts native input outside the visible control`, async ({
          page,
        }, info) => {
          await page.goto("/controls");
          const fixture = page.getByTestId(id);
          const thumb = fixture.locator('[data-slot="fader-thumb"]');
          const control = fixture.locator('[data-slot="fader-control"]');
          await control.scrollIntoViewIfNeeded();
          const bounds = await control.boundingBox();
          expect(bounds).not.toBeNull();
          const before = await thumb.getAttribute("aria-valuenow");
          const vertical = id === "fader-vertical-drag";

          const point = {
            x:
              bounds!.x + (vertical ? -(coarse ? 10 : 5) : bounds!.width * 0.2),
            y:
              bounds!.y +
              (vertical ? bounds!.height * 0.2 : -(coarse ? 10 : 5)),
          };

          if (coarse) await page.touchscreen.tap(point.x, point.y);
          else await page.mouse.click(point.x, point.y);
          await expect(thumb).not.toHaveAttribute("aria-valuenow", before!);
          await expect(fixture.getByRole("status")).toContainText(
            "track-press"
          );
          await info.attach(`fader-hit-${runtime}-${id}-${coarse}.json`, {
            body: JSON.stringify({
              before,
              after: await thumb.getAttribute("aria-valuenow"),
              point,
              coarse,
            }),
            contentType: "application/json",
          });
        });
      }
    });
  }
};
