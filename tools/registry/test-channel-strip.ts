import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  ChannelStrip,
  ChannelStripActions,
  ChannelStripControls,
  ChannelStripDescription,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
  ChannelStripMeter,
  ChannelStripNotice,
  ChannelStripStatus,
  ChannelStripText,
  ChannelStripTitle,
  ChannelStripValue,
  useChannelStrip,
} from "@/components/ui/channel-strip";
import { useAudioConfig } from "@/hooks/use-audio-config";

const StateProbe = () => {
  const strip = useChannelStrip();

  return (
    <output data-testid="strip-state">
      {strip.orientation}|{String(strip.muted)}|{String(strip.solo)}|{String(strip.dimmed)}
    </output>
  );
};

const ConfigProbe = () => {
  const config = useAudioConfig();

  return (
    <output data-testid="config-state">
      {config.orientation}|{String(config.dimmed)}|{String(config.disabled)}|{config.size}
    </output>
  );
};

export default function App() {
  const [clipping, setClipping] = createSignal(false);

  return (
    <main style="display: grid; gap: 32px; padding: 48px; width: 760px">
      <button onClick={() => setClipping((value) => !value)}>
        Toggle clipping
      </button>

      <ChannelStrip
        accent="oklch(0.7 0.2 160)"
        disabled
        muted
        orientation="vertical"
        selected
        size="lg"
        solo
        variant="card"
      >
        <ChannelStripHeader>
          <ChannelStripIcon>*</ChannelStripIcon>
          <ChannelStripText>
            <ChannelStripTitle>Mic</ChannelStripTitle>
            <ChannelStripDescription>Input 1</ChannelStripDescription>
          </ChannelStripText>
          <ChannelStripStatus tone="live">Live</ChannelStripStatus>
          <ChannelStripActions>Actions</ChannelStripActions>
        </ChannelStripHeader>

        <ChannelStripMeter>
          <div
            aria-label="Fake meter"
            data-clipping={clipping() ? "" : undefined}
            data-slot="level-meter"
          />
        </ChannelStripMeter>

        <ChannelStripFader>Fader</ChannelStripFader>
        <ChannelStripValue>−6.0 dB</ChannelStripValue>
        <ChannelStripControls>Controls</ChannelStripControls>
        <ChannelStripNotice variant="warning">Peak warning</ChannelStripNotice>

        <StateProbe />
        <ConfigProbe />
      </ChannelStrip>

      <ChannelStrip>
        <ChannelStripTitle>Aux</ChannelStripTitle>
      </ChannelStrip>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page) => {
    const mic = page.getByRole("group", { name: "Mic" });

    const toggleClipping = page.getByRole("button", {
      name: "Toggle clipping",
    });

    await expect(mic).toHaveAttribute("data-orientation", "vertical");
    await expect(mic).toHaveAttribute("data-muted", "");
    await expect(mic).toHaveAttribute("data-solo", "");
    await expect(mic).toHaveAttribute("data-selected", "");
    await expect(mic).toHaveAttribute("data-disabled", "");
    await expect(mic).toHaveAttribute("data-size", "lg");
    await expect(mic).toHaveAttribute("data-variant", "card");
    await expect(mic).toHaveAttribute("style", /--channel-accent/);

    await expect(page.getByTestId("strip-state")).toHaveText(
      "vertical|true|true|false"
    );
    await expect(page.getByTestId("config-state")).toHaveText(
      "vertical|true|true|lg"
    );

    await expect(
      mic.locator('[data-slot="channel-strip-status"]')
    ).toHaveAttribute("data-tone", "live");
    await expect(mic.locator('[data-slot="channel-strip-notice"]')).toHaveText(
      "Peak warning"
    );

    await expect(mic).not.toHaveAttribute("data-clipping");
    await toggleClipping.click();
    await expect(mic).toHaveAttribute("data-clipping", "");
    await toggleClipping.click();
    await expect(mic).not.toHaveAttribute("data-clipping");

    await expect(
      mic.locator('[data-slot="channel-strip-layout"]')
    ).toContainText("Fader");
    await expect(page.getByRole("group", { name: "Aux" })).toHaveClass(
      /@container\/channel-strip/
    );

    return {};
  },
  name: "channel-strip",
  port: 5071,
  viewport: { height: 900, width: 1000 },
});
