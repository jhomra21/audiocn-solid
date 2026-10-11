import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import {
  installInterruptionProbe,
  interruptContext,
  resumeCalls,
} from "./audio-hooks-suite";

const tone = (seconds = 3) => {
  const rate = 8000;
  const samples = rate * seconds;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + samples * 2, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);

  for (let index = 0; index < samples; index++) {
    wav.writeInt16LE(
      Math.round(Math.sin((index * Math.PI) / 10) * 1000),
      44 + index * 2
    );
  }

  return wav;
};

const audioRoutes = async (page: Page) => {
  await page.route("**/test-tone.wav", (route) =>
    route.fulfill({ body: tone(30), contentType: "audio/wav" })
  );
  await page.route("**/bad-tone.wav", (route) =>
    route.fulfill({ status: 404, body: "missing" })
  );
};

export const runPlaybackSuite = (runtime: string) => {
  for (const state of ["suspended", "running", "interrupted"] as const) {
    for (const sessionType of ["auto", "play-and-record"] as const) {
      test(`provided-context sound playback selects ${sessionType} routing from ${state} in its own gesture`, async ({
        page,
      }, info) => {
        await installInterruptionProbe(page);
        await audioRoutes(page);
        await page.goto("/playback?decoded=1");
        await expect(page.getByTestId("sound-loaded")).toHaveText("true");

        if (state !== "suspended") {
          await page.getByRole("heading").click();
          await expect
            .poll(() =>
              page.evaluate(() => window.interruptionProbe.contexts[0]?.state)
            )
            .toBe("running");
        }

        if (state === "interrupted") await interruptContext(page);

        if (state === "suspended")
          await page.evaluate(() => {
            const context = window.interruptionProbe.contexts[0]!;
            // Native WebKit can initially report interrupted; pin this contract's state.
            Object.defineProperty(context, "state", {
              configurable: true,
              value: "suspended",
            });
          });

        await page.evaluate((sessionType) => {
          const events: string[] = [];
          window.audioSessionCalls = events;
          window.interruptionProbe.calls.length = 0;
          let type: string = sessionType;
          Object.defineProperty(navigator, "audioSession", {
            configurable: true,
            value: {
              get type() {
                return type;
              },
              set type(next: string) {
                events.push(
                  `session:${next}:${navigator.userActivation.isActive}`
                );
                type = next;
              },
            },
          });
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function () {
            events.push(`start:${type}:${navigator.userActivation.isActive}`);
            start.call(this);
          };

          window.addEventListener(
            "pointerdown",
            (event) => event.stopPropagation(),
            { capture: true, once: true }
          );
        }, sessionType);
        await page
          .getByRole("button", { name: "Play sound", exact: true })
          .click();
        expect(await page.evaluate(() => window.audioSessionCalls)).toEqual([
          ...(sessionType === "auto" ? ["session:playback:true"] : []),
          `start:${sessionType === "auto" ? "playback" : sessionType}:true`,
        ]);
        expect(await resumeCalls(page)).toEqual(
          state === "running" ? [] : [{ state, active: true }]
        );
        await expect
          .poll(async () =>
            Number(await page.getByTestId("sound-progress").textContent())
          )
          .toBeGreaterThan(0);
        await info.attach("provided-context-playback-routing", {
          body: JSON.stringify({
            state,
            sessionType,
            calls: await resumeCalls(page),
          }),
          contentType: "application/json",
        });
      });
    }
  }

  for (const sessionType of ["auto", "play-and-record"] as const) {
    test(`standalone HTMLAudio playback starts synchronously without overriding ${sessionType}`, async ({
      page,
    }, info) => {
      await page.addInitScript((sessionType) => {
        const events: string[] = [];
        window.audioSessionCalls = events;
        Object.defineProperty(navigator, "audioSession", {
          configurable: true,
          value: {
            get type() {
              return sessionType;
            },
            set type(next: string) {
              events.push(`session:${next}`);
            },
          },
        });
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          events.push(`play:${navigator.userActivation.isActive}`);

          return play.call(this);
        };

        const resume = AudioContext.prototype.resume;
        AudioContext.prototype.resume = function () {
          events.push("resume");

          return resume.call(this);
        };
      }, sessionType);
      await audioRoutes(page);
      await page.goto("/playback");
      await expect(page.getByTestId("player-status")).toHaveText("ready");
      await page
        .getByRole("button", { name: "Play media", exact: true })
        .click();
      await expect(page.getByTestId("player-status")).toHaveText("playing");
      await expect
        .poll(async () =>
          Number(await page.getByTestId("smooth-time").textContent())
        )
        .toBeGreaterThan(0.1);
      const events = await page.evaluate(() => window.audioSessionCalls);
      expect(events).toEqual(["play:true"]);
      await info.attach("standalone-native-media-playback", {
        body: JSON.stringify({ sessionType, events }),
        contentType: "application/json",
      });
    });
  }

  test("decoded playback resumes an interrupted native context directly in the play gesture", async ({
    page,
  }, info) => {
    await installInterruptionProbe(page);
    await audioRoutes(page);
    await page.goto("/playback?decoded=1");
    await expect(page.getByTestId("sound-loaded")).toHaveText("true");
    await page.getByRole("heading").click();
    await expect
      .poll(() =>
        page.evaluate(() => window.interruptionProbe.contexts[0]?.state)
      )
      .toBe("running");
    await interruptContext(page);
    await page.evaluate(() => {
      // Isolate useSound.play from the hook's document gesture listener.
      window.addEventListener(
        "pointerdown",
        (event) => event.stopPropagation(),
        { capture: true, once: true }
      );
    });
    await page.getByRole("button", { name: "Play sound", exact: true }).click();
    await expect
      .poll(async () =>
        Number(await page.getByTestId("sound-progress").textContent())
      )
      .toBeGreaterThan(0);

    const calls = await resumeCalls(page);

    expect(calls).toEqual([{ state: "interrupted", active: true }]);
    await info.attach("native-resume-calls", {
      body: JSON.stringify(calls),
      contentType: "application/json",
    });
  });

  test("owned media playback mirrors events, smooth time, reactive options and disposal", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await audioRoutes(page);
    await page.goto("/playback");
    await expect(page.getByTestId("player-status")).toHaveText("ready");
    await expect(page.getByTestId("player-duration")).toHaveText("30");
    await page.getByRole("button", { name: "Play media", exact: true }).click();
    await expect(page.getByTestId("player-status")).toHaveText("playing");
    await expect
      .poll(async () =>
        Number(await page.getByTestId("smooth-time").textContent())
      )
      .toBeGreaterThan(0.1);
    await page.getByRole("button", { name: "Pause media" }).click();
    await expect(page.getByTestId("player-status")).toHaveText("paused");
    await page.getByRole("button", { name: "Configure media" }).click();
    await expect(page.getByTestId("media-options")).toHaveText(
      "0.25/true/1.5/true"
    );
    await page.getByRole("button", { name: "Seek media" }).click();
    await expect
      .poll(async () =>
        Number(await page.getByTestId("smooth-time").textContent())
      )
      .toBeGreaterThanOrEqual(1);
    await page.getByRole("button", { name: "Stage media props" }).click();
    await expect(page.getByTestId("media-options")).toHaveText(
      "0.6/true/2/false"
    );
    await page.getByRole("button", { name: "Change media props" }).click();
    await expect(page.getByTestId("media-options")).toHaveText(
      "0.6/false/1/false"
    );
    await page.getByRole("button", { name: "Play media", exact: true }).click();
    await page.getByRole("button", { name: "Clear media source" }).click();
    await expect(page.getByTestId("player-status")).toHaveText("idle");
    await expect
      .poll(() =>
        page
          .locator("audio")
          .evaluate((audio: HTMLAudioElement) => audio.paused)
      )
      .toBe(true);
    await page.getByRole("button", { name: "Bad media source" }).click();
    await expect(page.getByTestId("player-status")).toHaveText("error");
    await expect(page.getByTestId("media-error-events")).toHaveText("1");
    await page.getByRole("button", { name: "Reset media source" }).click();
    await expect(page.getByTestId("player-status")).toHaveText("ready");
    await page.getByRole("button", { name: "Play media", exact: true }).click();
    await page.getByRole("button", { name: "Remove playback" }).click();
    await expect(page.getByTestId("disposed-media")).toHaveText("paused");
    await mkdir(`test-results/playback/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/playback/${runtime}/media-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });

  test("decoded sounds share cache with peaks, enforce polyphony and clean voices", async ({
    page,
  }, info) => {
    let requests = 0;
    await page.route("**/test-tone.wav", (route) => {
      requests++;

      return route.fulfill({ body: tone(), contentType: "audio/wav" });
    });
    await page.goto("/playback?decoded=1");
    await expect(page.getByTestId("sound-loaded")).toHaveText("true");
    await expect(page.getByTestId("wave-status")).toHaveText("ready");
    await expect(page.getByTestId("wave-peaks")).toHaveText("16/1/3");
    expect(requests).toBe(1);
    await page.getByRole("button", { name: "Play sound", exact: true }).click();
    await expect(page.getByTestId("sound-playing")).toHaveText("true");
    await expect
      .poll(async () =>
        Number(await page.getByTestId("sound-progress").textContent())
      )
      .toBeGreaterThan(0);
    await page
      .getByRole("button", { name: "Play sound", exact: true })
      .click({ clickCount: 4 });
    await expect(page.getByTestId("sound-voices")).toHaveText("2");
    await page.getByRole("button", { name: "Interrupt sound" }).click();
    await page.getByRole("button", { name: "Play sound", exact: true }).click();
    await expect(page.getByTestId("sound-voices")).toHaveText("1");
    await page.getByRole("button", { name: "Stop sound" }).click();
    await expect(page.getByTestId("sound-playing")).toHaveText("false");
    await expect(page.getByTestId("sound-voices")).toHaveText("0");
    await page.getByRole("button", { name: "Play sound", exact: true }).click();
    await page.getByRole("button", { name: "Remove playback" }).click();
    await expect(page.getByTestId("sound-voices")).toHaveText("0");
    await mkdir(`test-results/playback/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/playback/${runtime}/sound-${info.repeatEachIndex}.png`,
    });
  });

  test("decoding ignores obsolete loads and retries failed cache entries", async ({
    page,
  }) => {
    let release: (() => Promise<void>) | undefined;
    await page.route("**/test-tone.wav", (route) =>
      route.fulfill({ body: tone(), contentType: "audio/wav" })
    );
    await page.route("**/slow-tone.wav", (route) => {
      release = () => route.fulfill({ body: tone(), contentType: "audio/wav" });
    });
    let fail = true;
    await page.route("**/bad-tone.wav", (route) =>
      route.fulfill(
        fail
          ? { status: 404, body: "missing" }
          : { body: tone(), contentType: "audio/wav" }
      )
    );
    await page.goto("/playback?decoded=1");
    await expect(page.getByTestId("sound-loaded")).toHaveText("true");
    await page.getByRole("button", { name: "Slow sound source" }).click();
    await expect(page.getByTestId("wave-status")).toHaveText("loading");
    await expect.poll(() => Boolean(release)).toBe(true);
    await page.getByRole("button", { name: "Bad sound source" }).click();
    await expect(page.getByTestId("wave-status")).toHaveText("error");
    await release!();
    await expect(page.getByTestId("sound-error")).toContainText("404");
    await expect(page.getByTestId("wave-status")).toHaveText("error");
    fail = false;
    await page.getByRole("button", { name: "Clear sound source" }).click();
    await expect(page.getByTestId("wave-status")).toHaveText("idle");
    await page.getByRole("button", { name: "Bad sound source" }).click();
    await expect(page.getByTestId("wave-status")).toHaveText("ready");
    await expect(page.getByTestId("sound-loaded")).toHaveText("true");
  });
};
