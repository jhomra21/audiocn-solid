import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

declare global {
  interface Window {
    interruptionProbe: {
      contexts: AudioContext[];
      calls: { state: string; active: boolean }[];
    };
  }
}

/**
 * Safari exposes "interrupted" after backgrounding. Keep a real, suspended
 * native context underneath that state, and record when native resume is called.
 * This verifies recovery, not the host's speakers or iPhone interruption policy.
 */
export const installInterruptionProbe = (page: Page) =>
  page.addInitScript(() => {
    const NativeContext = window.AudioContext;
    const contexts: AudioContext[] = [];
    const calls: { state: string; active: boolean }[] = [];
    Object.assign(window, { interruptionProbe: { contexts, calls } });
    window.AudioContext = class extends NativeContext {
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push(this);
        const resume = this.resume.bind(this);
        this.resume = () => {
          calls.push({
            state: this.state,
            active: navigator.userActivation.isActive,
          });
          Reflect.deleteProperty(this, "state");

          return resume();
        };
      }
    };
  });

export const interruptContext = (page: Page) =>
  page.evaluate(async () => {
    const probe = window.interruptionProbe;
    const context = probe.contexts[0]!;
    await context.suspend();
    Object.defineProperty(context, "state", {
      configurable: true,
      value: "interrupted",
    });
    probe.calls.length = 0;
    context.dispatchEvent(new Event("statechange"));
  });

export const resumeCalls = (page: Page) =>
  page.evaluate(() => window.interruptionProbe.calls);

export const runAudioHooksSuite = (runtime: string) => {
  for (const explicit of [false, true]) {
    test(`resumes Safari interrupted contexts ${explicit ? "from the public resume control" : "on the next gesture"}`, async ({
      page,
    }, info) => {
      await installInterruptionProbe(page);
      await page.goto("/audio-hooks");
      await expect(page.getByTestId("context-status")).toBeVisible();
      await page.getByRole("heading").click();
      await expect(page.getByTestId("context-status")).toHaveText("running");
      await interruptContext(page);
      await expect(page.getByTestId("context-status")).toHaveText(
        "interrupted"
      );

      if (explicit)
        await page.evaluate(() =>
          window.addEventListener(
            "pointerdown",
            (event) => event.stopPropagation(),
            { capture: true, once: true }
          )
        );

      await page
        .getByRole("button", {
          name: explicit ? "Resume context" : "Emit frame",
          exact: true,
        })
        .click();
      await expect(page.getByTestId("context-status")).toHaveText("running");
      const calls = await resumeCalls(page);
      expect(calls[0]).toEqual({ state: "interrupted", active: true });
      expect(calls.every((call) => call.active)).toBe(true);
      await info.attach("native-resume-calls", {
        body: JSON.stringify(calls),
        contentType: "application/json",
      });

      await page.getByRole("button", { name: "Remove hooks" }).click();
      await interruptContext(page);
      await page.getByRole("heading").click();
      expect(await resumeCalls(page)).toEqual([]);
    });
  }

  test("samples levels reactively and releases subscriptions", async ({
    page,
  }, info) => {
    await page.goto("/audio-hooks");
    await expect(page.getByTestId("subscriptions")).toHaveText("1");
    await page.getByRole("button", { name: "Emit frame" }).click();
    await expect(page.getByTestId("level")).toHaveText("-3/-12/clip");
    await page.getByRole("button", { name: "Second channel" }).click();
    await expect(page.getByTestId("level")).toHaveText("-30/-36/ok");
    await page.getByRole("button", { name: "Disable sampling" }).click();
    await expect(page.getByTestId("subscriptions")).toHaveText("0");
    await page.getByRole("button", { name: "Emit clipping" }).click();
    await expect(page.getByTestId("level")).toHaveText("-30/-36/ok");
    await page.getByRole("button", { name: "Enable sampling" }).click();
    await expect(page.getByTestId("subscriptions")).toHaveText("1");
    await page.getByRole("button", { name: "Emit clipping" }).click();
    await expect(page.getByTestId("level")).toHaveText("0/-2/clip");
    await mkdir(`test-results/audio-hooks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/audio-hooks/${runtime}/level-${info.repeatEachIndex}.png`,
    });
  });

  test("routes gain without replacing the node and disconnects only owned edges", async ({
    page,
  }) => {
    await page.goto("/audio-hooks");
    await page.getByRole("button", { name: "Resume audio" }).click();
    await expect(page.getByTestId("gain")).toHaveText("0");
    await page.getByRole("button", { name: "Set gain" }).click();
    await expect(page.getByTestId("gain")).toHaveText("0.5");
    await page.getByRole("button", { name: "Remove hooks" }).click();
    await expect(page.getByTestId("remaining-connections")).toHaveText("0");
    await expect(page.getByTestId("created-gains")).toHaveText("1");
  });

  test("refreshes device labels, rejects stale refreshes, and handles permission changes", async ({
    page,
  }) => {
    await page.goto("/audio-hooks");
    await expect(page.getByTestId("devices")).toHaveText("Microphone 1");
    await page.getByRole("button", { name: "Request permission" }).click();
    await expect(page.getByTestId("devices")).toHaveText("Studio microphone");
    await expect(page.getByTestId("permission")).toHaveText("granted");
    await expect(page.getByTestId("stopped-tracks")).toHaveText("1");
    await page.getByRole("button", { name: "Reverse refresh results" }).click();
    await expect(page.getByTestId("devices")).toHaveText("Newest microphone");
  });

  test("cancels capture pickers, stops video, and clears audio when capture ends", async ({
    page,
  }, info) => {
    await page.goto("/audio-hooks");
    await page.getByRole("button", { name: "Start capture" }).click();
    await expect(page.getByTestId("capture-status")).toHaveText("prompting");
    await page.getByRole("button", { name: "Stop capture" }).click();
    await page.getByRole("button", { name: "Resolve picker" }).click();
    await expect(page.getByTestId("capture-status")).toHaveText("idle");
    await expect(page.getByTestId("stopped-tracks")).toHaveText("2");
    await page.getByRole("button", { name: "Start capture" }).click();
    await page.getByRole("button", { name: "Resolve picker" }).click();
    await expect(page.getByTestId("capture-status")).toHaveText("active");
    await expect(page.getByTestId("stopped-tracks")).toHaveText("3");
    await page.getByRole("button", { name: "End capture" }).click();
    await expect(page.getByTestId("capture-status")).toHaveText("ended");
    await expect(page.getByTestId("capture-stream")).toHaveText("none");
    await mkdir(`test-results/audio-hooks/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/audio-hooks/${runtime}/capture-${info.repeatEachIndex}.png`,
    });
  });
};
