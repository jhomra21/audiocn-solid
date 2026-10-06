import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { advance, installFrameHarness } from "./frame-harness";

const open = async (page: Page, name: string) => {
  await installFrameHarness(page);
  await page.goto(`/demo-routing?case=${name}`);
};

const level = async (page: Page, name: string) =>
  Number(await page.getByRole("meter", { name }).getAttribute("aria-valuenow"));

/** A cleared meter reads the floor and has every drawn channel at zero. */
const expectCleared = async (page: Page, name: string) => {
  expect(await level(page, name)).toBe(-60);

  const channels = await page
    .getByRole("meter", { name })
    .locator('[data-slot="level-meter-channel"]')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        ["--meter-level", "--meter-rms", "--meter-hold"].map((property) =>
          node.style.getPropertyValue(property)
        )
      )
    );

  expect(channels.length).toBeGreaterThan(0);

  for (const values of channels) {
    for (const value of values) {
      expect(value).not.toBe("");
      expect(Number(value)).toBe(0);
    }
  }
};

const press = async (page: Page, slider: string, key: "Home" | "End") => {
  await page.getByRole("slider", { name: slider }).focus();
  await page.keyboard.press(key);
};

const MUTE = /^Mute/u;

const FRAME_MS = 16;

const SETTLE_MS = 800;

const FALL_MS = 4000;

const MUTE_CASES = [
  { component: "ChannelStripDemo", meter: "Microphone level" },
  { component: "ChannelStripConsole", meter: "Mic level" },
  { component: "MixerConsole", meter: "In 1 level" },
  { component: "MixerDemo", meter: "Microphone level" },
];

const MASTER_CASES = ["MixerDemo"];

const FADER_CASES = [
  {
    component: "FaderWithMeter",
    fader: "Program gain",
    meter: "Program level",
  },
  {
    component: "ChannelStripDemo",
    fader: "Microphone volume",
    meter: "Microphone level",
  },
  {
    component: "ChannelStripConsole",
    fader: "Mic volume",
    meter: "Mic level",
  },
  { component: "MixerConsole", fader: "In 1 volume", meter: "In 1 level" },
  {
    component: "MixerDemo",
    fader: "Microphone volume",
    meter: "Microphone level",
  },
];

export const runDemoRoutingSuite = () => {
  test.describe("demo meter routing", () => {
    for (const { component, meter } of MUTE_CASES) {
      test(`${component} clears mute on the next frame`, async ({ page }) => {
        await open(page, component);
        await advance(page, SETTLE_MS);
        expect(await level(page, meter)).toBeGreaterThan(-60);

        const mute = page.getByRole("button", { name: MUTE }).first();

        await mute.click();
        await advance(page, FRAME_MS);
        await expectCleared(page, meter);
        await mute.click();
        await advance(page, SETTLE_MS);
        expect(await level(page, meter)).toBeGreaterThan(-60);
        await page.getByRole("slider").first().focus();
        await page.keyboard.press("Home");
        await advance(page, FRAME_MS);
        // Ordinary fader changes still release smoothly after unmuting.
        expect(await level(page, meter)).toBeGreaterThan(-60);
      });
    }

    for (const component of MASTER_CASES) {
      test(`${component} clears the master only when every input is muted`, async ({
        page,
      }) => {
        await open(page, component);
        await advance(page, SETTLE_MS);

        const mutes = await page.getByRole("button", { name: MUTE }).all();
        const [first, ...others] = mutes;

        await first?.click();
        await advance(page, FRAME_MS);
        expect(await level(page, "Master level")).toBeGreaterThan(-60);

        for (const mute of others) await mute.click();
        await advance(page, FRAME_MS);
        await expectCleared(page, "Master level");
        await first?.click();
        await advance(page, SETTLE_MS);
        expect(await level(page, "Master level")).toBeGreaterThan(-60);
      });
    }

    for (const { component, fader, meter } of FADER_CASES) {
      test(`${component} routes ${fader} into ${meter}`, async ({ page }) => {
        await open(page, component);
        await advance(page, SETTLE_MS);
        expect(await level(page, meter)).toBeGreaterThan(-60);
        await press(page, fader, "Home");
        await advance(page, FALL_MS);
        expect(await level(page, meter)).toBeLessThanOrEqual(-60);
        await press(page, fader, "End");
        await advance(page, SETTLE_MS);
        expect(await level(page, meter)).toBeGreaterThan(-60);
      });
    }

    for (const component of MASTER_CASES) {
      test(`${component} master follows channel faders and its own fader`, async ({
        page,
      }) => {
        await open(page, component);
        await advance(page, SETTLE_MS);
        expect(await level(page, "Master level")).toBeGreaterThan(-60);

        // Each fader also renders an unlabelled hidden range input; only the
        // labelled slider elements are the faders.
        const channelFaders = page.locator(
          '[role="slider"]:not([aria-label="Master volume"])'
        );

        for (const slider of await channelFaders.all()) {
          await slider.focus();
          await page.keyboard.press("Home");
        }

        await advance(page, FALL_MS);
        expect(await level(page, "Master level")).toBeLessThan(-48);
        await press(page, "Microphone volume", "End");
        await advance(page, SETTLE_MS);
        expect(await level(page, "Master level")).toBeGreaterThan(-60);
        await press(page, "Master volume", "Home");
        await advance(page, FALL_MS);
        expect(await level(page, "Master level")).toBeLessThan(-48);
        expect(await level(page, "Microphone level")).toBeGreaterThan(-60);
      });
    }
  });
};
