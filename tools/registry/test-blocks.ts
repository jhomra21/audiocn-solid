import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

await runAcceptance({
  name: "blocks",
  port: 5140,
  viewport: { width: 1200, height: 900 },
  appSource: `import { MusicPlayer } from "@/components/blocks/music-player/music-player";
import { Soundboard } from "@/components/blocks/soundboard/soundboard";
import { MicSetup } from "@/components/blocks/mic-setup/mic-setup";
import { SystemAudioSettings } from "@/components/blocks/system-audio-settings/system-audio-settings";
import { QuickAudioPopover } from "@/components/blocks/quick-audio-popover/quick-audio-popover";
import { SystemAudioMixer } from "@/components/blocks/system-audio-mixer/system-audio-mixer";
export default function App() {
  const buffer = new AudioBuffer({ numberOfChannels: 1, length: 48000, sampleRate: 48000 });
  return <main>
    <section data-testid="mixer"><SystemAudioMixer /></section>
    <section data-testid="board"><Soundboard defaultSounds={[{ id: "tone", label: "Tone", src: buffer, hotkey: "1" }]} /></section>
    <MusicPlayer />
    <MicSetup />
    <SystemAudioSettings />
    <QuickAudioPopover />
  </main>;
}
`,
  check: async (page) => {
    const mixer = page.getByTestId("mixer");
    await mixer.getByRole("tab", { name: "Console", exact: true }).click();
    await expect(mixer.locator('[data-slot="mixer"]')).toHaveAttribute(
      "data-orientation",
      "vertical"
    );
    await mixer
      .getByRole("button", { name: "Mute Music", exact: true })
      .click();
    await expect(
      mixer.getByRole("button", { name: "Mute Music", exact: true })
    ).toHaveAttribute("aria-pressed", "true");
    const board = page.getByTestId("board");
    const pad = board.getByRole("button", { name: /Tone/ });
    await pad.click({ button: "right" });
    await page.getByRole("menuitem", { name: "Remove", exact: true }).click();
    await expect(pad).toHaveCount(0);
    await board
      .getByRole("button", { name: "Undo removal", exact: true })
      .click();
    await expect(pad).toBeVisible();
    await pad.click();
    await expect(pad).toHaveAttribute("data-playing", "");
    await board.getByRole("button", { name: "Stop all", exact: true }).click();
    await expect(pad).not.toHaveAttribute("data-playing");
    await page
      .getByRole("button", { name: "Audio settings", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toContainText(
      "Microphone and system audio"
    );
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Turn on microphone", exact: true })
    ).toBeVisible();

    return {
      controls: [
        "console-layout",
        "channel-mute",
        "context-menu",
        "remove-undo",
        "pad-play-stop",
        "popover-focus",
      ],
    };
  },
});
