import { For } from "solid-js";

import { SpeakerHighIcon } from "@/components/icons/phosphor";
import {
  ChannelStrip,
  ChannelStripControls,
  ChannelStripDescription,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
  ChannelStripMeter,
  ChannelStripText,
  ChannelStripTitle,
  ChannelStripValue,
} from "@/components/ui/channel-strip";
import { MuteToggle } from "@/components/ui/channel-toggle";
import {
  Fader,
  FaderRange,
  FaderThumb,
  FaderTrack,
} from "@/components/ui/fader";
import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterClip,
  LevelMeterHold,
  LevelMeterTrack,
} from "@/components/ui/level-meter";
import type { Mixer } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";

const CHANNELS = [0, 1];

export interface MixerMasterStripProps {
  mixer: Mixer;
  meter: FrameSource<MeterFrame>;
}

export const MixerMasterStrip = (props: MixerMasterStripProps) => (
  <ChannelStrip muted={props.mixer.master.muted} variant="master">
    <ChannelStripHeader>
      <ChannelStripIcon>
        <SpeakerHighIcon />
      </ChannelStripIcon>
      <ChannelStripText>
        <ChannelStripTitle>Master</ChannelStripTitle>
        <ChannelStripDescription>Mix output</ChannelStripDescription>
      </ChannelStripText>
    </ChannelStripHeader>
    <ChannelStripMeter>
      <LevelMeter aria-label="Master level" class="h-full" source={props.meter}>
        <LevelMeterChannels>
          <For each={CHANNELS}>
            {(index) => (
              <LevelMeterChannel index={index}>
                <LevelMeterTrack>
                  <LevelMeterBar />
                  <LevelMeterHold />
                </LevelMeterTrack>
              </LevelMeterChannel>
            )}
          </For>
        </LevelMeterChannels>
        <LevelMeterClip showCount />
      </LevelMeter>
    </ChannelStripMeter>
    <ChannelStripFader>
      <Fader
        aria-label="Master volume"
        max={6}
        min={-60}
        onValueChange={(value) => props.mixer.setMasterGain(value)}
        silenceAtMin
        size="sm"
        taper="audio"
        value={props.mixer.master.gainDb}
      >
        <FaderTrack>
          <FaderRange />
          <FaderThumb />
        </FaderTrack>
      </Fader>
    </ChannelStripFader>
    <ChannelStripValue>
      {formatDb(props.mixer.master.gainDb, { floorDb: -60 })}
    </ChannelStripValue>
    <ChannelStripControls>
      <MuteToggle
        aria-label="Mute master"
        onPressedChange={(value) => props.mixer.setMasterMuted(value)}
        pressed={props.mixer.master.muted}
        size="sm"
      >
        M
      </MuteToggle>
    </ChannelStripControls>
  </ChannelStrip>
);
