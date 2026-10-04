import { createSignal } from "solid-js";

import {
  DesktopIcon,
  MicrophoneIcon,
  MusicNotesIcon,
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
import { useDemoSignal } from "@/hooks/use-demo-signal";
import { formatDb } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import type { JSXElement } from "@/lib/solid/jsx-types";

const Strip = (props: {
  title: string;
  icon: JSXElement;
  accent: string;
  source: FrameSource<MeterFrame>;
}) => {
  const [gainDb, setGainDb] = createSignal(0);
  const [muted, setMuted] = createSignal(false);

  return (
    <ChannelStrip
      accent={props.accent}
      muted={muted()}
      orientation="vertical"
      variant="card"
    >
      <ChannelStripHeader>
        <ChannelStripIcon>{props.icon}</ChannelStripIcon>
        <ChannelStripTitle>{props.title}</ChannelStripTitle>
      </ChannelStripHeader>
      <ChannelStripMeter>
        <LevelMeter
          aria-label={`${props.title} level`}
          channelCount={2}
          class="h-full"
          size="sm"
          source={props.source}
        />
      </ChannelStripMeter>
      <ChannelStripFader>
        <Fader
          aria-label={`${props.title} volume`}
          onValueChange={setGainDb}
          size="sm"
          taper="audio"
          value={gainDb()}
        />
      </ChannelStripFader>
      <ChannelStripValue>{formatDb(gainDb())}</ChannelStripValue>
      <ChannelStripControls>
        <MuteToggle onPressedChange={setMuted} pressed={muted()} size="sm">
          M
        </MuteToggle>
        <SoloToggle size="sm">S</SoloToggle>
      </ChannelStripControls>
    </ChannelStrip>
  );
};

const ChannelStripConsole = () => {
  const voice = useDemoSignal({ channels: 2, kind: "speech" });
  const music = useDemoSignal({ channels: 2, kind: "music" });
  const game = useDemoSignal({ channels: 2, kind: "noise", seed: 3 });

  return (
    <div class="flex h-96 max-w-full gap-3 overflow-x-auto">
      <Strip
        accent="var(--chart-2)"
        icon={<MicrophoneIcon />}
        source={voice.meter}
        title="Mic"
      />
      <Strip
        accent="var(--chart-1)"
        icon={<MusicNotesIcon />}
        source={music.meter}
        title="Music"
      />
      <Strip
        accent="var(--chart-4)"
        icon={<DesktopIcon />}
        source={game.meter}
        title="Game"
      />
    </div>
  );
};

export default ChannelStripConsole;
