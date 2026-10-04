import { For, Show } from "solid-js";

import {
  ChannelStrip,
  ChannelStripControls,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripMeter,
  ChannelStripTitle,
  ChannelStripValue,
} from "@/components/ui/channel-strip";
import { MuteToggle, SoloToggle } from "@/components/ui/channel-toggle";
import { Fader } from "@/components/ui/fader";
import { LevelMeter } from "@/components/ui/level-meter";
import {
  Mixer,
  MixerChannels,
  MixerHeader,
  MixerTitle,
} from "@/components/ui/mixer";
import { useDemoSignal } from "@/hooks/use-demo-signal";
import type { DemoSignalKind } from "@/hooks/use-demo-signal";
import { useMixer } from "@/hooks/use-mixer";
import type { Mixer as MixerController } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";

const CHANNEL_COUNT = 16;

const KINDS: DemoSignalKind[] = ["speech", "music", "noise", "music"];

const CHANNELS = Array.from({ length: CHANNEL_COUNT }, (_, index) => ({
  id: `input-${index + 1}`,
  kind: KINDS[index % KINDS.length] ?? "music",
  seed: index + 1,
  title: `In ${index + 1}`,
}));

const INITIAL_CHANNELS = CHANNELS.map(({ id }) => ({ id }));

const ConsoleStrip = (props: {
  id: string;
  title: string;
  kind: DemoSignalKind;
  seed: number;
  mixer: MixerController;
}) => {
  const signal = useDemoSignal({ kind: props.kind, seed: props.seed });
  const channel = () => props.mixer.channel(props.id);

  return (
    <Show when={channel()}>
      {(current) => (
        <ChannelStrip
          dimmed={props.mixer.isDimmed(props.id)}
          muted={current().muted}
          solo={current().solo}
        >
          <ChannelStripHeader>
            <ChannelStripTitle>{props.title}</ChannelStripTitle>
          </ChannelStripHeader>
          <ChannelStripMeter>
            <LevelMeter
              aria-label={`${props.title} level`}
              size="sm"
              source={signal.meter}
            />
          </ChannelStripMeter>
          <ChannelStripFader>
            <Fader
              aria-label={`${props.title} volume`}
              onValueChange={(gainDb) => props.mixer.setGain(props.id, gainDb)}
              size="sm"
              value={current().gainDb}
            />
          </ChannelStripFader>
          <ChannelStripValue>{formatDb(current().gainDb)}</ChannelStripValue>
          <ChannelStripControls>
            <MuteToggle
              onPressedChange={(muted) => props.mixer.setMuted(props.id, muted)}
              pressed={current().muted}
              size="sm"
            >
              M
            </MuteToggle>
            <SoloToggle
              onPressedChange={(solo) => props.mixer.setSolo(props.id, solo)}
              pressed={current().solo}
              size="sm"
            >
              S
            </SoloToggle>
          </ChannelStripControls>
        </ChannelStrip>
      )}
    </Show>
  );
};

const MixerConsole = () => {
  const mixer = useMixer({ channels: INITIAL_CHANNELS });

  return (
    <Mixer class="w-full" orientation="vertical">
      <MixerHeader>
        <MixerTitle>Console</MixerTitle>
      </MixerHeader>
      <MixerChannels>
        <For each={CHANNELS}>
          {(channel) => (
            <ConsoleStrip
              id={channel.id}
              kind={channel.kind}
              mixer={mixer}
              seed={channel.seed}
              title={channel.title}
            />
          )}
        </For>
      </MixerChannels>
    </Mixer>
  );
};

export default MixerConsole;
