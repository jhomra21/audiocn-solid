import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runAudioPlayerSuite = (runtime: string) => {
  test("player render callbacks, pointer seeking and controller ownership survive source switches", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/audio-player");

    const player = page.getByRole("group", {
      name: "Composable player",
      exact: true,
    });

    await expect(page.getByTestId("owned-status")).toHaveText("ready");

    const media = await page
      .getByTestId("owned-media")
      .locator("audio")
      .elementHandle();

    expect(media).not.toBeNull();

    const play = player.getByRole("button", {
      name: "Custom Play",
      exact: true,
    });

    await expect(play).toHaveAttribute("data-render-slot", "audio-player-play");
    await play.click();
    await expect(
      player.getByRole("button", { name: "Custom Pause", exact: true })
    ).toHaveAttribute("data-render-playing", "true");
    await player
      .getByRole("button", { name: "Custom Pause", exact: true })
      .click();
    const track = player.locator('[data-slot="audio-player-seek-track"]');
    const bounds = await track.boundingBox();

    if (!bounds) throw new Error("Seek track has no bounds");
    await page.mouse.click(
      bounds.x + bounds.width * 0.75,
      bounds.y + bounds.height / 2
    );
    await expect
      .poll(() =>
        player
          .getByRole("slider", { name: "Seek", exact: true })
          .getAttribute("aria-valuenow")
      )
      .toMatch(/^(1[5-9]|2[0-9])(\.|$)/);
    await page
      .getByRole("button", { name: "Use external controller", exact: true })
      .click();
    await expect(page.getByTestId("owned-status")).toHaveText("ready");
    expect(
      await media?.evaluate((node) => ({
        source: node.getAttribute("src"),
        paused: node instanceof HTMLAudioElement && node.paused,
      }))
    ).toEqual({ source: null, paused: true });
    await player
      .getByRole("button", { name: "Custom Play", exact: true })
      .click();
    await expect(page.getByTestId("external-playing")).toHaveText("true");
    await page
      .getByRole("button", { name: "Use internal controller", exact: true })
      .click();
    await expect(page.getByTestId("owned-status")).toHaveText("ready");
    await expect(page.getByTestId("external-playing")).toHaveText("true");
    await page
      .getByRole("button", { name: "Pause external", exact: true })
      .click();
    await mkdir(`test-results/audio-player/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/audio-player/${runtime}/composition-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
  test("audio player transport, keyboard seek, volume, rate and loop stay reactive", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/audio-player");

    const player = page.getByRole("group", {
      name: "Demo player",
      exact: true,
    });

    await expect(player).not.toHaveAttribute("data-loading");
    await expect(page.getByTestId("player-ready")).toHaveText("ready");
    await player.getByRole("button", { name: "Play", exact: true }).click();
    await expect(player).toHaveAttribute("data-playing", "");
    await player.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(player).toHaveAttribute("data-paused", "");
    const seek = player.getByRole("slider", { name: "Seek", exact: true });
    await seek.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("player-position")).toHaveText("5");
    await page.keyboard.press("Shift+ArrowRight");
    await expect(page.getByTestId("player-position")).toHaveText("20");
    await player
      .getByRole("button", { name: "Back 10 seconds", exact: true })
      .click();
    await expect(page.getByTestId("player-position")).toHaveText("10");
    await player
      .getByRole("button", { name: "Playback speed 1×", exact: true })
      .click();
    await expect(
      player.getByRole("button", { name: "Playback speed 1.25×", exact: true })
    ).toBeVisible();
    await player.getByRole("button", { name: "Loop off", exact: true }).click();
    await expect(
      player.getByRole("button", { name: "Loop on", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await player.getByRole("button", { name: "Mute", exact: true }).click();
    await expect(player).toHaveAttribute("data-muted", "");
    await player.getByRole("button", { name: "Unmute", exact: true }).click();
    await expect(player).not.toHaveAttribute("data-muted");
    const input = player.getByRole("textbox", { name: "Notes" });
    await input.fill("hello");
    await page.keyboard.press("Home");
    await expect(page.getByTestId("player-position")).toHaveText("10");
    await page.keyboard.press("m");
    await expect(player).not.toHaveAttribute("data-muted");
    await player.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByTestId("transport-next")).toHaveText("1");
    await mkdir(`test-results/audio-player/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/audio-player/${runtime}/transport-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
};
