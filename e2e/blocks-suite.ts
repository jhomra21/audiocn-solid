import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runBlocksSuite = (runtime: string) => {
  test("uncontrolled tabs select the first enabled item, preserve forced panels and follow RTL keys", async ({
    page,
  }, info) => {
    await page.goto("/blocks");
    const tabs = page.getByTestId("tabs-default");
    await expect(page.getByTestId("tabs-ref")).toHaveText("connected");
    await expect(tabs.getByRole("tab", { name: "Alpha" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(tabs.locator('[role="tabpanel"]')).toHaveCount(2);
    await expect(tabs.getByText("Beta content")).toBeHidden();
    await tabs.getByRole("tab", { name: "Alpha" }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.getByRole("tab", { name: "Beta" })).toBeFocused();
    await expect(tabs.getByText("Beta content")).toBeVisible();
    await page.keyboard.press("Home");
    await expect(tabs.getByRole("tab", { name: "Alpha" })).toBeFocused();
    await page.keyboard.press("End");
    await expect(tabs.getByRole("tab", { name: "Beta" })).toBeFocused();
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/tabs-default-${info.repeatEachIndex}.png`,
    });
  });

  test("switches contribute checked values to forms and restore their default on reset", async ({
    page,
  }, info) => {
    await page.goto("/blocks");
    const form = page.getByTestId("switch-form");
    const choice = form.getByRole("switch", { name: "Capture input" });
    await expect(choice).toHaveAttribute("aria-checked", "true");
    await form.getByRole("button", { name: "Read form" }).click();
    await expect(form.getByRole("status")).toHaveText("capture=yes");
    await choice.press("Space");
    await form.getByRole("button", { name: "Read form" }).click();
    await expect(form.getByRole("status")).toHaveText("empty");
    await form.getByRole("button", { name: "Reset form" }).click();
    await expect(choice).toHaveAttribute("aria-checked", "true");
    await form.getByRole("button", { name: "Read form" }).click();
    await expect(form.getByRole("status")).toHaveText("capture=yes");
    await form.getByRole("button", { name: "Reset form" }).click();
    await form.getByRole("button", { name: "Read form" }).click();
    await expect(form.getByRole("status")).toHaveText("capture=yes");
    await expect(form.locator('input[name="disabled"]')).toBeDisabled();
    await expect(form.locator('input[name="locked"]')).toBeChecked();
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/switch-form-${info.repeatEachIndex}.png`,
    });
  });

  test("field parts keep semantic grouping and reactive deduplicated errors", async ({
    page,
  }, info) => {
    await page.goto("/blocks");
    const field = page.getByTestId("field-contract");
    await expect(field.locator("fieldset")).toHaveAccessibleName(
      "Capture preferences"
    );
    await expect(field.getByRole("alert")).toHaveText("Permission denied");
    await field.getByRole("button", { name: "Show more errors" }).click();
    await expect(field.getByRole("alert").getByRole("listitem")).toHaveText([
      "Permission denied",
      "Device disconnected",
    ]);
    await field.getByRole("button", { name: "Clear errors" }).click();
    await expect(field.getByRole("alert")).toHaveCount(0);
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/fields-${info.repeatEachIndex}.png`,
    });
  });
  test("conditional slots create their children once", async ({ page }) => {
    await page.goto("/blocks");
    const probe = page.getByTestId("single-creation");
    await expect(probe.getByText("Actions")).toBeVisible();
    await expect(probe.getByRole("status")).toHaveText("created=4");
  });
  test("number input accepts negative drafts and ignores incomplete text", async ({
    page,
  }) => {
    await page.goto("/blocks");
    const section = page.getByTestId("negative-input");
    const input = section.getByRole("spinbutton", { name: "Trim" });
    await input.fill("5");
    await input.press("Enter");
    await expect(section.getByRole("status")).toHaveText("trim=5");
    await input.selectText();
    await input.pressSequentially("-6");
    await expect(input).toHaveValue("-6");
    await input.press("Enter");
    await expect(section.getByRole("status")).toHaveText("trim=-6");
    await input.selectText();
    await page.keyboard.press("Backspace");
    await expect(section.getByRole("status")).toHaveText("trim=-6");
    await input.blur();
    await expect(input).toHaveValue("-6");
  });
  test("tabs respect controlled values, disabled items, vertical manual navigation and panel ownership", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/blocks");
    const tabs = page.getByTestId("tabs-contract");
    const first = tabs.getByRole("tab", { name: "First setting" });
    const second = tabs.getByRole("tab", { name: "Second setting" });
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(
      tabs.getByRole("tab", { name: "Disabled setting" })
    ).toBeDisabled();
    await first.focus();
    await page.keyboard.press("ArrowDown");
    await expect(second).toBeFocused();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-selected", "true");
    await expect(tabs.getByRole("tabpanel")).toHaveText("Second panel");
    await expect(second).toHaveAttribute(
      "aria-controls",
      (await tabs.getByRole("tabpanel").getAttribute("id")) ?? ""
    );
    await page.keyboard.press("ArrowDown");
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(second).toBeFocused();
    await tabs.getByRole("button", { name: "Reset selected tab" }).click();
    await expect(first).toHaveAttribute("aria-selected", "true");
    await expect(tabs.getByRole("tabpanel")).toHaveText("First panel");
    await expect(
      page.getByTestId("tabs-unmatched").getByRole("tab", { name: "On" })
    ).toHaveAttribute("tabindex", "0");
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/tabs-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
  test("mixer block switches layouts, changes channels, resets and exposes an output stream", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/blocks");
    const mixer = page.getByTestId("mixer-block");
    await expect(page.getByTestId("mixer-output")).toHaveText("active");
    await mixer
      .getByRole("button", { name: "Mute Music", exact: true })
      .click();
    await expect(
      mixer.getByRole("button", { name: "Mute Music", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await mixer.getByRole("tab", { name: "Console", exact: true }).click();
    await expect(mixer.locator('[data-slot="mixer"]')).toHaveAttribute(
      "data-orientation",
      "vertical"
    );
    await mixer.getByRole("tab", { name: "Console", exact: true }).focus();
    await page.keyboard.press("ArrowLeft");
    await expect(
      mixer.getByRole("tab", { name: "Rows", exact: true })
    ).toHaveAttribute("aria-selected", "true");

    const volume = mixer.getByRole("slider", {
      name: "Music volume",
      exact: true,
    });

    const initial = await volume.getAttribute("aria-valuenow");

    if (initial === null) throw new Error("Music fader has no value");
    await volume.focus();
    await page.keyboard.press("ArrowRight");
    await expect(volume).not.toHaveAttribute("aria-valuenow", initial);
    await mixer
      .getByRole("button", { name: "Reset mixer", exact: true })
      .click();
    await expect(volume).toHaveAttribute("aria-valuenow", initial);
    await expect(volume).toHaveAttribute("aria-valuetext", "−12.0 dB");
    await expect(
      mixer.getByRole("button", { name: "Mute Music", exact: true })
    ).toHaveAttribute("aria-pressed", "false");
    await page
      .getByRole("button", { name: "Audio settings", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Microphone and system audio."
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/mixer-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });

  test("capture blocks gate permission, judge microphone levels and release processed streams", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.addInitScript(() => {
      let stopped = 0;

      const makeAudio = () => {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0.1;
        const destination = context.createMediaStreamDestination();
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start();
        void context.resume();

        for (const track of destination.stream.getTracks()) {
          const stop = track.stop.bind(track);
          track.stop = () => {
            stopped++;
            document.documentElement.dataset.stoppedCaptureTracks =
              String(stopped);
            oscillator.stop();
            void context.close();
            stop();
          };
        }

        return destination.stream;
      };

      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        value: async () => makeAudio(),
      });
      Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
        value: async () => makeAudio(),
      });
      Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
        value: async () => [
          {
            deviceId: "studio",
            groupId: "studio",
            kind: "audioinput",
            label: "Studio microphone",
            toJSON: () => ({}),
          },
        ],
      });
    });
    await page.goto("/blocks");
    const mic = page.getByTestId("mic-block");
    await expect(
      mic.getByRole("button", { name: "Check level", exact: true })
    ).toBeDisabled();
    await mic
      .getByRole("button", { name: "Turn on microphone", exact: true })
      .click();
    await expect(
      mic.getByRole("button", { name: "Check level", exact: true })
    ).toBeEnabled();
    await mic.getByRole("button", { name: "Check level", exact: true }).click();
    await expect(mic.getByText("Sounds good", { exact: true })).toBeVisible();

    const mute = mic.getByRole("switch", {
      name: "Mute microphone",
      exact: true,
    });

    await mute.click();
    await expect(mute).toHaveAttribute("aria-checked", "true");
    const settings = page.getByTestId("system-settings-block");

    const capture = settings.getByRole("switch", {
      name: "Capture system audio",
      exact: true,
    });

    await capture.click();
    await expect(page.getByTestId("processed-stream")).toHaveText("active");
    await expect(
      settings.getByRole("meter", { name: "System audio level" }).first()
    ).toBeVisible();
    await capture.click();
    expect(failures).toEqual([]);
    await expect(page.getByTestId("processed-stream")).toHaveText("none");
    await expect
      .poll(() =>
        page.locator("html").getAttribute("data-stopped-capture-tracks")
      )
      .toBe("1");
    await page
      .getByRole("button", { name: "Remove capture blocks", exact: true })
      .click();
    await expect
      .poll(() =>
        page.locator("html").getAttribute("data-stopped-capture-tracks")
      )
      .toBe("2");
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/capture-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });

  test("music block changes tracks, exposes repeat and shuffle, and handles an empty queue", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/blocks");
    const music = page.getByTestId("music-block");
    await expect(music.locator('[data-slot="audio-player-title"]')).toHaveText(
      "Night Drive"
    );
    await music.getByRole("button", { name: "Play", exact: true }).click();
    await expect(music.locator('[data-slot="audio-player"]')).toHaveAttribute(
      "data-playing",
      ""
    );
    await music.getByRole("button", { name: "Next", exact: true }).click();
    await expect(music.locator('[data-slot="audio-player-title"]')).toHaveText(
      "Low Tide"
    );
    await expect(music.locator('[data-slot="audio-player"]')).toHaveAttribute(
      "data-playing",
      ""
    );
    await music.getByRole("button", { name: "Shuffle", exact: true }).click();
    await expect(
      music.getByRole("button", { name: "Shuffle", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await music
      .getByRole("button", { name: "Repeat: all", exact: true })
      .click();
    await expect(
      music.getByRole("button", { name: "Repeat: one", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: "Clear music tracks", exact: true })
      .click();
    await expect(music).toContainText("No music");
    await expect(
      music.getByRole("button", { name: "Pause", exact: true })
    ).toHaveCount(0);
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/music-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });

  test("soundboard supports menus, uploads, removal undo, hotkeys and stop all", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/blocks");
    const board = page.getByTestId("soundboard-block");
    const pad = board.getByRole("button", { name: /Airhorn/ });
    await expect(pad).not.toHaveAttribute("data-loading");
    await pad.click({ button: "right" });
    await page
      .getByRole("menuitemradio", { name: "Loop", exact: true })
      .click();
    expect(failures).toEqual([]);
    await expect(
      page.getByRole("menuitemradio", { name: "Loop", exact: true })
    ).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await pad.click();
    await expect(pad).toHaveAttribute("data-playing", "");
    await board.getByRole("button", { name: "Stop all", exact: true }).click();
    await expect(pad).not.toHaveAttribute("data-playing");
    await pad.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
    await expect(pad).toHaveCount(0);
    await board
      .getByRole("button", { name: "Undo removal", exact: true })
      .click();
    await expect(pad).toBeVisible();
    await board.getByRole("switch", { name: "Hotkeys", exact: true }).click();
    await page.keyboard.press("1");
    await expect(pad).not.toHaveAttribute("data-playing");
    await page
      .getByRole("button", { name: "Clear board sounds", exact: true })
      .click();
    await expect(board).toContainText("No sounds yet");
    await board.getByLabel("Add audio files").setInputFiles({
      name: "not-audio.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("not audio"),
    });
    await expect(board).toContainText("No new sounds added");
    await board.getByLabel("Add audio files").setInputFiles({
      name: "invalid.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("invalid audio"),
    });
    await expect(board.getByRole("button", { name: /invalid/ })).toBeVisible();
    await expect(
      board.getByRole("button", { name: /invalid/ })
    ).toHaveAttribute("data-error", "");
    await page.evaluate(() => {
      const urls: string[] = [];
      const revoke = URL.revokeObjectURL;
      URL.revokeObjectURL = (url) => {
        urls.push(url);
        revoke(url);
      };

      Object.assign(window, { revokedUrls: urls });
    });
    const toggle = page.getByRole("button", { name: "Toggle board" });
    await toggle.click();
    await expect(board.getByRole("button", { name: /invalid/ })).toHaveCount(0);
    await toggle.click();
    await expect(board.getByRole("button", { name: /invalid/ })).toBeVisible();
    expect(
      await page.evaluate(() =>
        "revokedUrls" in window && Array.isArray(window.revokedUrls)
          ? window.revokedUrls.length
          : -1
      )
    ).toBe(0);
    await mkdir(`test-results/blocks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/blocks/${runtime}/soundboard-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
};
