import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  ChannelToggle,
  MonitorToggle,
  MuteToggle,
  SoloToggle,
} from "@/components/ui/channel-toggle";
import { AudioConfigProvider } from "@/hooks/use-audio-config";

export default function App() {
  const [muted, setMuted] = createSignal(false);
  const [eventType, setEventType] = createSignal("none");

  return (
    <main style="display: grid; gap: 20px; padding: 48px; width: 420px">
      <div style="display: flex; gap: 8px">
        <MuteToggle
          onPressedChange={(next, event) => {
            setMuted(next);
            setEventType(event.type);
          }}
          pressed={muted()}
        >
          M
        </MuteToggle>

        <SoloToggle defaultPressed>
          S
        </SoloToggle>

        <MonitorToggle>
          I
        </MonitorToggle>
      </div>

      <AudioConfigProvider value={{ disabled: true }}>
        <ChannelToggle aria-label="Inherited disabled">
          D
        </ChannelToggle>
      </AudioConfigProvider>

      <output data-testid="muted">{String(muted())}</output>
      <output data-testid="event-type">{eventType()}</output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page) => {
    const mute = page.getByRole("button", { name: "Mute" });
    const solo = page.getByRole("button", { name: "Solo" });
    const monitor = page.getByRole("button", { name: "Monitor" });
    const inherited = page.getByRole("button", { name: "Inherited disabled" });
    const muted = page.getByTestId("muted");

    await expect(mute).toHaveAttribute("aria-pressed", "false");

    await mute.click();
    await expect(mute).toHaveAttribute("aria-pressed", "true");
    await expect(mute).toHaveAttribute("data-pressed", "");
    await expect(muted).toHaveText("true");
    await expect(page.getByTestId("event-type")).toHaveText("click");

    await mute.click();
    await expect(mute).toHaveAttribute("aria-pressed", "false");
    await expect(mute).not.toHaveAttribute("data-pressed");

    await expect(solo).toHaveAttribute("aria-pressed", "true");
    await expect(solo).toHaveAttribute("data-tone", "solo");
    await expect(monitor).toHaveAttribute("data-tone", "monitor");
    await expect(inherited).toBeDisabled();

    return { muted: await muted.textContent() };
  },
  name: "channel-toggle",
  port: 5041,
  viewport: { height: 520, width: 760 },
});
