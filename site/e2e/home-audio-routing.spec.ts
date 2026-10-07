import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

// Mirrors upstream test/demo-routing.test.tsx at 59411f5 for the `MixerTile`
// and `FadersTile` rows, mounted by the home route's own showcase grid.

const FRAME_MS = 16;

const SETTLE_MS = 800;

const FALL_MS = 4000;

const MUTE = /^Mute/u;

const evidencePath = join(
  import.meta.dirname,
  "../../artifacts/home-tile-contract-evidence.json"
);

interface RunEvidence {
  fault: string | null;
  startedAt: string;
  tests: Record<
    string,
    {
      observed: Record<string, { elapsedMs: number; value: number }[]>;
      status: string;
      durationMs: number;
      url: string;
      consoleErrors: string[];
      errors: string[];
    }
  >;
}

let observed: Record<string, { elapsedMs: number; value: number }[]> = {};

let elapsedMs = 0;

let consoleErrors: string[] = [];

const run: RunEvidence = {
  fault: process.env.HOME_ROUTING_FAULT ?? null,
  startedAt: new Date().toISOString(),
  tests: {},
};

test.beforeEach(({ page }) => {
  observed = {};
  elapsedMs = 0;
  consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
});

test.afterEach(({ page }, info) => {
  run.tests[`${info.title} [repeat ${info.repeatEachIndex}]`] = {
    observed,
    status: info.status ?? "unknown",
    durationMs: info.duration,
    url: page.url(),
    consoleErrors,
    errors: info.errors.map((error) => error.message ?? String(error.value)),
  };
});

test.afterAll(async () => {
  const previous: { runs?: Record<string, RunEvidence> } = await readFile(
    evidencePath,
    "utf8"
  ).then(
    (text) => JSON.parse(text),
    () => ({})
  );

  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify(
      {
        commands: [
          "cd site && bunx playwright test -c playwright.home-routing.config.ts",
          "cd site && HOME_ROUTING_FAULT=<name> bunx playwright test -c playwright.home-routing.config.ts",
        ],
        runs: {
          ...previous.runs,
          [`${run.fault ?? "baseline"}:${run.startedAt}`]: run,
        },
      },
      null,
      2
    )}\n`
  );
});

/**
 * Loads the home route and lets lazy tiles, fonts and network settle on the
 * running clock, then pauses it so tests control each time step explicitly.
 */
const open = async (page: Page, card: string) => {
  await page.clock.install({ time: 0 });
  await page.goto("/");

  const tile = page.getByRole("article", { name: card });

  await tile.scrollIntoViewIfNeeded();
  await expect(tile.locator('[data-slot="skeleton"]')).toHaveCount(0);
  await expect(tile.getByRole("meter").first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);

  return tile;
};

const advance = async (page: Page, ms: number) => {
  await page.clock.runFor(ms);
  elapsedMs += ms;
};

const jump = async (page: Page, ms: number) => {
  await page.clock.fastForward(ms);
  elapsedMs += ms;
};

const level = async (tile: Locator, name: string) => {
  const value = Number(
    await tile.getByRole("meter", { name }).getAttribute("aria-valuenow")
  );

  (observed[name] ??= []).push({ elapsedMs, value });

  return value;
};

/** A cleared meter reads the floor and has every drawn channel at zero. */
const expectCleared = async (tile: Locator, name: string) => {
  expect(await level(tile, name)).toBe(-60);

  const channels = await tile
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

const press = async (
  page: Page,
  tile: Locator,
  slider: string,
  key: "End" | "Home"
) => {
  await tile.getByRole("slider", { name: slider }).focus();
  await page.keyboard.press(key);
};

test("MixerTile clears mute on the next frame", async ({ page }) => {
  const tile = await open(page, "Mixer");

  await advance(page, SETTLE_MS);
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);

  const mute = tile.getByRole("button", { name: MUTE }).first();

  await mute.click();
  await advance(page, FRAME_MS);
  await expectCleared(tile, "Microphone level");
  await mute.click();
  await advance(page, SETTLE_MS);
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);
  await tile.getByRole("slider").first().focus();
  await page.keyboard.press("Home");
  await advance(page, FRAME_MS);
  // Ordinary fader changes still release smoothly after unmuting.
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);
});

test("MixerTile clears the master only when every input is muted", async ({
  page,
}) => {
  const tile = await open(page, "Mixer");

  await advance(page, SETTLE_MS);

  const [first, ...others] = await tile
    .getByRole("button", { name: MUTE })
    .all();

  expect(others).toHaveLength(3);
  await first?.click();
  await advance(page, FRAME_MS);
  expect(await level(tile, "Master level")).toBeGreaterThan(-60);

  for (const mute of others) await mute.click();

  await advance(page, FRAME_MS);
  await expectCleared(tile, "Master level");
  await first?.click();
  await advance(page, SETTLE_MS);
  expect(await level(tile, "Master level")).toBeGreaterThan(-60);
});

test("MixerTile routes Microphone volume into Microphone level", async ({
  page,
}) => {
  const tile = await open(page, "Mixer");

  await advance(page, SETTLE_MS);
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);
  await press(page, tile, "Microphone volume", "Home");
  await jump(page, FALL_MS);
  expect(await level(tile, "Microphone level")).toBeLessThanOrEqual(-60);
  await press(page, tile, "Microphone volume", "End");
  await advance(page, SETTLE_MS);
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);
});

test("FadersTile routes Drums volume into Drums level", async ({ page }) => {
  const tile = await open(page, "Faders");

  await advance(page, SETTLE_MS);
  expect(await level(tile, "Drums level")).toBeGreaterThan(-60);
  await press(page, tile, "Drums volume", "Home");
  await jump(page, FALL_MS);
  expect(await level(tile, "Drums level")).toBeLessThanOrEqual(-60);
  await press(page, tile, "Drums volume", "End");
  await advance(page, SETTLE_MS);
  expect(await level(tile, "Drums level")).toBeGreaterThan(-60);
});

test("MixerTile master follows channel faders and its own fader", async ({
  page,
}) => {
  const tile = await open(page, "Mixer");

  await advance(page, SETTLE_MS);
  expect(await level(tile, "Master level")).toBeGreaterThan(-60);

  // Each fader also renders an unlabelled hidden range input; only the
  // labelled slider elements are the faders.
  const channelFaders = tile.locator(
    '[role="slider"]:not([aria-label="Master volume"])'
  );

  for (const slider of await channelFaders.all()) {
    await slider.focus();
    await page.keyboard.press("Home");
  }

  await jump(page, FALL_MS);
  expect(await level(tile, "Master level")).toBeLessThan(-48);
  await press(page, tile, "Microphone volume", "End");
  await advance(page, SETTLE_MS);
  expect(await level(tile, "Master level")).toBeGreaterThan(-60);
  await press(page, tile, "Master volume", "Home");
  await jump(page, FALL_MS);
  expect(await level(tile, "Master level")).toBeLessThan(-48);
  expect(await level(tile, "Microphone level")).toBeGreaterThan(-60);
});
