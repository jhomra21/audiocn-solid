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
import type { DemoSignalKind } from "@/hooks/use-demo-signal";
import { useMixer } from "@/hooks/use-mixer";
import type { Mixer } from "@/hooks/use-mixer";
import { formatDb } from "@/lib/audio/decibels";
import type { JSXElement } from "@/lib/solid/jsx-types";

const Strip = (props: {
  title: string;
  id: string;
  mixer: Mixer;
  icon: JSXElement;
  accent: string;
  kind: DemoSignalKind;
  seed?: number;
}) => {
  const channel = () => props.mixer.channel(props.id)!;

  const signal = useDemoSignal({
    channels: 2,
    kind: props.kind,
    seed: props.seed,
    get gainDb() {
      return channel().gainDb;
    },
    get playing() {
      return props.mixer.isAudible(props.id);
    },
  });

  return (
    <ChannelStrip
      accent={props.accent}
      muted={channel().muted}
      solo={channel().solo}
      dimmed={props.mixer.isDimmed(props.id)}
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
          ballistics={props.mixer.isAudible(props.id) ? undefined : "instant"}
          channelCount={2}
          class="h-full"
          size="sm"
          source={signal.meter}
        />
      </ChannelStripMeter>
      <ChannelStripFader>
        <Fader
          aria-label={`${props.title} volume`}
          onValueChange={(gainDb) => props.mixer.setGain(props.id, gainDb)}
          size="sm"
          taper="audio"
          value={channel().gainDb}
        />
      </ChannelStripFader>
      <ChannelStripValue>{formatDb(channel().gainDb)}</ChannelStripValue>
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
      </ChannelStripControls>
    </ChannelStrip>
  );
};

const ChannelStripConsole = () => {
  const mixer = useMixer({
    channels: [{ id: "mic" }, { id: "music" }, { id: "game" }],
  });

  return (
    <div class="flex h-96 max-w-full gap-3 overflow-x-auto">
      <Strip
        accent="var(--chart-2)"
        icon={<MicrophoneIcon />}
        id="mic"
        mixer={mixer}
        kind="speech"
        title="Mic"
      />
      <Strip
        accent="var(--chart-1)"
        icon={<MusicNotesIcon />}
        id="music"
        mixer={mixer}
        kind="music"
        title="Music"
      />
      <Strip
        accent="var(--chart-4)"
        icon={<DesktopIcon />}
        id="game"
        mixer={mixer}
        kind="noise"
        seed={3}
        title="Game"
      />
    </div>
  );
};

export default ChannelStripConsole;
