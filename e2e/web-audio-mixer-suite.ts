import { mkdir } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runWebAudioMixerSuite = (runtime: string) => {
  test("Web Audio mixer drives real post-fader meters, pan, solo, ducking and stable relays", async ({
    page,
  }, info) => {
    const failures: string[] = [];
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto("/web-audio-mixer");
    await page.getByRole("button", { name: "Resume mix" }).click();
    await expect(page.getByTestId("mix-output")).toHaveText("live");

    const peak = async (id: string) =>
      Number(await page.getByTestId(id).textContent());

    await expect.poll(() => peak("music-peak")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Mute music", exact: true }).click();
    await expect.poll(() => peak("music-peak")).toBeLessThan(-70);
    await page.getByRole("button", { name: "Unmute music" }).click();
    await expect.poll(() => peak("music-peak")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Pan music left" }).click();
    await expect.poll(() => peak("music-right")).toBeLessThan(-70);
    await expect.poll(() => peak("music-left")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Solo microphone" }).click();
    await expect.poll(() => peak("music-peak")).toBeLessThan(-70);
    await page.getByRole("button", { name: "Clear solo" }).click();
    await expect.poll(() => peak("music-peak")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Speak" }).click();
    await expect.poll(() => peak("music-peak")).toBeLessThan(-25);
    await page.getByRole("button", { name: "Remove microphone" }).click();
    await expect.poll(() => peak("music-peak")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Disable mix" }).click();
    await expect(page.getByTestId("mix-output")).toHaveText("none");
    await expect(page.getByTestId("input-connections")).toHaveText("0");
    await page.getByRole("button", { name: "Enable mix" }).click();
    await expect(page.getByTestId("mix-output")).toHaveText("live");
    await expect(page.getByTestId("relay-stable")).toHaveText("true");
    await expect.poll(() => peak("music-peak")).toBeGreaterThan(-20);
    await page.getByRole("button", { name: "Remove mix" }).click();
    await expect(page.getByTestId("input-connections")).toHaveText("0");
    await mkdir(`test-results/web-audio-mixer/${runtime}`, { recursive: true });
    await page.screenshot({
      path: `test-results/web-audio-mixer/${runtime}/graph-${info.repeatEachIndex}.png`,
    });
    expect(failures).toEqual([]);
  });
};
