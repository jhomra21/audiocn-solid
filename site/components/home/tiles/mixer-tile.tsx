import { Show } from "solid-js";

import {
  DesktopIcon,
  MicrophoneIcon,
  MusicNotesIcon,
  SpeakerHighIcon,
  WaveformIcon,
} from "@/components/icons/phosphor";
import {
  ChannelStrip,
  ChannelStripControls,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
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
  MixerMaster,
  MixerSeparator,
} from "@/components/ui/mixer";
import { useDemoSignal } from "@/hooks/use-demo-signal";
import type { DemoSignalKind } from "@/hooks/use-demo-signal";
import { useMixer } from "@/hooks/use-mixer";
import type { Mixer as MixerController } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";

interface Channel {
  id: string;
  /** The full name, for labels read aloud. */
  name: string;
  /** The short name on the strip. */
  title: string;
  Icon: typeof MicrophoneIcon;
  kind: DemoSignalKind;
  channels: number;
  gainDb: number;
  seed?: number;
}

const CHANNELS: Channel[] = [
  {
    Icon: MicrophoneIcon,
    channels: 1,
    gainDb: 0,
    id: "mic",
    kind: "speech",
    name: "Microphone",
    title: "Mic",
  },
  {
    Icon: DesktopIcon,
    channels: 2,
    gainDb: -8,
    id: "system",
    kind: "noise",
    name: "System audio",
    title: "System",
  },
  {
    Icon: MusicNotesIcon,
    channels: 2,
    gainDb: -14,
    id: "music",
    kind: "music",
    name: "Music",
    title: "Music",
  },
  {
    Icon: WaveformIcon,
    channels: 1,
    gainDb: -4,
    id: "sounds",
    kind: "speech",
    name: "Sounds",
    seed: 11,
    title: "Sounds",
  },
];

const INITIAL_CHANNELS = CHANNELS.map(({ id, gainDb }) => ({ gainDb, id }));

const Strip = (props: { channel: Channel; mixer: MixerController }) => {
  const signal = useDemoSignal({
    channels: props.channel.channels,
    kind: props.channel.kind,
    seed: props.channel.seed,
  });

  const state = () => props.mixer.channel(props.channel.id);

  return (
    <Show when={state()}>
      {(current) => (
        <ChannelStrip
          dimmed={props.mixer.isDimmed(props.channel.id)}
          muted={current().muted}
          solo={current().solo}
        >
          <ChannelStripHeader>
            <ChannelStripIcon>
              <props.channel.Icon />
            </ChannelStripIcon>
            <ChannelStripTitle>{props.channel.title}</ChannelStripTitle>
          </ChannelStripHeader>
          <ChannelStripMeter>
            <LevelMeter
              aria-label={`${props.channel.name} level`}
              channelCount={props.channel.channels}
              size="sm"
              source={signal.meter}
            />
          </ChannelStripMeter>
          <ChannelStripFader>
            <Fader
              aria-label={`${props.channel.name} volume`}
              onValueChange={(gainDb) =>
                props.mixer.setGain(props.channel.id, gainDb)
              }
              size="sm"
              value={current().gainDb}
            />
          </ChannelStripFader>
          <ChannelStripValue>{formatDb(current().gainDb)}</ChannelStripValue>
          <ChannelStripControls>
            <MuteToggle
              aria-label={`Mute ${props.channel.name}`}
              onPressedChange={(muted) =>
                props.mixer.setMuted(props.channel.id, muted)
              }
              pressed={current().muted}
              size="sm"
            >
              M
            </MuteToggle>
            <SoloToggle
              aria-label={`Solo ${props.channel.name}`}
              onPressedChange={(solo) =>
                props.mixer.setSolo(props.channel.id, solo)
              }
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

const MixerTile = () => {
  const mixer = useMixer({ channels: INITIAL_CHANNELS });
  const program = useDemoSignal({ channels: 2, kind: "music", seed: 9 });

  return (
    // The card label titles the tile, so the mixer is named here instead of
    // pointing at a MixerTitle it does not render.
    <Mixer
      aria-label="Mixer"
      aria-labelledby={undefined}
      class="w-full"
      orientation="vertical"
    >
      <MixerChannels>
        {CHANNELS.map((channel) => (
          <Strip channel={channel} mixer={mixer} />
        ))}
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
              channelCount={2}
              size="sm"
              source={program.meter}
            />
          </ChannelStripMeter>
          <ChannelStripFader>
            <Fader
              aria-label="Master volume"
              onValueChange={(gainDb) => mixer.setMasterGain(gainDb)}
              size="sm"
              value={mixer.master.gainDb}
            />
          </ChannelStripFader>
          <ChannelStripValue>{formatDb(mixer.master.gainDb)}</ChannelStripValue>
        </ChannelStrip>
      </MixerMaster>
    </Mixer>
  );
};

export default MixerTile;
