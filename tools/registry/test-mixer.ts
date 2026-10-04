import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import {
  ChannelStrip,
  ChannelStripFader,
  ChannelStripTitle,
} from "@/components/ui/channel-strip";
import {
  Fader,
  FaderThumb,
  FaderTrack,
} from "@/components/ui/fader";
import {
  Mixer,
  MixerChannels,
  MixerEmpty,
  MixerHeader,
  MixerMaster,
  MixerSeparator,
  MixerTitle,
  useMixerContext,
} from "@/components/ui/mixer";
import { useAudioConfig } from "@/hooks/use-audio-config";

const ContextProbe = () => {
  const mixer = useMixerContext();
  const config = useAudioConfig();

  return (
    <output data-testid="mixer-context">
      {mixer.orientation}|{config.orientation}|{config.size}|{String(config.disabled)}|{config.minDb}|{config.maxDb}
    </output>
  );
};

const DisabledProbe = () => {
  const config = useAudioConfig();

  return (
    <output data-testid="disabled-context">
      {String(config.disabled)}
    </output>
  );
};

const Strip = (props: { name: string }) => (
  <ChannelStrip>
    <ChannelStripTitle>{props.name}</ChannelStripTitle>
    <ChannelStripFader>
      <Fader aria-label={props.name + " volume"}>
        <FaderTrack>
          <FaderThumb />
        </FaderTrack>
      </Fader>
    </ChannelStripFader>
  </ChannelStrip>
);

export default function App() {
  return (
    <main style="display: grid; gap: 40px; padding: 48px; min-height: 760px">
      <Mixer
        maxDb={3}
        minDb={-72}
        orientation="vertical"
        size="sm"
      >
        <MixerHeader>
          <MixerTitle>Console</MixerTitle>
        </MixerHeader>

        <MixerChannels>
          <Strip name="A" />
          <Strip name="B" />
        </MixerChannels>

        <MixerSeparator />

        <MixerMaster>
          <ChannelStrip variant="master">
            <ChannelStripTitle>Master</ChannelStripTitle>
          </ChannelStrip>
        </MixerMaster>

        <ContextProbe />
      </Mixer>

      <Mixer>
        <MixerTitle>Empty mixer</MixerTitle>
        <MixerChannels />
        <MixerEmpty>Nothing here</MixerEmpty>
      </Mixer>

      <Mixer disabled>
        <MixerTitle>Disabled mixer</MixerTitle>
        <DisabledProbe />
      </Mixer>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page) => {
    const mixer = page.getByRole("group", { name: "Console" });

    await expect(mixer).toHaveAttribute("data-orientation", "vertical");
    await expect(mixer).toHaveAttribute("data-size", "sm");
    await expect(page.getByTestId("mixer-context")).toHaveText(
      "vertical|vertical|sm|false|-72|3"
    );

    const sliders = mixer.locator('[data-slot="fader-thumb"]');
    const first = sliders.nth(0);
    const second = sliders.nth(1);

    await expect(sliders).toHaveCount(2);

    await first.focus();
    await first.press("Control+ArrowRight");
    await expect(second).toBeFocused();

    await second.press("Control+ArrowLeft");
    await expect(first).toBeFocused();

    await expect(
      mixer.locator('[data-slot="mixer-separator"]')
    ).toHaveClass(/h-full/);
    await expect(
      mixer.locator('[data-slot="mixer-master"]')
    ).toContainText("Master");

    const empty = page.getByRole("group", { name: "Empty mixer" });

    await expect(empty.locator('[data-slot="mixer-channels"]')).toBeHidden();
    await expect(empty.locator('[data-slot="mixer-empty"]')).toBeVisible();
    await expect(page.getByTestId("disabled-context")).toHaveText("true");

    return {
      focused: await page.evaluate(() => {
        const active = document.activeElement;

        return active instanceof HTMLElement
          ? (active.getAttribute("aria-label") ?? "")
          : "";
      }),
    };
  },
  name: "mixer",
  port: 5081,
  viewport: { height: 900, width: 1100 },
});
