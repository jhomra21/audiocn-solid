import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { advance, installFrameHarness } from "./frame-harness";

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);

const open = async (page: Page) => {
  await page.route("**/cover.png", (route) =>
    route.fulfill({ body: PNG, contentType: "image/png" })
  );
  await page.goto("/mixer-media");
};

const padCounts = async (page: Page) =>
  JSON.parse((await page.getByTestId("pad-counts").textContent()) ?? "{}");

const meterDb = async (page: Page, name: string) =>
  Number(await page.getByRole("meter", { name }).getAttribute("aria-valuenow"));

const expectCleared = async (page: Page, name: string) => {
  expect(await meterDb(page, name)).toBe(-60);

  const channels = await page
    .getByRole("meter", { name })
    .locator('[data-slot="level-meter-channel"]')
    .evaluateAll((nodes) =>
      nodes.map((node) =>
        ["--meter-level", "--meter-rms", "--meter-hold"].map((property) =>
          Number(node.style.getPropertyValue(property))
        )
      )
    );

  expect(channels.length).toBeGreaterThan(0);

  for (const values of channels) expect(values).toEqual([0, 0, 0]);
};

export const runMixerMediaSuite = () => {
  test.describe("mixer and media contracts", () => {
    test("channel strip is a named group that passes its orientation down", async ({
      page,
    }) => {
      await open(page);

      const strip = page
        .getByTestId("strip-vertical")
        .getByRole("group", { name: "Mic" });

      await expect(strip).toHaveAttribute("data-muted", "");

      const meter = page.getByTestId("strip-vertical").getByRole("meter");

      await expect(meter).toHaveAttribute("data-orientation", "vertical");
      await expect(meter).toHaveAttribute("data-dimmed", "");
    });

    test("channel strip lays its parts out on an inner grid and keeps console strips from shrinking", async ({
      page,
    }) => {
      await open(page);

      const strip = page
        .getByTestId("strip-plain")
        .getByRole("group", { name: "Plain" });

      const layout = strip.locator('[data-slot="channel-strip-layout"]');

      await expect(layout.getByText("Plain")).toBeVisible();
      expect(await strip.getAttribute("class")).toContain(
        "@container/channel-strip"
      );
      await expect(
        page.getByTestId("strip-tall").getByRole("group", { name: "Tall" })
      ).toHaveClass(/shrink-0/);
      expect(
        await page
          .getByTestId("strip-tall")
          .getByRole("group", { name: "Tall" })
          .evaluate((node) => getComputedStyle(node).flexShrink)
      ).toBe("0");
    });

    test("channel strip reserves a fader row only when the strip has a fader", async ({
      page,
    }) => {
      await open(page);

      const layout = page
        .getByTestId("strip-plain")
        .locator('[data-slot="channel-strip-layout"]');

      const classes = ((await layout.getAttribute("class")) ?? "").split(" ");

      // Without a fader, the stacked and the wide layout are one meter row.
      expect(classes).toContain(
        "[grid-template-areas:'header_header_header'_'meter_value_controls']"
      );
      expect(classes).toContain(
        "@xl/channel-strip:[grid-template-areas:'header_meter_value_controls']"
      );

      const faderRows = classes.filter((name) => name.includes("fader_value"));

      expect(faderRows).toHaveLength(4);

      for (const name of faderRows)
        expect(name).toContain("has-[>[data-slot=channel-strip-fader]]");

      const areas = (node: Element) => getComputedStyle(node).gridTemplateAreas;

      expect(await layout.evaluate(areas)).not.toContain("fader");
    });

    test("channel strip exposes its state to custom parts", async ({
      page,
    }) => {
      await open(page);
      await expect(page.getByText("soloed", { exact: true })).toBeVisible();
    });

    test("mixer shows the empty state without channels", async ({ page }) => {
      await open(page);
      await expect(page.getByText("Nothing here")).toBeVisible();
    });

    test("mixer moves focus to the same control on the next strip with Ctrl+arrow", async ({
      page,
    }) => {
      await open(page);

      const pair = page.getByTestId("mixer-pair");

      await pair.getByRole("slider", { name: "A volume" }).focus();
      await page.keyboard.press("Control+ArrowRight");
      await expect(
        pair.getByRole("slider", { name: "B volume" })
      ).toBeFocused();
    });

    test("waveform seeks with the keyboard", async ({ page }) => {
      await open(page);

      const slider = page.getByRole("slider", { name: "Clip" });

      await expect(slider).toHaveAttribute("aria-valuetext", "0:10 of 1:00");
      await slider.focus();
      await page.keyboard.press("Shift+ArrowRight");
      await expect(page.getByTestId("seeks")).toHaveText("[25]");
      await page.keyboard.press("End");
      await expect(page.getByTestId("seeks")).toHaveText("[25,60]");
    });

    test("waveform is not a slider when display only", async ({ page }) => {
      await open(page);
      await expect(
        page.getByRole("slider", { name: "Display only" })
      ).toHaveCount(0);
      await expect(
        page.getByTestId("waveforms").getByRole("slider")
      ).toHaveCount(1);
    });

    test("track list selects with Enter and moves with the arrow keys", async ({
      page,
    }) => {
      await open(page);

      const [first, second] = await page
        .getByTestId("tracks")
        .getByRole("listitem")
        .all();

      await expect(first!).toHaveAttribute("aria-current", "true");
      await first!.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByTestId("selected")).toHaveText("1");
      await page.keyboard.press("ArrowDown");
      await expect(second!).toBeFocused();
    });

    test("sound pad moves focus with arrow keys even when a trigger replaces the pad's slot", async ({
      page,
    }) => {
      await open(page);

      const one = page.getByRole("button", { name: "One" });

      await one.focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.getByRole("button", { name: "Two" })).toBeFocused();
    });

    test("sound pad keeps its accent when a trigger passes its own style", async ({
      page,
    }) => {
      await open(page);

      const style = await page
        .getByRole("button", { name: "Accent pad" })
        .evaluate((node: HTMLElement) => ({
          accent: node.style.getPropertyValue("--pad-accent"),
          own: node.style.getPropertyValue("--from-test"),
        }));

      expect(style).toEqual({ accent: "red", own: "1" });
    });

    test("sound pad grid caps its columns and keeps a minimum pad width", async ({
      page,
    }) => {
      await open(page);

      const grid = page.getByRole("group", { name: "Column pads" });

      const style = await grid.evaluate((node: HTMLElement) => ({
        columns: node.style.getPropertyValue("--pad-columns"),
        own: node.style.getPropertyValue("--from-test"),
      }));

      expect(style.columns).toContain("auto-fill");
      expect(style.columns).toContain("/ 4");
      expect(style.own).toBe("1");
    });

    test("sound pad toggles in toggle mode", async ({ page }) => {
      await open(page);

      const pad = page.getByRole("button", { name: "Toggle mode pad" });
      await pad.scrollIntoViewIfNeeded();

      const box = (await pad.boundingBox())!;

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      expect(await padCounts(page)).toEqual({ toggleTrigger: 1 });
      await page.getByRole("button", { name: "Mark toggle playing" }).click();
      await expect(pad).toHaveAttribute("aria-pressed", "true");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.up();
      expect(await padCounts(page)).toEqual({
        toggleStop: 1,
        toggleTrigger: 1,
      });
    });

    test("sound pad stops a hold pad on release", async ({ page }) => {
      await open(page);

      const pad = page.getByRole("button", { name: "Hold mode pad" });
      await pad.scrollIntoViewIfNeeded();

      const box = (await pad.boundingBox())!;

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      expect(await padCounts(page)).toEqual({ holdTrigger: 1 });
      await page.mouse.up();
      expect(await padCounts(page)).toEqual({ holdStop: 1, holdTrigger: 1 });
    });

    test("sound pad triggers from a grid hotkey but not while typing", async ({
      page,
    }) => {
      await open(page);
      await page.keyboard.press("q");
      expect(await padCounts(page)).toEqual({ hotkey: 1 });
      await page.getByRole("textbox", { name: "Notes" }).focus();
      await page.keyboard.press("q");
      expect(await padCounts(page)).toEqual({ hotkey: 1 });
    });

    test("audio player distinguishes meaningful artwork from decorative artwork", async ({
      page,
    }) => {
      await open(page);

      const artwork = page.getByTestId("artwork");

      await expect(
        artwork.getByRole("img", { name: "Night Drive album cover" })
      ).toBeVisible();
      await expect(artwork.getByRole("img")).toHaveCount(1);
      await expect(artwork.getByTestId("decorative")).toHaveAttribute(
        "alt",
        ""
      );
      await expect(artwork.getByRole("presentation")).toHaveCount(1);
    });

    test("audio player renders parts bound to an external player", async ({
      page,
    }) => {
      await open(page);

      const player = page.getByTestId("external-player");

      await player.getByRole("button", { name: "Play" }).click();
      await expect(page.getByTestId("player-log")).toHaveText('["toggle"]');
      await expect(player.getByText("1:24", { exact: true })).toBeVisible();
      await expect(player.getByText("−2:16", { exact: true })).toBeVisible();
    });

    test("audio player handles keyboard shortcuts", async ({ page }) => {
      await open(page);
      await page.getByText("focus target").focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("m");
      await page.keyboard.press("k");
      await expect(page.getByTestId("player-log")).toHaveText(
        '["seek:89","muted:true","toggle"]'
      );
    });
    test("console solo isolates channels, respects mute and restores the mix", async ({
      page,
    }) => {
      await installFrameHarness(page);
      await page.goto("/mixer-media?case=console");
      await advance(page, 800);
      await page.getByRole("button", { name: "Solo Mic" }).click();
      await advance(page, 16);
      expect(await meterDb(page, "Mic level")).toBeGreaterThan(-60);
      await expectCleared(page, "Music level");
      await expectCleared(page, "Game level");
      await page.getByRole("button", { name: "Solo Music" }).click();
      await advance(page, 800);
      expect(await meterDb(page, "Mic level")).toBeGreaterThan(-60);
      expect(await meterDb(page, "Music level")).toBeGreaterThan(-60);
      expect(await meterDb(page, "Game level")).toBe(-60);
      await page.getByRole("button", { name: "Mute Mic" }).click();
      await advance(page, 16);
      await expectCleared(page, "Mic level");
      expect(await meterDb(page, "Music level")).toBeGreaterThan(-60);
      await page.getByRole("button", { name: "Solo Mic" }).click();
      await page.getByRole("button", { name: "Solo Music" }).click();
      await advance(page, 800);
      expect(await meterDb(page, "Mic level")).toBe(-60);
      expect(await meterDb(page, "Music level")).toBeGreaterThan(-60);
      expect(await meterDb(page, "Game level")).toBeGreaterThan(-60);
    });
  });
};
