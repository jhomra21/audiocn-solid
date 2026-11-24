import { mkdir, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { createServer } from "vite";

import { dragSlider } from "./slider-drag";

const section = (page: Page, id: string) => page.getByTestId(id);

const journal = (page: Page, id: string) =>
  section(page, id).getByRole("status");

const readJournal = async (
  page: Page,
  id: string
): Promise<
  {
    value: string;
    reason: string;
    type: string;
  }[]
> => JSON.parse((await journal(page, id).textContent()) ?? "[]");

const dialBounds = async (dial: Locator) => {
  await dial.scrollIntoViewIfNeeded();

  const bounds = await dial.boundingBox();

  if (!bounds) throw new Error("Control has no browser bounds.");

  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    radius: bounds.width * 0.4,
  };
};

declare global {
  interface Window {
    __knobAudioGraph?: { context: AudioContext; destination: GainNode };
    __knobAudioConnections?: AudioNode[];
    __knobAudioGains?: GainNode[];
    __knobResumeEvents?: string[];
    __resolveKnobResumes?: (() => void)[];
  }
}

export const runControlsSuite = (runtime: string) => {
  const dragEvidence: unknown[] = [];

  test(`lcd display renders its parts and selects an accessible option (${runtime})`, async ({
    page,
  }, info) => {
    await page.goto("/controls");

    const display = page
      .getByTestId("lcd-display")
      .locator('[data-slot="lcd-display"]');

    await expect(display).toHaveAttribute("data-variant", "amber");
    await expect(display).toHaveAttribute("data-size", "lg");
    await expect(display).toHaveAttribute("data-appearance", "dark");

    for (const slot of [
      "lcd-display-screen",
      "lcd-display-content",
      "lcd-display-row",
      "lcd-display-label",
      "lcd-display-value",
      "lcd-display-select-trigger",
      "lcd-display-status",
    ]) {
      await expect(
        display.locator(`[data-slot="${slot}"]`).first()
      ).toBeVisible();
    }

    const trigger = display.locator('[data-slot="lcd-display-select-trigger"]');
    await expect
      .poll(() =>
        trigger.evaluate((element) => getComputedStyle(element).cursor)
      )
      .not.toBe("pointer");
    await expect(trigger).toHaveAttribute("data-placeholder", "");
    await expect(trigger).toContainText("Choose model");
    await expect(trigger).toHaveAttribute(
      "aria-labelledby",
      /(^| )lcd-model-label( |$)/
    );
    await expect(trigger).not.toHaveAttribute("data-changed");
    await trigger.click();
    const popup = page.locator('[data-slot="lcd-display-select-content"]');
    await expect(popup).toHaveAttribute("data-variant", "amber");
    await expect(popup).toHaveAttribute("data-appearance", "dark");

    const rootInk = await display.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--lcd-display-ink")
    );

    expect(rootInk).not.toBe("");
    await expect
      .poll(() =>
        popup.evaluate((element) =>
          element.style.getPropertyValue("--lcd-display-ink")
        )
      )
      .toBe(rootInk);
    const triggerBounds = await trigger.boundingBox();
    const popupBounds = await popup.boundingBox();
    expect(triggerBounds).not.toBeNull();
    expect(popupBounds).not.toBeNull();
    expect(
      Math.abs(
        triggerBounds!.x +
          triggerBounds!.width -
          (popupBounds!.x + popupBounds!.width)
      )
    ).toBeLessThan(2);

    const changed = trigger.evaluate(
      (element) =>
        new Promise<void>((resolve) => {
          const observer = new MutationObserver(() => {
            if (element.hasAttribute("data-changed")) {
              observer.disconnect();
              resolve();
            }
          });

          observer.observe(element, {
            attributes: true,
            attributeFilter: ["data-changed"],
          });
        })
    );

    await page.getByRole("option", { name: "Sonnet" }).click();
    await changed;
    await expect(trigger).toContainText("Sonnet");
    await expect(trigger).not.toHaveAttribute("data-placeholder");
    await trigger.click();
    const selectedSonnet = page.getByRole("option", { name: "Sonnet" });
    await selectedSonnet.click();
    await expect(trigger).toContainText("Sonnet");
    await expect(trigger).not.toHaveAttribute("data-placeholder");
    await info.attach(`lcd-display-${runtime}`, {
      body: JSON.stringify({
        appearance: await display.getAttribute("data-appearance"),
        labelledBy: await trigger.getAttribute("aria-labelledby"),
        variant: await display.getAttribute("data-variant"),
      }),
      contentType: "application/json",
    });
  });

  test(`LCD display status stays hidden until it has a state (${runtime})`, async ({
    page,
  }) => {
    await page.goto("/controls");

    const status = section(page, "lcd-status").locator(
      '[data-slot="lcd-display-status"]'
    );

    await expect(status).toHaveCount(0);
    await section(page, "lcd-status")
      .getByRole("button", { name: "Set busy" })
      .click();
    await expect(status).toHaveAttribute("data-state", "busy");
    await section(page, "lcd-status")
      .getByRole("button", { name: "Clear status" })
      .click();
    await expect(status).toHaveCount(0);
    await expect(
      section(page, "lcd-display").locator('[data-slot="lcd-display-status"]')
    ).toHaveAttribute("data-state", "busy");
  });

  test.describe("LCD number field", () => {
    const fieldInput = (page: Page, id: string) =>
      section(page, id).getByRole("textbox", { name: "Tempo" });

    test(`is named by its row label, described by its unit and submits a value (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");

      await expect(input).toHaveValue("120");
      await expect(input).toHaveAttribute(
        "aria-roledescription",
        "Number field"
      );
      await expect(input).toHaveAccessibleDescription("Bpm");
      await expect(
        section(page, "number-field").locator('input[name="bpm"]')
      ).toHaveValue("120");
      await expect(
        section(page, "number-field").getByRole("button", { name: "Reset" })
      ).toBeDisabled();
    });

    test(`steps with the keyboard, jumps to the range and commits on key up (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");

      await input.focus();
      await page.keyboard.press("ArrowUp");
      await expect(input).toHaveValue("121");
      await page.keyboard.press("Shift+ArrowUp");
      await expect(input).toHaveValue("131");
      await page.keyboard.press("Alt+ArrowDown");
      await expect(input).toHaveValue("130.9");
      await page.keyboard.press("Home");
      await expect(input).toHaveValue("20");
      await page.keyboard.press("End");
      await expect(input).toHaveValue("300");
      await expect(
        section(page, "number-field").locator('input[name="bpm"]')
      ).toHaveValue("300");

      const events = await readJournal(page, "number-field");

      expect(events.slice(0, 2)).toEqual([
        { reason: "keyboard", type: "change", value: "121" },
        { reason: "keyboard", type: "commit", value: "121" },
      ]);
      expect(events.at(-1)).toEqual({
        reason: "keyboard",
        type: "commit",
        value: "300",
      });
      expect(events.filter((event) => event.type === "commit")).toHaveLength(5);
    });

    test(`edits text, clamps on blur, restores invalid text and resets (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");

      const reset = section(page, "number-field").getByRole("button", {
        name: "Reset",
      });

      await input.fill("250");
      await expect(input).toHaveValue("250");
      await input.press("Enter");
      await expect(reset).toBeEnabled();
      await expect(reset).toHaveAttribute("data-modified", "");

      await input.fill("999");
      await expect(input).toHaveValue("999");
      await input.blur();
      await expect(input).toHaveValue("300");

      await input.fill("abc");
      await input.blur();
      await expect(input).toHaveValue("300");

      await input.fill("");
      await expect(input).toHaveValue("");
      await expect(
        section(page, "number-field").locator('input[name="bpm"]')
      ).toHaveValue("");
      await reset.click();
      await expect(input).toHaveValue("120");
      await expect(reset).toBeDisabled();

      const events = await readJournal(page, "number-field");

      expect(
        events.map(({ reason, type, value }) => `${type}:${reason}:${value}`)
      ).toEqual([
        "change:input-change:250",
        "commit:keyboard:250",
        "change:input-change:999",
        "change:input-blur:300",
        "commit:input-blur:300",
        "change:input-clear:null",
        "commit:input-blur:null",
        "change:reset:120",
        "commit:reset:120",
      ]);
    });

    test(`steps with the pixel steppers and the wheel (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");
      const field = section(page, "number-field");

      await field.getByRole("button", { name: "Increase" }).click();
      await expect(input).toHaveValue("121");
      await field.getByRole("button", { name: "Decrease" }).click();
      await field.getByRole("button", { name: "Decrease" }).click();
      await expect(input).toHaveValue("119");

      await input.focus();
      await input.hover();
      await page.mouse.wheel(0, -100);
      await expect(input).toHaveValue("120");
      await page.mouse.wheel(0, 100);
      await expect(input).toHaveValue("119");

      const events = await readJournal(page, "number-field");

      expect(events.map(({ reason, type }) => `${type}:${reason}`)).toEqual([
        "change:increment-press",
        "commit:increment-press",
        "change:decrement-press",
        "commit:decrement-press",
        "change:decrement-press",
        "commit:decrement-press",
        "change:wheel",
        "commit:wheel",
        "change:wheel",
        "commit:wheel",
      ]);
    });

    test(`repeats while a stepper is held and commits once on release (${runtime})`, async ({
      page,
    }) => {
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1);
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");

      await section(page, "number-field")
        .getByRole("button", { name: "Increase" })
        .hover();
      await page.mouse.down();
      await expect(input).toHaveValue("121");

      // The repeat starts after 400 ms and then fires every 60 ms.
      await page.clock.runFor(590);
      await expect(input).toHaveValue("124");
      await page.mouse.up();
      await page.clock.runFor(600);
      await expect(input).toHaveValue("124");

      const events = await readJournal(page, "number-field");

      expect(events.filter((event) => event.type === "commit")).toEqual([
        { reason: "increment-press", type: "commit", value: "124" },
      ]);
    });

    test(`scrubs by dragging the label and commits once on release (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field");
      const scrub = section(page, "number-field").getByTestId("scrub");

      await scrub.scrollIntoViewIfNeeded();

      const bounds = await scrub.boundingBox();

      if (!bounds) throw new Error("The scrub area has no browser bounds.");
      await page.mouse.move(bounds.x + 4, bounds.y + bounds.height / 2);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 24, bounds.y + bounds.height / 2, {
        steps: 4,
      });
      await expect(input).toHaveValue("130");
      await expect(section(page, "number-field")).toBeVisible();
      await page.mouse.up();

      const events = await readJournal(page, "number-field");

      expect(events.every((event) => event.reason === "scrub")).toBe(true);
      expect(events.filter((event) => event.type === "commit")).toEqual([
        { reason: "scrub", type: "commit", value: "130" },
      ]);
    });

    test(`keeps the typed text while a controlled value settles and follows outside changes (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field-controlled");

      await expect(input).toHaveValue("100");
      await input.fill("070");
      await expect(input).toHaveValue("070");
      await expect
        .poll(
          async () =>
            (await readJournal(page, "number-field-controlled")).length
        )
        .toBe(1);
      await input.press("Enter");
      await expect(input).toHaveValue("70");

      await page.getByRole("button", { name: "External field" }).click();
      await expect(input).toHaveValue("90");

      // A value the parent rejects shows while typing and then returns.
      const rejected = fieldInput(page, "number-field-rejected");

      await rejected.fill("70");
      await expect(rejected).toHaveValue("70");
      await rejected.blur();
      await expect(rejected).toHaveValue("50");
    });

    test(`ignores input while disabled or read-only (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const [disabled, readOnly] = await fieldInput(
        page,
        "number-field-locked"
      ).all();

      await expect(disabled).toBeDisabled();
      await expect(readOnly).toHaveAttribute("readonly", "");
      await readOnly.focus();
      await page.keyboard.press("ArrowUp");
      await expect(readOnly).toHaveValue("10");

      for (const button of await section(page, "number-field-locked")
        .getByRole("button", { name: /Increase|Decrease|Reset/ })
        .all()) {
        await expect(button).toBeDisabled();
      }

      expect(await readJournal(page, "number-field-locked")).toEqual([]);
    });

    for (const [id, start] of [
      ["number-field", 120],
      ["number-field-controlled", 100],
    ] as const) {
      test(`commits the value it changed to on a wheel step and an assistive click (${id}) (${runtime})`, async ({
        page,
      }) => {
        await page.goto("/controls");

        const input = fieldInput(page, id);
        const field = section(page, id);

        await input.focus();
        await input.hover();
        await page.mouse.wheel(0, -100);
        await expect(input).toHaveValue(String(start + 1));

        // A click with no pointer press, as assistive technology sends it.
        await field
          .getByRole("button", { name: "Decrease" })
          .dispatchEvent("click");
        await expect(input).toHaveValue(String(start));

        expect(
          (await readJournal(page, id)).map(
            ({ reason, type, value }) => `${type}:${reason}:${value}`
          )
        ).toEqual([
          `change:wheel:${start + 1}`,
          `commit:wheel:${start + 1}`,
          `change:decrement-press:${start}`,
          `commit:decrement-press:${start}`,
        ]);
      });
    }

    for (const [lock, label] of [
      ["disabled", "Disable field"],
      ["readonly", "Make field read-only"],
    ] as const) {
      test(`stops a held stepper repeat when the field becomes ${lock} (${runtime})`, async ({
        page,
      }) => {
        await page.clock.install({ time: 0 });
        await page.clock.pauseAt(1);
        await page.goto("/controls");

        const input = fieldInput(page, "number-field-lockable");
        const field = section(page, "number-field-lockable");

        await field.getByRole("button", { name: "Increase" }).hover();
        await page.mouse.down();
        await page.clock.runFor(590);
        await expect(input).toHaveValue("104");
        await field.getByRole("button", { name: label }).dispatchEvent("click");
        await expect(
          field.getByRole("button", { name: "Increase" })
        ).toBeDisabled();
        await page.clock.runFor(600);
        await page.mouse.up();
        await page.clock.runFor(600);
        await expect(input).toHaveValue("104");

        const changes = (
          await readJournal(page, "number-field-lockable")
        ).filter((event) => event.type === "change");

        expect(changes.map((event) => event.value)).toEqual([
          "101",
          "102",
          "103",
          "104",
        ]);
      });

      test(`stops a scrub when the field becomes ${lock} (${runtime})`, async ({
        page,
      }) => {
        await page.goto("/controls");

        const input = fieldInput(page, "number-field-lockable");
        const field = section(page, "number-field-lockable");
        const scrub = field.getByTestId("scrub");

        await scrub.scrollIntoViewIfNeeded();

        const bounds = await scrub.boundingBox();

        if (!bounds) throw new Error("The scrub area has no browser bounds.");

        const y = bounds.y + bounds.height / 2;

        await page.mouse.move(bounds.x + 4, y);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 24, y, { steps: 4 });
        await expect(input).toHaveValue("110");
        await field.getByRole("button", { name: label }).dispatchEvent("click");
        await expect(scrub).toHaveAttribute("data-" + lock, "");
        await page.mouse.move(bounds.x + 60, y, { steps: 4 });
        await page.mouse.up();
        await expect(input).toHaveValue("110");

        const events = await readJournal(page, "number-field-lockable");

        expect(
          events.filter((event) => event.type === "change").at(-1)?.value
        ).toBe("110");
        expect(events.filter((event) => event.type === "commit")).toEqual([
          { reason: "scrub", type: "commit", value: "110" },
        ]);
      });
    }

    test(`drops the description when the unit goes away (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field-lockable");

      const toggle = section(page, "number-field-lockable").getByRole(
        "button",
        { name: "Toggle unit" }
      );

      await expect(input).toHaveAccessibleDescription("Bpm");
      await toggle.click();
      await expect(input).toHaveAccessibleDescription("");
      await toggle.click();
      await expect(input).toHaveAccessibleDescription("Bpm");
    });

    test(`does not scrub when a pointer move handler prevents the default (${runtime})`, async ({
      page,
    }) => {
      await page.goto("/controls");

      const input = fieldInput(page, "number-field-lockable");
      const field = section(page, "number-field-lockable");
      const scrub = field.getByTestId("scrub");

      await field
        .getByRole("button", { name: "Block scrub" })
        .dispatchEvent("click");
      await scrub.scrollIntoViewIfNeeded();

      const bounds = await scrub.boundingBox();

      if (!bounds) throw new Error("The scrub area has no browser bounds.");

      const y = bounds.y + bounds.height / 2;

      await page.mouse.move(bounds.x + 4, y);
      await page.mouse.down();
      await page.mouse.move(bounds.x + 24, y, { steps: 4 });
      await page.mouse.up();
      await expect(input).toHaveValue("100");
      expect(
        (await readJournal(page, "number-field-lockable")).filter(
          (event) => event.type === "change"
        )
      ).toEqual([]);
    });
  });

  test(`LCD meter renders channel segments and readouts (${runtime})`, async ({
    page,
  }) => {
    await page.goto("/controls");
    const meter = section(page, "lcd-meter").locator('[data-slot="lcd-meter"]');
    await expect(meter).toBeVisible();
    await expect(meter.locator('[data-slot="lcd-meter-channel"]')).toHaveCount(
      2
    );
    await expect(meter.locator('[data-slot="lcd-meter-track"]')).toHaveCount(2);
    await expect(meter.locator('[data-slot="lcd-meter-bar"]')).toHaveCount(2);
    await expect(meter.locator('[data-slot="lcd-meter-scale"]')).toBeVisible();
    await expect(meter.locator('[data-slot="lcd-meter-clip"]')).toBeVisible();
    await expect
      .poll(() =>
        meter
          .locator('[data-slot="lcd-meter-channel"]')
          .first()
          .evaluate((element) =>
            Number(element.style.getPropertyValue("--meter-level"))
          )
      )
      .toBeGreaterThan(0);
    const channel = meter.locator('[data-slot="lcd-meter-channel"]').first();

    const before = await channel.evaluate((element) =>
      Number(element.style.getPropertyValue("--meter-level"))
    );

    await section(page, "lcd-meter")
      .getByRole("button", { name: "Raise input" })
      .click();
    await expect
      .poll(() =>
        channel.evaluate((element) =>
          Number(element.style.getPropertyValue("--meter-level"))
        )
      )
      .toBeGreaterThan(before);
    const mask = meter.locator('[data-slot="lcd-meter-segments"]').first();

    expect(
      await mask.evaluate((element) => getComputedStyle(element).maskImage)
    ).toContain("repeating-linear-gradient");
    await expect(mask.locator('[data-measure="peak"]')).toHaveCount(1);

    const geometry = await meter
      .locator('[data-slot="lcd-meter-bracket"]')
      .evaluate((element) => ({
        position: Number(
          getComputedStyle(element).getPropertyValue(
            "--lcd-meter-bracket-start"
          )
        ),
        width: element.getBoundingClientRect().width,
        left:
          element.firstElementChild!.getBoundingClientRect().left -
          element.getBoundingClientRect().left,
        mask: getComputedStyle(
          element
            .closest('[data-slot="lcd-meter"]')!
            .querySelector('[data-slot="lcd-meter-segments"]')!
        ).maskImage,
      }));

    expect(geometry.position).toBeCloseTo(1 - Math.sqrt(9 / 60), 4);
    expect(geometry.left).toBeGreaterThan(0);
    expect(geometry.left).toBeLessThanOrEqual(
      geometry.width * geometry.position + 0.1
    );

    const lengths = [...geometry.mask.matchAll(/([\d.]+)px/gu)].map((match) =>
      Number(match[1])
    );

    const period = lengths.at(-1)!;

    expect(period).toBeGreaterThan(0);
    expect(geometry.left).toBeCloseTo(
      Math.floor((geometry.width * geometry.position) / period) * period,
      1
    );
    await expect(meter.locator('[data-slot="lcd-meter-label"]')).toHaveText([
      "L",
      "R",
    ]);
    await section(page, "lcd-meter")
      .getByRole("button", { name: "Four channels" })
      .click();
    await expect(meter.locator('[data-slot="lcd-meter-label"]')).toHaveText([
      "1",
      "2",
      "3",
      "4",
    ]);
    await section(page, "lcd-meter")
      .getByRole("button", { name: "Mono channel" })
      .click();
    await expect(meter.locator('[data-slot="lcd-meter-label"]')).toHaveCount(0);
  });

  test(`tempo control edits, clamps, steps and measures taps (${runtime})`, async ({
    page,
  }, info) => {
    await page.addInitScript(() => {
      performance.now = () =>
        Number(document.documentElement.dataset.tapTime ?? "0");
    });
    await page.goto("/controls");
    const root = section(page, "tempo-control");

    const input = root.getByRole("spinbutton", {
      name: "Tempo in beats per minute",
    });

    await input.fill("720");
    await input.press("Tab");
    await expect(input).toHaveValue("600");
    await input.focus();
    await input.press("ArrowDown");
    await expect(input).toHaveValue("599");
    const tap = root.getByRole("button", { name: "Tap tempo" });

    const tapAt = async (time: number, trigger = tap) => {
      await page.evaluate((next) => {
        document.documentElement.dataset.tapTime = String(next);
      }, time);
      await trigger.click();
    };

    await tapAt(0);
    await tapAt(500);
    await tapAt(1000);
    await expect(input).toHaveValue("120");
    expect(
      (await readJournal(page, "tempo-control")).filter(
        (event) => event.reason === "tap"
      )
    ).toEqual([{ value: "120", reason: "tap", type: "change" }]);

    const controlled = section(page, "tempo-controlled");

    const controlledInput = controlled.getByRole("spinbutton", {
      name: "Tempo in beats per minute",
    });

    const controlledTap = controlled.getByRole("button", {
      name: "Tap tempo",
    });

    await tapAt(0, controlledTap);
    await tapAt(600, controlledTap);
    await expect(controlledInput).toHaveValue("120");
    await expect(controlled.getByTestId("change-details")).toContainText(
      '"reason":"tap"'
    );
    expect(await readJournal(page, "tempo-controlled")).toEqual([
      { value: "100", reason: "tap", type: "change" },
      { value: "100", reason: "", type: "commit" },
    ]);
    await controlledInput.fill("1");
    await expect(controlledInput).toHaveValue("1");
    await controlledInput.fill("96.4");
    await expect(controlledInput).toHaveValue("96.4");
    await controlledInput.press("Enter");
    await expect(controlledInput).toHaveValue("120");

    const custom = section(page, "tempo-custom");
    const customInput = custom.locator("input");
    const customTap = custom.getByRole("button", { name: "Tap tempo" });

    await expect(customInput).toHaveValue("96");
    await expect(customInput).toHaveAttribute("name", "custom-bpm");
    await expect(customInput).toHaveAttribute("data-custom", "input");
    await expect(customTap).toHaveAttribute("id", "custom-tap");
    await customInput.press("Shift+ArrowUp");
    await expect(customInput).toHaveValue("106");
    await page
      .getByRole("button", { name: "External tempo", exact: true })
      .click();
    await expect(customInput).toHaveValue("110");
    await customInput.fill("");
    await expect(customInput).toHaveValue("");
    await customInput.press("Tab");
    await expect(customInput).toHaveValue("110");
    await customInput.fill(".");
    await expect(customInput).toHaveValue(".");
    await customInput.press("Enter");
    await expect(customInput).toHaveValue("110");
    await customInput.fill("1");
    await expect(customInput).toHaveValue("1");
    await customInput.press("Enter");
    await expect(customInput).toHaveValue("30");
    await customInput.fill("96.4");
    await customInput.press("Enter");
    await expect(customInput).toHaveValue("96");
    await tapAt(0, customTap);
    await customInput.press("Home");
    await expect(customInput).toHaveValue("30");
    await tapAt(500, customTap);
    await expect(customInput).toHaveValue("30");
    await tapAt(1000, customTap);
    await expect(customInput).toHaveValue("120");
    await customInput.press("End");
    await expect(customInput).toHaveValue("600");
    await customInput.fill("");
    await tapAt(1500, customTap);
    await tapAt(2100, customTap);
    await expect(customInput).toHaveValue("100");

    for (const key of ["Enter", " "]) {
      expect(
        await customTap.evaluate(
          (element, key) =>
            !element.dispatchEvent(
              new KeyboardEvent("keydown", {
                key,
                repeat: true,
                bubbles: true,
                cancelable: true,
              })
            ),
          key
        )
      ).toBe(true);
    }

    const cancel = section(page, "tempo-cancel").getByRole("button");

    await tapAt(0, cancel);
    await tapAt(500, cancel);
    expect(await readJournal(page, "tempo-cancel")).toEqual([]);
    const pad = section(page, "tempo-pad");
    const padTrigger = pad.getByRole("button", { name: "Tap tempo" });

    await expect(pad.getByRole("button")).toHaveCount(1);
    await expect(padTrigger).toHaveAttribute("data-sound-pad", "");
    await tapAt(0, padTrigger);
    await tapAt(600, padTrigger);
    await expect(pad.getByRole("status", { name: "Tempo" })).toHaveText(
      "100 BPM"
    );
    const tapJournal = info.outputPath("tap-journal.json");

    await writeFile(
      tapJournal,
      JSON.stringify(
        {
          default: await readJournal(page, "tempo-control"),
          controlled: await readJournal(page, "tempo-controlled"),
          custom: await readJournal(page, "tempo-custom"),
          cancelled: await readJournal(page, "tempo-cancel"),
        },
        null,
        2
      )
    );
    await info.attach(`tap-journal-${runtime}`, {
      path: tapJournal,
      contentType: "application/json",
    });
  });

  test(`tap hook clears edits, evicts old intervals and counts accepted taps (${runtime})`, async ({
    page,
  }, info) => {
    await page.addInitScript(() => {
      performance.now = () =>
        Number(document.documentElement.dataset.tapTime ?? "0");
    });
    await page.goto("/controls");
    const hook = section(page, "tap-hook");
    const value = hook.getByTestId("tap-value");
    const count = hook.getByTestId("tap-count");

    const samples: {
      time: number;
      bpm: string | null;
      count: string | null;
    }[] = [];

    const tapAt = async (time: number, bpm: number, accepted: number) => {
      await page.evaluate((next) => {
        document.documentElement.dataset.tapTime = String(next);
      }, time);
      await hook.getByRole("button", { name: "Tap hook" }).click();
      await expect(value).toHaveText(String(bpm));
      await expect(count).toHaveText(String(accepted));
      samples.push({
        time,
        bpm: await value.textContent(),
        count: await count.textContent(),
      });
    };

    await tapAt(0, 90, 1);
    await tapAt(40, 90, 1);
    await tapAt(500, 120, 2);
    await hook.getByRole("button", { name: "Set 90" }).click();
    await tapAt(1000, 90, 3);
    await tapAt(1500, 120, 4);
    await hook.getByRole("button", { name: "Reset history" }).click();
    await tapAt(0, 120, 5);
    await tapAt(1000, 60, 6);
    await tapAt(1500, 80, 7);
    await tapAt(2000, 90, 8);
    await tapAt(2500, 96, 9);
    await tapAt(3000, 120, 10);
    await hook.getByRole("button", { name: "Reset history" }).click();
    await tapAt(0, 120, 11);
    await tapAt(2000, 30, 12);
    await tapAt(4001, 30, 13);
    await tapAt(4501, 120, 14);
    const tapJournal = info.outputPath("tap-hook-journal.json");

    await writeFile(tapJournal, JSON.stringify(samples, null, 2));
    await info.attach(`tap-hook-journal-${runtime}`, {
      path: tapJournal,
      contentType: "application/json",
    });
  });

  for (const state of ["suspended", "running", "interrupted"] as const) {
    for (const sessionType of ["auto", "play-and-record"] as const) {
      test(`standalone knob click routes ${sessionType} audio and recovers ${state} contexts`, async ({
        page,
        browserName,
      }, info) => {
        await page.addInitScript(
          ({ state, sessionType, browserName }) => {
            const events: { event: string; active: boolean }[] = [];

            const record = (event: string) => {
              events.push({
                event,
                active: navigator.userActivation.isActive,
              });
              document.documentElement.dataset.knobAudioEvents =
                JSON.stringify(events);
            };

            let type: string = sessionType;
            Object.defineProperty(navigator, "audioSession", {
              configurable: true,
              value: {
                get type() {
                  return type;
                },
                set type(next: string) {
                  events.push({
                    event: `session:${next}`,
                    active: navigator.userActivation.isActive,
                  });
                  type = next;
                },
              },
            });
            const NativeContext = window.AudioContext;
            window.AudioContext = class extends NativeContext {
              constructor(options?: AudioContextOptions) {
                super(options);
                // Real native context underneath; emulate only Safari's exposed state.
                Object.defineProperty(this, "state", {
                  configurable: true,
                  value: state,
                });
                const resume = this.resume.bind(this);
                this.resume = () => {
                  record(`resume:${this.state}`);
                  Reflect.deleteProperty(this, "state");
                  const nativeResume = resume();

                  if (browserName !== "webkit") return nativeResume;

                  void nativeResume.catch(() => {});
                  // Headless WebKit can leave native contexts suspended after
                  // a trusted key press. Model the accepted resume transition
                  // so this test covers the call and click scheduling contract.
                  Object.defineProperty(this, "state", {
                    configurable: true,
                    value: "running",
                  });

                  return Promise.resolve();
                };

                const createSource = this.createBufferSource.bind(this);
                this.createBufferSource = () => {
                  const source = createSource();
                  const start = source.start.bind(source);
                  source.start = () => {
                    record(`start:${type}`);
                    start();
                  };

                  return source;
                };
              }
            };
          },
          { state, sessionType, browserName }
        );
        await page.goto("/controls");
        const dial = section(page, "knob-click").getByRole("slider");
        await dial.press("ArrowUp");
        await dial.press("ArrowUp");

        const events = JSON.parse(
          (await page.locator("html").getAttribute("data-knob-audio-events"))!
        );

        expect(events).toEqual([
          ...(sessionType === "auto"
            ? [{ event: "session:playback", active: true }]
            : []),
          ...(state !== "running"
            ? [{ event: `resume:${state}`, active: true }]
            : []),
          {
            event: `start:${sessionType === "auto" ? "playback" : sessionType}`,
            active: true,
          },
        ]);
        await info.attach("standalone-knob-native-calls", {
          body: JSON.stringify({ state, sessionType, events }),
          contentType: "application/json",
        });
      });
    }
  }

  test.describe("control contracts", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/controls");
    });

    test.afterAll(async () => {
      const artifacts = new URL("../artifacts/", import.meta.url);

      await mkdir(artifacts, { recursive: true });
      await writeFile(
        new URL(`slider-drag-${runtime}.json`, artifacts),
        JSON.stringify(dragEvidence, null, 2)
      );
    });

    for (const id of [
      "fader-vertical-drag",
      "parameter-drag",
      "volume-vertical-drag",
      "fader-mic",
      "parameter-sync",
      "volume-zero",
    ]) {
      test(`sustained pointer dragging and release commits ${id}`, async ({
        page,
      }, testInfo) => {
        const thumb = section(page, id).locator('[role="slider"]').first();

        for (const start of ["thumb", "track"] as const) {
          const before = await readJournal(page, id);

          const path = await dragSlider(page, thumb, start, async () => {
            expect(
              (await readJournal(page, id))
                .slice(before.length)
                .filter((entry) => entry.type === "commit")
            ).toHaveLength(0);
          });

          const after = await readJournal(page, id);
          expect(
            after
              .slice(before.length)
              .filter((entry) => entry.type === "commit")
          ).toHaveLength(1);
          dragEvidence.push({
            id,
            ...path,
            callbacks: after.slice(before.length),
          });
          await testInfo.attach(`${runtime}-${id}-${start}`, {
            body: JSON.stringify({
              ...path,
              events: after.slice(before.length),
            }),
            contentType: "application/json",
          });
        }
      });
    }

    test("seek dragging changes position while held and seeks once on release", async ({
      page,
    }, testInfo) => {
      const root = section(page, "effects");
      const thumb = root.locator('[data-slot="audio-player-seek-thumb"]');

      for (const start of ["thumb", "track"] as const) {
        const before: number[] = JSON.parse(
          (await root.getByTestId("player-times").textContent()) ?? "[]"
        );

        const path = await dragSlider(page, thumb, start, async () => {
          await expect(root.getByTestId("player-times")).toHaveText(
            JSON.stringify(before)
          );
        });

        await expect
          .poll(
            async () =>
              JSON.parse(
                (await root.getByTestId("player-times").textContent()) ?? "[]"
              ).length
          )
          .toBe(before.length + 1);
        dragEvidence.push({ id: "seek", ...path });
        await testInfo.attach(`${runtime}-seek-${start}`, {
          body: JSON.stringify(path),
          contentType: "application/json",
        });
      }
    });

    test("native touch dragging captures the vertical thumb and commits on release", async ({
      page,
      context,
    }, testInfo) => {
      const thumb = section(page, "fader-vertical-drag").locator(
        '[data-slot="fader-thumb"]'
      );

      await thumb.scrollIntoViewIfNeeded();
      const bounds = await thumb.boundingBox();

      if (!bounds) throw new Error("Slider has no bounds.");
      const cdp = await context.newCDPSession(page);
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      const values: string[] = [];
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });

      try {
        for (const offset of [20, 40, 10]) {
          const before = await thumb.getAttribute("aria-valuenow");
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: x + 50, y: y + offset }],
          });
          await expect(thumb).not.toHaveAttribute("aria-valuenow", before!);
          values.push((await thumb.getAttribute("aria-valuenow"))!);
          expect(
            (await readJournal(page, "fader-vertical-drag")).filter(
              (entry) => entry.type === "commit"
            )
          ).toHaveLength(0);
        }
      } finally {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
      }

      expect(
        (await readJournal(page, "fader-vertical-drag")).filter(
          (entry) => entry.type === "commit"
        )
      ).toHaveLength(1);
      dragEvidence.push({
        id: "native-touch",
        x,
        y,
        values,
        callbacks: await readJournal(page, "fader-vertical-drag"),
      });
      await testInfo.attach(`${runtime}-native-touch`, {
        body: JSON.stringify({ x, y, values }),
        contentType: "application/json",
      });
    });

    test("disabled vertical slider ignores native thumb and track dragging", async ({
      page,
    }) => {
      const root = section(page, "fader-disabled-drag");
      const thumb = root.locator('[data-slot="fader-thumb"]');
      const before = await thumb.getAttribute("aria-valuenow");
      const track = root.locator('[data-slot="fader-track"]');
      await track.scrollIntoViewIfNeeded();

      for (const target of [thumb, track]) {
        const bounds = await target.boundingBox();

        if (!bounds) throw new Error("Slider has no bounds.");

        await page.mouse.move(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(bounds.x + 50, bounds.y + 20, { steps: 5 });
        await page.mouse.up();
        await expect(thumb).toHaveAttribute("aria-valuenow", before!);
        expect(await readJournal(page, "fader-disabled-drag")).toEqual([]);
      }
    });

    test("control faders expose dB, exact steps, endpoints and keyboard commits", async ({
      page,
    }) => {
      const mic = section(page, "fader-mic").getByRole("slider", {
        name: "Mic",
      });

      const steps = section(page, "fader-steps").locator(
        '[data-slot="fader-thumb"]'
      );

      const silent = section(page, "fader-silence").locator(
        '[data-slot="fader-thumb"]'
      );

      const committed = section(page, "fader-commit").locator(
        '[data-slot="fader-thumb"]'
      );

      await expect(mic).toHaveAttribute("aria-valuetext", "−6.0 dB");
      await steps.press("ArrowDown");
      await steps.press("Shift+ArrowDown");
      await steps.press("Alt+ArrowUp");
      expect(await readJournal(page, "fader-steps")).toEqual([
        { value: "-0.5", reason: "keyboard", type: "change" },
        { value: "-0.5", reason: "", type: "commit" },
        { value: "-6.5", reason: "keyboard", type: "change" },
        { value: "-6.5", reason: "", type: "commit" },
        { value: "-6.4", reason: "keyboard", type: "change" },
        { value: "-6.4", reason: "", type: "commit" },
      ]);
      await silent.press("End");
      await expect(silent).toHaveAttribute("aria-valuetext", "+6.0 dB");
      await silent.press("Home");
      await expect(silent).toHaveAttribute("aria-valuetext", "Silent");
      expect(
        (await readJournal(page, "fader-silence")).map((entry) => entry.value)
      ).toEqual(["6", "6", "-Infinity", "-Infinity"]);
      await committed.press("PageUp");
      expect(await readJournal(page, "fader-commit")).toEqual([
        { value: "3", reason: "keyboard", type: "change" },
        { value: "3", reason: "", type: "commit" },
      ]);
    });

    test("controlled faders and parameters step from rejected parent values", async ({
      page,
    }) => {
      const fader = section(page, "fader-controlled").locator(
        '[data-slot="fader-thumb"]'
      );

      const parameter = section(page, "parameter-controlled").locator(
        '[data-slot="parameter-slider-thumb"]'
      );

      const sync = section(page, "parameter-sync").getByRole("slider", {
        name: "Sync",
      });

      await fader.press("ArrowUp");
      await expect(fader).toHaveAttribute("aria-valuetext", "−12.0 dB");
      await fader.press("ArrowUp");
      expect(
        (await readJournal(page, "fader-controlled"))
          .filter((entry) => entry.type === "change")
          .map((entry) => entry.value)
      ).toEqual(["-11.5", "-11.5"]);
      await sync.press("ArrowUp");
      await expect(sync).toHaveAttribute("aria-valuetext", "-995 ms");
      await sync.press("End");
      await expect(sync).toHaveAttribute("aria-valuetext", "1000 ms");
      expect(
        (await readJournal(page, "parameter-sync"))
          .filter((entry) => entry.type === "change")
          .map((entry) => entry.value)
      ).toEqual(["-995", "1000"]);
      await parameter.press("ArrowUp");
      await page
        .getByRole("button", { name: "Unrelated parameter update" })
        .click();
      await parameter.press("ArrowUp");
      await expect(parameter).toHaveAttribute("aria-valuetext", "0");
      expect(
        (await readJournal(page, "parameter-controlled"))
          .filter((entry) => entry.type === "change")
          .map((entry) => entry.value)
      ).toEqual(["1", "1"]);
    });

    test("knob keyboard, resets, custom style and focused wheel honor disabled state", async ({
      page,
    }) => {
      const root = section(page, "knob-basic");
      const dial = root.getByRole("slider");
      const disabled = section(page, "knob-disabled").getByRole("slider");

      await expect(dial).toHaveAttribute("aria-valuenow", "50");
      expect(
        await dial.evaluate((node) =>
          node.style.getPropertyValue("--knob-angle")
        )
      ).not.toBe("");
      expect(
        await dial.evaluate((node) =>
          node.style.getPropertyValue("--from-test")
        )
      ).toBe("1");
      await dial.press("Shift+ArrowUp");
      await expect(dial).toHaveAttribute("aria-valuenow", "60");
      await dial.dblclick();
      await expect(dial).toHaveAttribute("aria-valuenow", "50");
      await dial.press("ArrowUp");
      await dial.click({ modifiers: ["Alt"] });
      await expect(dial).toHaveAttribute("aria-valuenow", "50");
      await expect(root.getByTestId("change-details")).toHaveText(
        '{"reason":"reset"}'
      );
      expect(
        (await readJournal(page, "knob-basic"))
          .filter((entry) => entry.type === "change")
          .map((entry) => [entry.value, entry.reason])
      ).toEqual([
        ["60", "keyboard"],
        ["50", "reset"],
        ["51", "keyboard"],
        ["50", "reset"],
      ]);
      await page
        .getByRole("button", { name: "Unrelated parameter update" })
        .focus();
      await dial.hover();
      await page.mouse.wheel(0, -100);
      await expect(dial).toHaveAttribute("aria-valuenow", "50");
      await dial.focus();
      await dial.hover();
      await page.mouse.wheel(0, -100);
      await expect(dial).toHaveAttribute("aria-valuenow", "51");
      await disabled.focus();
      await disabled.hover();
      await page.mouse.wheel(0, -100);
      await disabled.press("ArrowUp");
      await disabled.press("Enter");
      await disabled.dblclick({ force: true });
      await expect(disabled).toHaveAttribute("aria-valuenow", "50");
      await expect(disabled).toHaveAttribute("tabindex", "-1");
      expect(await readJournal(page, "knob-disabled")).toEqual([]);
      await expect(
        section(page, "knob-disabled").getByRole("textbox")
      ).toHaveCount(0);
    });

    test("knob fine dragging changes sensitivity without jumps and commits only on release", async ({
      page,
    }) => {
      const dial = section(page, "knob-drag").getByRole("slider");
      const bounds = await dialBounds(dial);

      await page.mouse.move(bounds.x, bounds.y);
      await page.mouse.down();
      await page.keyboard.down("Shift");
      await page.mouse.move(bounds.x, bounds.y - 20);
      await expect(dial).toHaveAttribute("aria-valuenow", "51");
      await page.keyboard.up("Shift");
      await page.mouse.move(bounds.x, bounds.y - 40);
      await expect(dial).toHaveAttribute("aria-valuenow", "61");
      expect(await readJournal(page, "knob-drag")).toEqual([
        { value: "51", reason: "drag", type: "change" },
        { value: "61", reason: "drag", type: "change" },
      ]);
      await page.mouse.up();
      await expect(dial).not.toHaveAttribute("data-dragging");
      expect((await readJournal(page, "knob-drag")).at(-1)).toEqual({
        value: "61",
        reason: "",
        type: "commit",
      });
    });

    test("circular knobs grab relatively, clamp endpoints and ignore their dead zone", async ({
      page,
    }) => {
      const dial = section(page, "knob-circular").getByRole("slider");
      const bounds = await dialBounds(dial);

      await page.mouse.move(bounds.x + bounds.radius, bounds.y);
      await page.mouse.down();
      await page.mouse.move(bounds.x, bounds.y + bounds.radius);
      await expect(dial).toHaveAttribute("aria-valuenow", "83");
      await page.mouse.move(bounds.x - bounds.radius, bounds.y);
      await expect(dial).toHaveAttribute("aria-valuenow", "100");
      await page.mouse.move(bounds.x, bounds.y + bounds.radius);
      await expect(dial).toHaveAttribute("aria-valuenow", "67");
      await page.mouse.up();

      const dead = section(page, "knob-dead-zone").getByRole("slider");
      const center = await dialBounds(dead);

      await page.mouse.move(center.x + center.radius, center.y);
      await page.mouse.down();
      await page.mouse.move(center.x - 2, center.y + 2);
      await page.mouse.move(center.x, center.y - center.radius);
      expect(await readJournal(page, "knob-dead-zone")).toEqual([]);
      await page.mouse.move(center.x + center.radius, center.y);
      await expect(dead).toHaveAttribute("aria-valuenow", "83");
      await page.mouse.up();
    });

    test("knob editors commit once, cancel without changes and restore dial focus", async ({
      page,
    }) => {
      const root = section(page, "knob-editor");
      const dial = root.getByRole("slider", { name: "Editable gain" });

      await root.locator('[data-slot="knob-value"]').dblclick();

      const editor = root.getByRole("textbox", { name: "Value" });

      await expect(editor).toBeFocused();
      await editor.fill("72");
      await editor.press("Enter");
      await expect(root.locator('[data-slot="knob-value"]')).toHaveText("72");
      await expect(dial).toBeFocused();
      expect(await readJournal(page, "knob-editor")).toEqual([
        { value: "72", reason: "input", type: "change" },
        { value: "72", reason: "", type: "commit" },
      ]);
      await root.locator('[data-slot="knob-label"]').dblclick();
      await editor.fill("10");
      await editor.press("Escape");
      await expect(dial).toBeFocused();
      expect(await readJournal(page, "knob-editor")).toHaveLength(2);
      await dial.press("Enter");
      await expect(editor).toHaveValue("72");
      await editor.press("Escape");
    });

    test("knob scales light exact graduation ranges and caps rotate without moving lighting", async ({
      page,
    }) => {
      const scale = section(page, "knob-scale");
      const bipolar = section(page, "knob-bipolar");
      const cap = section(page, "knob-cap");
      const mini = section(page, "knob-mini");

      await expect(scale.locator('[data-slot="knob-tick"]')).toHaveCount(101);
      await expect(scale.locator("[data-major]")).toHaveCount(21);
      expect(
        await scale.locator('[data-slot="knob-scale-label"]').allTextContents()
      ).toEqual([
        "0",
        "10",
        "20",
        "30",
        "40",
        "50",
        "60",
        "70",
        "80",
        "90",
        "100",
      ]);
      await expect(scale.locator("[data-active]")).toHaveCount(34);
      await scale.getByRole("slider").press("End");
      await expect(scale.locator("[data-active]")).toHaveCount(101);
      expect(
        await bipolar
          .locator('[data-slot="knob-tick"]')
          .evaluateAll((nodes) =>
            nodes.flatMap((node, index) =>
              node.hasAttribute("data-active") ? [index] : []
            )
          )
      ).toEqual(Array.from({ length: 13 }, (_, index) => index + 12));
      await expect(
        bipolar.locator('[data-slot="knob-scale-label"]')
      ).toHaveCount(0);

      const grain = cap.locator('[data-slot="knob-cap-grain"]');
      const dot = cap.locator('[data-slot="knob-cap-dot"]');

      const face = await cap
        .locator('[data-slot="knob-cap-face"]')
        .evaluate((node) => node.outerHTML);

      const pointer = mini.locator('[data-slot="knob-cap-pointer"]');

      await expect(grain).toHaveAttribute("transform", "rotate(0 50 50)");
      expect(Number(await dot.getAttribute("cx"))).toBeCloseTo(50);
      expect(Number(await dot.getAttribute("cy"))).toBeLessThan(50);
      await cap.getByRole("slider").press("End");
      expect(Number(await dot.getAttribute("cx"))).toBeGreaterThan(50);
      expect(Number(await dot.getAttribute("cy"))).toBeGreaterThan(50);
      await expect(grain).toHaveAttribute("transform", "rotate(135 50 50)");
      await cap.getByRole("slider").press("Home");
      await expect(grain).toHaveAttribute("transform", "rotate(-135 50 50)");
      expect(
        await cap
          .locator('[data-slot="knob-cap-face"]')
          .evaluate((node) => node.outerHTML)
      ).toBe(face);
      await expect(mini.locator('[data-slot="knob-cap"]')).toHaveAttribute(
        "data-variant",
        "mini"
      );
      await expect(mini.locator('[data-slot="knob-cap-dot"]')).toHaveCount(0);
      expect(Number(await pointer.getAttribute("x2"))).toBeCloseTo(50);
      expect(Number(await pointer.getAttribute("y2"))).toBeLessThan(50);
      await mini.getByRole("slider").press("End");
      expect(Number(await pointer.getAttribute("x2"))).toBeGreaterThan(50);
      expect(Number(await pointer.getAttribute("y2"))).toBeGreaterThan(50);
      await mini.getByRole("slider").press("Home");
      expect(Number(await pointer.getAttribute("x2"))).toBeLessThan(50);
      expect(Number(await pointer.getAttribute("y2"))).toBeGreaterThan(50);
    });

    test("knob click sounds play only at enabled graduations and disconnect ended nodes", async ({
      page,
    }) => {
      await page.evaluate(() => {
        const start = AudioBufferSourceNode.prototype.start;
        const disconnect: () => void = AudioNode.prototype.disconnect;
        const data = document.documentElement.dataset;

        let now = performance.now();

        // Far enough apart that no click is held back by the 30 ms limit.
        performance.now = () => (now += 100);
        data.clickStarts = "0";
        data.clickDisconnects = "0";
        AudioBufferSourceNode.prototype.start = function (
          when = 0,
          offset = 0,
          duration?: number
        ) {
          data.clickStarts = String(Number(data.clickStarts) + 1);

          if (duration === undefined) start.call(this, when, offset);
          else start.call(this, when, offset, duration);
        };

        AudioNode.prototype.disconnect = function () {
          data.clickDisconnects = String(Number(data.clickDisconnects) + 1);
          disconnect.call(this);
        };
      });

      const starts = () =>
        page.evaluate(() =>
          Number(document.documentElement.dataset.clickStarts)
        );

      const quiet = section(page, "knob-quiet").getByRole("slider");
      const plain = section(page, "knob-click").getByRole("slider");
      const scaled = section(page, "knob-click-scale").getByRole("slider");

      await quiet.press("PageUp");
      expect(await starts()).toBe(0);
      await plain.press("ArrowUp");
      expect(await starts()).toBe(0);
      await plain.press("ArrowUp");
      await expect.poll(starts).toBe(1);
      await plain.press("ArrowDown");
      expect(await starts()).toBe(1);
      // Each click's real audio nodes finish before another graduation is crossed.
      await expect
        .poll(() =>
          page.evaluate(() =>
            Number(document.documentElement.dataset.clickDisconnects)
          )
        )
        .toBe(2);
      await plain.press("PageDown");
      await expect.poll(starts).toBe(2);
      await scaled.press("ArrowUp");
      expect(await starts()).toBe(2);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Number(document.documentElement.dataset.clickDisconnects)
          )
        )
        .toBe(4);
      await scaled.press("ArrowUp");
      await expect.poll(starts).toBe(3);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Number(document.documentElement.dataset.clickDisconnects)
          )
        )
        .toBe(6);
    });

    test("silent knob does not create an AudioContext", async ({ page }) => {
      await page.addInitScript(() => {
        const NativeAudioContext = window.AudioContext;
        let count = 0;

        Object.defineProperty(window, "AudioContext", {
          configurable: true,
          value: class extends NativeAudioContext {
            constructor(options?: AudioContextOptions) {
              super(options);
              count += 1;
              document.documentElement.dataset.audioContextCount =
                String(count);
            }
          },
        });
      });
      await page.goto("/controls");

      const before = await page
        .locator("html")
        .getAttribute("data-audio-context-count");

      await section(page, "knob-quiet").getByRole("slider").press("PageUp");
      expect(
        await page.locator("html").getAttribute("data-audio-context-count")
      ).toBe(before);
    });

    test("knob uses the audio context provider destination", async ({
      page,
      browserName,
    }) => {
      await page
        .getByRole("button", { name: "Create custom click audio bus" })
        .click();
      const custom = section(page, "knob-custom-click").getByRole("slider");

      await page.evaluate((browserName) => {
        const connected: AudioNode[] = [];
        const gains: GainNode[] = [];
        const resumeCalls: string[] = [];
        const context = window.__knobAudioGraph!.context;
        const createGain = context.createGain.bind(context);
        const resume = context.resume.bind(context);

        if (browserName === "webkit") {
          Object.defineProperty(context, "state", {
            configurable: true,
            value: "suspended",
          });

          context.resume = () => {
            resumeCalls.push(
              navigator.userActivation.isActive
                ? "resume:active"
                : "resume:inactive"
            );
            const nativeResume = resume();
            void nativeResume.catch(() => {});
            Object.defineProperty(context, "state", {
              configurable: true,
              value: "running",
            });

            return Promise.resolve();
          };

          window.__knobResumeEvents = resumeCalls;
        }

        context.createGain = () => {
          const gain = createGain();
          const connect = gain.connect.bind(gain);

          gains.push(gain);
          Object.defineProperty(gain, "connect", {
            value: (target: AudioNode) => {
              connected.push(target);

              return connect(target);
            },
          });

          return gain;
        };

        window.__knobAudioConnections = connected;
        window.__knobAudioGains = gains;
      }, browserName);
      await custom.press("ArrowUp");
      await custom.press("ArrowUp");

      const result = await page.evaluate(() => {
        const graph = window.__knobAudioGraph!;
        const connected = window.__knobAudioConnections!;
        const gains = window.__knobAudioGains!;

        return {
          resumeCalls: window.__knobResumeEvents ?? [],
          providerDestinationUsed: connected.includes(graph.destination),
          speakerDestinationUsed: connected.includes(graph.context.destination),
          customVolumeUsed: gains.some(
            (gain) => Math.abs(gain.gain.value - 0.2) < 1e-6
          ),
        };
      });

      expect(result).toEqual({
        resumeCalls: browserName === "webkit" ? ["resume:active"] : [],
        providerDestinationUsed: true,
        speakerDestinationUsed: false,
        customVolumeUsed: true,
      });
    });

    test("knob keeps one click while audio resume is pending", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        const NativeAudioContext = window.AudioContext;
        const events: string[] = [];
        const resolvers: (() => void)[] = [];

        window.__knobResumeEvents = events;
        window.__resolveKnobResumes = resolvers;
        window.AudioContext = class extends NativeAudioContext {
          constructor(options?: AudioContextOptions) {
            super(options);
            Object.defineProperty(this, "state", {
              configurable: true,
              value: "suspended",
            });
          }

          override resume() {
            events.push("resume");

            return new Promise<void>((resolve) => {
              resolvers.push(() => {
                Object.defineProperty(this, "state", {
                  configurable: true,
                  value: "running",
                });
                resolve();
              });
            });
          }

          override createBufferSource() {
            const source = super.createBufferSource();
            source.start = () => {
              events.push("start");
            };

            return source;
          }
        };
      });
      await page.goto("/controls");

      const dial = section(page, "knob-click").getByRole("slider");

      for (let index = 0; index < 12; index += 1) {
        await dial.press("ArrowUp");
      }

      expect(await page.evaluate(() => window.__knobResumeEvents)).toEqual([
        "resume",
        "resume",
      ]);

      await page.evaluate(() => {
        for (const resolve of window.__resolveKnobResumes ?? []) resolve();
      });
      await expect
        .poll(() => page.evaluate(() => window.__knobResumeEvents))
        .toEqual(["resume", "resume", "start"]);
    });

    test("typed knob and pan values parse and format through browser editors", async ({
      page,
    }) => {
      await expect(page.getByTestId("knob-parsing")).toHaveText(
        '["-12","1200","null"]'
      );
      await expect(page.getByTestId("pan-formatting")).toHaveText(
        '["C","L30","R100","-0.3","0.15","0","-0.5","null"]'
      );

      const gain = section(page, "knob-parse").getByRole("slider");
      const gainEditor = section(page, "knob-parse").getByRole("textbox");

      const pan = section(page, "pan-example").getByRole("slider", {
        name: "Pan",
      });

      const panEditor = section(page, "pan-example").getByRole("textbox");

      for (const [text, value] of [
        ["−12 dB", "-12"],
        ["1.2k", "1200"],
        ["gain", "1200"],
      ]) {
        await gain.press("Enter");
        await gainEditor.fill(text);
        await gainEditor.press("Enter");
        await expect(gain).toHaveAttribute("aria-valuenow", value);
      }

      for (const [text, value, label] of [
        ["L30", "-0.3", "L30"],
        ["r15", "0.15", "R15"],
        ["C", "0", "C"],
        ["-50", "-0.5", "L50"],
        ["left", "-0.5", "L50"],
      ]) {
        await pan.press("Enter");
        await panEditor.fill(text);
        await panEditor.press("Enter");
        await expect(pan).toHaveAttribute("aria-valuenow", value);
        await expect(
          section(page, "pan-example").locator('[data-slot="knob-value"]')
        ).toHaveText(label);
      }

      await pan.press("End");
      await expect(
        section(page, "pan-example").locator('[data-slot="knob-value"]')
      ).toHaveText("R100");
      await expect(
        section(page, "pan-slider").getByRole("slider", { name: "Pan" })
      ).toHaveAttribute("aria-valuetext", "25% right");
    });

    test("pan knob names its range, describes every key change, cancels edits and blocks disabled input", async ({
      page,
    }) => {
      const root = section(page, "pan-example");
      const dial = root.getByRole("slider", { name: "Pan" });

      await expect(dial).toHaveAttribute("tabindex", "0");
      await expect(dial).toHaveAttribute("aria-valuemin", "-1");
      await expect(dial).toHaveAttribute("aria-valuemax", "1");
      await expect(dial).toHaveAttribute("aria-valuenow", "0");
      await expect(dial).toHaveAttribute("aria-valuetext", "Center");
      await expect(root.locator('[data-slot="knob-value"]')).toHaveText("C");

      for (const [key, text] of [
        ["ArrowLeft", "5% left"],
        ["PageDown", "30% left"],
        ["PageUp", "5% left"],
        ["Shift+ArrowRight", "20% right"],
        ["Home", "100% left"],
        ["End", "100% right"],
      ]) {
        await dial.press(key);
        await expect(dial).toHaveAttribute("aria-valuetext", text);

        if (key === "PageDown")
          await expect(root.locator('[data-slot="knob-value"]')).toHaveText(
            "L30"
          );

        if (key === "Home")
          await expect(dial).toHaveAttribute("aria-valuenow", "-1");

        if (key === "End")
          await expect(dial).toHaveAttribute("aria-valuenow", "1");
      }

      await dial.dblclick();
      await expect(dial).toHaveAttribute("aria-valuetext", "Center");
      await dial.press("Enter");

      const editor = root.getByRole("textbox", { name: "Value" });

      await expect(editor).toBeFocused();
      await editor.fill("L30");
      await editor.press("Enter");
      await expect(dial).toHaveAttribute("aria-valuenow", "-0.3");
      await expect(dial).toHaveAttribute("aria-valuetext", "30% left");
      await expect(dial).toBeFocused();
      await dial.press("Enter");
      await editor.fill("R30");
      await editor.press("Escape");
      await expect(dial).toHaveAttribute("aria-valuenow", "-0.3");
      await expect(dial).toBeFocused();

      const disabled = section(page, "pan-disabled").getByRole("slider", {
        name: "Pan",
      });

      await expect(disabled).toHaveAttribute("aria-disabled", "true");
      await expect(disabled).toHaveAttribute("tabindex", "-1");
      await disabled.press("ArrowRight");
      await disabled.press("Enter");
      await expect(disabled).toHaveAttribute("aria-valuenow", "0");
      await expect(
        section(page, "pan-disabled").getByRole("textbox")
      ).toHaveCount(0);
    });

    test("mute, volume restoration and selected, disconnected or none devices keep their contracts", async ({
      page,
    }) => {
      const mute = section(page, "mute-toggle").getByRole("button", {
        name: "Mute",
      });

      const volume = section(page, "volume-zero");

      await mute.click();
      await expect(mute).toHaveAttribute("aria-pressed", "true");
      expect(await readJournal(page, "mute-toggle")).toEqual([
        { value: "true", reason: "click", type: "change" },
      ]);
      await expect(
        volume.getByRole("button", { name: "Mute" })
      ).toHaveAttribute("data-level", "muted");
      await volume.getByRole("button", { name: "Mute" }).click();
      await volume.getByRole("button", { name: "Unmute" }).click();
      expect(await readJournal(page, "volume-zero")).toEqual([
        { value: "1", reason: "", type: "change" },
      ]);
      await expect(
        section(page, "device-selected").getByRole("combobox")
      ).toContainText("USB mic");
      await expect(
        section(page, "device-missing").getByRole("combobox")
      ).toContainText("Unknown device (disconnected)");
      await expect(
        section(page, "device-missing").getByRole("combobox")
      ).toHaveAttribute("data-missing", "");
      await expect(
        section(page, "device-none").getByRole("combobox")
      ).toContainText("No microphone");
    });

    test("control effects release held pads once and do not report unrelated player updates", async ({
      page,
    }) => {
      await page.keyboard.down("a");
      await expect(page.getByTestId("pad-triggers")).toHaveText("1");
      await expect(page.getByTestId("pad-stops")).toHaveText("0");
      await page.getByRole("button", { name: "Load held pad" }).click();
      await expect(page.getByTestId("pad-stops")).toHaveText("1");
      await page.keyboard.up("a");
      await expect(page.getByTestId("pad-stops")).toHaveText("1");
      await page.getByRole("button", { name: "Unload held pad" }).click();
      await page.keyboard.down("a");
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expect(page.getByTestId("pad-stops")).toHaveText("2");
      await page.keyboard.up("a");
      await expect(page.getByTestId("pad-stops")).toHaveText("2");
      const before = await page.getByTestId("player-times").textContent();

      await page
        .getByRole("button", { name: "Unrelated player update" })
        .click();
      await expect(page.getByTestId("player-times")).toHaveText(before ?? "");
      await page.getByRole("button", { name: "Advance player time" }).click();
      await expect(page.getByTestId("player-times")).toHaveText("[12,13]");
    });

    test("sound pad progress includes its declarative value in server-rendered HTML", async ({
      page,
    }, info) => {
      const pluginModule = await import(
        runtime === "solid-1" ? "vite-plugin-solid" : "@solidjs/vite-plugin"
      );

      const alias = [{ find: "@", replacement: process.cwd() }];

      if (runtime === "solid-2")
        alias.push({ find: "solid-js/web", replacement: "@solidjs/web" });

      const server = await createServer({
        configFile: false,
        cacheDir: `test-results/controls/${runtime}/vite-ssr`,
        plugins: [pluginModule.default({ ssr: true })],
        resolve: { alias },
        optimizeDeps: { noDiscovery: true, include: [] },
        server: { middlewareMode: true, hmr: false, ws: false },
      });

      try {
        const fixture = await server.ssrLoadModule("/app/controls-ssr.tsx");
        const html: string = fixture.renderProgress();

        expect(html).toContain("--pad-progress:0.5000");
        await page.setContent(html);
        expect(
          await page
            .locator('[data-slot="sound-pad-progress"]')
            .evaluate((node) => node.style.getPropertyValue("--pad-progress"))
        ).toBe("0.5000");
        await mkdir(`test-results/controls/${runtime}`, { recursive: true });
        await writeFile(
          `test-results/controls/${runtime}/progress-ssr-${info.repeatEachIndex}.html`,
          html
        );
      } finally {
        await server.close();
      }
    });

    test("control contracts produce repeatable browser evidence without runtime errors", async ({
      page,
    }, info) => {
      const errors: string[] = [];

      page.on("pageerror", (error) => errors.push(error.message));
      await page.reload();
      await expect(
        section(page, "pan-example").getByRole("slider")
      ).toBeVisible();

      const directory = `test-results/controls/${runtime}`;

      const snapshot = await page
        .locator('[role="slider"]')
        .evaluateAll((nodes) =>
          nodes.map((node) => ({
            slot: node.getAttribute("data-slot"),
            value: node.getAttribute("aria-valuenow"),
            text: node.getAttribute("aria-valuetext"),
            tabindex: node.getAttribute("tabindex"),
          }))
        );

      await mkdir(directory, { recursive: true });
      await writeFile(
        `${directory}/contracts-${info.repeatEachIndex}.json`,
        JSON.stringify({ runtime, errors, snapshot }, null, 2)
      );
      await page.screenshot({
        path: `${directory}/contracts-${info.repeatEachIndex}.png`,
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  });
};
