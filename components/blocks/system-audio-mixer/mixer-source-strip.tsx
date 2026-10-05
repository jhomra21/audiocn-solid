import { Show, children } from "solid-js";

import { HeadphonesIcon } from "@/components/icons/phosphor";
import {
  ChannelStrip,
  ChannelStripActions,
  ChannelStripControls,
  ChannelStripDescription,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
  ChannelStripMeter,
  ChannelStripStatus,
  ChannelStripText,
  ChannelStripTitle,
  ChannelStripValue,
} from "@/components/ui/channel-strip";
import type { ChannelStripStatusProps } from "@/components/ui/channel-strip";
import {
  MonitorToggle,
  MuteToggle,
  SoloToggle,
} from "@/components/ui/channel-toggle";
import {
  Fader,
  FaderRange,
  FaderThumb,
  FaderTrack,
} from "@/components/ui/fader";
import { LevelMeter } from "@/components/ui/level-meter";
import type { Mixer } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import type { JSXElement } from "@/lib/solid/jsx-types";

export interface MixerSourceStripProps {
  id: string;
  title: string;
  description?: JSXElement;
  icon: JSXElement;
  accent?: string;
  mixer: Mixer;
  meter: FrameSource<MeterFrame>;
  status?: { label: string; tone: ChannelStripStatusProps["tone"] };
  actions?: JSXElement;
  notice?: JSXElement;
  monitorable?: boolean;
  disabled?: boolean;
}

export const MixerSourceStrip = (props: MixerSourceStripProps) => {
  const description = children(() => props.description);
  const actions = children(() => props.actions);

  return (
    <Show when={props.mixer.channel(props.id)}>
      {(channel) => (
        <ChannelStrip
          accent={props.accent}
          dimmed={props.mixer.isDimmed(props.id)}
          disabled={props.disabled ?? false}
          muted={channel().muted}
          solo={channel().solo}
        >
          <ChannelStripHeader>
            <ChannelStripIcon>{props.icon}</ChannelStripIcon>
            <ChannelStripText>
              <ChannelStripTitle>{props.title}</ChannelStripTitle>
              <Show when={description()}>
                <ChannelStripDescription>
                  {description()}
                </ChannelStripDescription>
              </Show>
            </ChannelStripText>
            <Show when={props.status}>
              {(status) => (
                <ChannelStripStatus tone={status().tone}>
                  {status().label}
                </ChannelStripStatus>
              )}
            </Show>
            <Show when={actions()}>
              <ChannelStripActions>{actions()}</ChannelStripActions>
            </Show>
          </ChannelStripHeader>
          <ChannelStripMeter>
            <LevelMeter
              aria-label={`${props.title} level`}
              channelCount={2}
              class="h-full"
              size="sm"
              source={props.meter}
            />
          </ChannelStripMeter>
          <ChannelStripFader>
            <Fader
              aria-label={`${props.title} volume`}
              max={12}
              min={-60}
              onValueChange={(gainDb) => props.mixer.setGain(props.id, gainDb)}
              silenceAtMin
              size="sm"
              taper="audio"
              value={channel().gainDb}
            >
              <FaderTrack>
                <FaderRange />
                <FaderThumb />
              </FaderTrack>
            </Fader>
          </ChannelStripFader>
          <ChannelStripValue>
            {formatDb(channel().gainDb, { floorDb: -60 })}
          </ChannelStripValue>
          <ChannelStripControls>
            <MuteToggle
              aria-label={`Mute ${props.title}`}
              onPressedChange={(muted) => props.mixer.setMuted(props.id, muted)}
              pressed={channel().muted}
              size="sm"
            >
              M
            </MuteToggle>
            <SoloToggle
              aria-label={`Solo ${props.title}`}
              onPressedChange={(solo) => props.mixer.setSolo(props.id, solo)}
              pressed={channel().solo}
              size="sm"
            >
              S
            </SoloToggle>
            <Show when={props.monitorable !== false}>
              <MonitorToggle
                aria-label={`Monitor ${props.title}`}
                onPressedChange={(monitor) =>
                  props.mixer.setMonitor(props.id, monitor)
                }
                pressed={channel().monitor}
                size="sm"
              >
                <HeadphonesIcon />
              </MonitorToggle>
            </Show>
          </ChannelStripControls>
          {props.notice}
        </ChannelStrip>
      )}
    </Show>
  );
};
