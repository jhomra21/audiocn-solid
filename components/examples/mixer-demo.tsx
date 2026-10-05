import { For, Show } from "solid-js";

import {
  DesktopIcon,
  MicrophoneIcon,
  MusicNotesIcon,
  SpeakerHighIcon,
} from "@/components/icons/phosphor";
import {
  ChannelStrip,
  ChannelStripControls,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
  ChannelStripMeter,
  ChannelStripText,
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
  MixerMaster,
  MixerSeparator,
  MixerTitle,
} from "@/components/ui/mixer";
import { useMixer } from "@/hooks/use-mixer";
import type { Mixer as MixerController } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import { useDemoMixer } from "@/lib/docs/use-demo-mixer";
import type { JSXElement } from "@/lib/solid/jsx-types";

const channels = [
  { Icon: MicrophoneIcon, id: "mic", kind: "speech", title: "Microphone" },
  {
    Icon: DesktopIcon,
    id: "system",
    kind: "noise",
    channels: 2,
    title: "System audio",
  },
  {
    Icon: MusicNotesIcon,
    id: "music",
    kind: "music",
    channels: 2,
    title: "Music",
  },
] as const;

const Strip = (props: {
  id: string;
  title: string;
  icon: JSXElement;
  source: FrameSource<MeterFrame>;
  mixer: MixerController;
}) => {
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
            <ChannelStripIcon>{props.icon}</ChannelStripIcon>
            <ChannelStripText>
              <ChannelStripTitle>{props.title}</ChannelStripTitle>
            </ChannelStripText>
          </ChannelStripHeader>
          <ChannelStripMeter>
            <LevelMeter
              aria-label={`${props.title} level`}
              ballistics={
                props.mixer.isAudible(props.id) ? undefined : "instant"
              }
              size="sm"
              source={props.source}
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

const MixerDemo = () => {
  const mixer = useMixer({ channels: channels.map(({ id }) => ({ id })) });
  const demo = useDemoMixer(channels, () => mixer.state);
  const audible = () => channels.some(({ id }) => mixer.isAudible(id));

  return (
    <Mixer class="w-full max-w-2xl">
      <MixerHeader>
        <MixerTitle>Audio mixer</MixerTitle>
      </MixerHeader>
      <MixerChannels>
        <For each={channels}>
          {(channel) => (
            <Strip
              icon={<channel.Icon />}
              id={channel.id}
              mixer={mixer}
              source={demo.sources[channel.id]!}
              title={channel.title}
            />
          )}
        </For>
      </MixerChannels>
      <MixerSeparator />
      <MixerMaster>
        <ChannelStrip variant="master">
          <ChannelStripHeader>
            <ChannelStripIcon>
              <SpeakerHighIcon />
            </ChannelStripIcon>
            <ChannelStripTitle>Master</ChannelStripTitle>
          </ChannelStripHeader>
          <ChannelStripMeter>
            <LevelMeter
              aria-label="Master level"
              ballistics={audible() ? undefined : "instant"}
              channelCount={2}
              size="sm"
              source={demo.master}
            />
          </ChannelStripMeter>
          <ChannelStripFader>
            <Fader
              aria-label="Master volume"
              onValueChange={(value) => mixer.setMasterGain(value)}
              size="sm"
              value={mixer.master.gainDb}
            />
          </ChannelStripFader>
        </ChannelStrip>
      </MixerMaster>
    </Mixer>
  );
};

export default MixerDemo;
