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

export const runControlsSuite = (runtime: string) => {
  const dragEvidence: unknown[] = [];

  for (const state of ["suspended", "running", "interrupted"] as const) {
    for (const sessionType of ["auto", "play-and-record"] as const) {
      test(`standalone knob click routes ${sessionType} audio and recovers ${state} contexts`, async ({
        page,
      }, info) => {
        await page.addInitScript(
          ({ state, sessionType }) => {
            const events: { event: string; active: boolean }[] = [];
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
                  events.push({
                    event: `resume:${this.state}`,
                    active: navigator.userActivation.isActive,
                  });
                  Reflect.deleteProperty(this, "state");

                  return resume();
                };

                const createSource = this.createBufferSource.bind(this);
                this.createBufferSource = () => {
                  const source = createSource();
                  const start = source.start.bind(source);
                  source.start = () => {
                    events.push({
                      event: `start:${type}`,
                      active: navigator.userActivation.isActive,
                    });
                    document.documentElement.dataset.knobAudioEvents =
                      JSON.stringify(events);
                    start();
                  };

                  return source;
                };
              }
            };
          },
          { state, sessionType }
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
