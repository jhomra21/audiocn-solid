import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
  VolumeControlValue,
} from "@/components/ui/volume-control";

export default function App() {
  const [volume, setVolume] = createSignal(0.25);
  const [muted, setMuted] = createSignal(false);
  const [committed, setCommitted] = createSignal("none");
  const [restored, setRestored] = createSignal("none");

  return (
    <main style="display: grid; gap: 36px; padding: 48px; width: 560px">
      <VolumeControl
        muted={muted()}
        onMutedChange={setMuted}
        onValueChange={setVolume}
        onValueCommitted={(next) => setCommitted(String(next))}
        value={volume()}
      >
        <VolumeControlMute />
        <VolumeControlSlider />
        <VolumeControlValue />
      </VolumeControl>

      <VolumeControl
        defaultValue={0}
        onValueChange={(next) => setRestored(String(next))}
      />

      <VolumeControl
        defaultValue={0.25}
        orientation="vertical"
      >
        <VolumeControlMute />
        <VolumeControlSlider />
        <VolumeControlValue />
      </VolumeControl>

      <output data-testid="volume">{String(volume())}</output>
      <output data-testid="muted">{String(muted())}</output>
      <output data-testid="committed">{committed()}</output>
      <output data-testid="restored">{restored()}</output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page, runtime) => {
    const groups = page.getByRole("group", { name: "Volume" });
    const main = groups.nth(0);
    const zero = groups.nth(1);
    const vertical = groups.nth(2);
    const slider = main.getByRole("slider", { name: "Volume" });
    const mute = main.getByRole("button", { name: "Mute" });
    const value = main.locator('[data-slot="volume-control-value"]');
    const volume = page.getByTestId("volume");
    const muted = page.getByTestId("muted");
    const committed = page.getByTestId("committed");

    await expect(slider).toHaveAttribute("aria-valuetext", "25%");
    await expect(value).toHaveText("50%");
    await expect(main).toHaveAttribute("data-level", "low");

    await slider.focus();
    await slider.press("ArrowRight");
    await expect(volume).toHaveText("0.3025");
    await expect(committed).toHaveText("0.3025");

    await mute.click();
    await expect(muted).toHaveText("true");
    await expect(slider).toHaveAttribute("aria-valuetext", "Muted");
    await expect(value).toHaveText("0%");
    await expect(main).toHaveAttribute("data-level", "muted");

    await main.getByRole("button", { name: "Unmute" }).click();
    await expect(muted).toHaveText("false");

    await slider.press("Home");
    await expect(volume).toHaveText("0");

    await slider.press("End");
    await expect(volume).toHaveText("1");

    await slider.press("Home");

    const trackBox = await main
      .locator('[data-slot="volume-control-slider"]')
      .boundingBox();

    const thumbBox = await slider.boundingBox();

    if (!trackBox || !thumbBox) {
      throw new Error(`Missing volume bounds for ${runtime}.`);
    }

    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      trackBox.x + trackBox.width * 0.5,
      thumbBox.y + thumbBox.height / 2
    );
    await page.mouse.up();

    await expect(volume).toHaveText("0.25");
    await expect(committed).toHaveText("0.25");

    await zero.getByRole("button", { name: "Mute" }).click();
    await zero.getByRole("button", { name: "Unmute" }).click();
    await expect(page.getByTestId("restored")).toHaveText("1");

    await expect(vertical).toHaveAttribute("data-orientation", "vertical");
    await expect(
      vertical.getByRole("slider", { name: "Volume" })
    ).toHaveAttribute("aria-valuetext", "25%");

    return {
      committed: await committed.textContent(),
      finalVolume: await volume.textContent(),
    };
  },
  name: "volume-control",
  port: 5051,
  viewport: { height: 760, width: 900 },
});
