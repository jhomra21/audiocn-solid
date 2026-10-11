import { For, Show, createSignal, onCleanup } from "solid-js";

import { MixerMasterStrip } from "@/components/blocks/system-audio-mixer/mixer-master-strip";
import { MixerSourceStrip } from "@/components/blocks/system-audio-mixer/mixer-source-strip";
import {
  ArrowCounterClockwiseIcon,
  DesktopIcon,
  GearSixIcon,
  MicrophoneIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  SkipForwardIcon,
  SquaresFourIcon,
  WaveformIcon,
} from "@/components/icons/phosphor";
import { AudioDeviceSelect } from "@/components/ui/audio-device-select";
import { Button } from "@/components/ui/button";
import { ChannelStripNotice } from "@/components/ui/channel-strip";
import type { ChannelStripStatusProps } from "@/components/ui/channel-strip";
import {
  Mixer,
  MixerActions,
  MixerChannels,
  MixerEmpty,
  MixerHeader,
  MixerMaster,
  MixerSeparator,
  MixerTitle,
} from "@/components/ui/mixer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SoundPad,
  SoundPadGrid,
  SoundPadLabel,
  SoundPadProgress,
  SoundPadShortcut,
} from "@/components/ui/sound-pad";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import type { AudioPlayerController } from "@/hooks/use-audio-player";
import { useGainNode } from "@/hooks/use-gain-node";
import { useMicrophone } from "@/hooks/use-microphone";
import type { UseMicrophoneResult } from "@/hooks/use-microphone";
import { useMixer } from "@/hooks/use-mixer";
import type { Mixer as MixerController } from "@/hooks/use-mixer";
import { useSound } from "@/hooks/use-sound";
import { useSystemAudio } from "@/hooks/use-system-audio";
import type { UseSystemAudioResult } from "@/hooks/use-system-audio";
import { useWebAudioMixer } from "@/hooks/use-web-audio-mixer";
import type { FrameSource, MeterFrame, Orientation } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";
import { cn } from "@/lib/utils";

export type MixerSourceId = "microphone" | "system" | "music" | "sounds";

export interface MixerTrack {
  id: string;
  title: string;
  artist?: string;
  src: string;
}

export interface MixerSound {
  id: string;
  label: string;
  src: string | AudioBuffer;
  hotkey?: string;
  accent?: string;
}

export interface SystemAudioMixerProps {
  defaultOrientation?: Orientation;
  sources?: MixerSourceId[];
  persistKey?: string;
  onOutputChange?: (stream: MediaStream | null) => void;
  tracks?: MixerTrack[];
  sounds?: MixerSound[];
  class?: string;
  className?: string;
}

const ALL_SOURCES: MixerSourceId[] = [
  "microphone",
  "system",
  "music",
  "sounds",
];

const NO_TRACKS: MixerTrack[] = [];

const NO_SOUNDS: MixerSound[] = [];

const CHANNELS = [
  { id: "microphone" },
  { gainDb: -6, id: "system" },
  { gainDb: -12, id: "music", monitor: true },
  { gainDb: -6, id: "sounds", monitor: true },
];

interface Status {
  label: string;
  tone: ChannelStripStatusProps["tone"];
}

interface ChannelProps {
  mixer: MixerController;
  meter: FrameSource<MeterFrame>;
}

const MixerPad = (props: { sound: MixerSound; bus: AudioNode | null }) => {
  const player = useSound(
    () => props.sound.src,
    () => ({ destination: props.bus })
  );

  return (
    <SoundPad
      accent={props.sound.accent}
      hotkey={props.sound.hotkey}
      loading={!player.isLoaded}
      onTrigger={() => player.play()}
      playing={player.isPlaying}
      size="sm"
    >
      <SoundPadLabel>{props.sound.label}</SoundPadLabel>
      <SoundPadShortcut />
      <SoundPadProgress source={player.progress} />
    </SoundPad>
  );
};

const microphoneStatus = (
  microphone: UseMicrophoneResult,
  audible: boolean
): Status => {
  if (microphone.status === "active")
    return audible
      ? { label: "Live", tone: "live" }
      : { label: "Muted", tone: "muted" };

  if (microphone.status === "denied")
    return { label: "Blocked", tone: "error" };

  return { label: "Off", tone: "default" };
};

const systemStatus = (system: UseSystemAudioResult): Status => {
  if (system.status === "active") return { label: "On", tone: "live" };

  if (system.status === "unsupported")
    return { label: "Unsupported", tone: "warning" };

  return { label: "Off", tone: "default" };
};

const MicrophoneChannel = (
  props: ChannelProps & {
    microphone: UseMicrophoneResult;
    deviceId: string | null;
    onDeviceChange: (id: string | null) => void;
  }
) => {
  const devices = useAudioDevices();
  const active = () => props.microphone.status === "active";

  const label = () =>
    devices.devices.find((device) => device.id === props.deviceId)?.label ??
    "Default microphone";

  return (
    <MixerSourceStrip
      accent="var(--chart-2)"
      id="microphone"
      title="Microphone"
      description={active() ? label() : "Not listening"}
      icon={<MicrophoneIcon />}
      mixer={props.mixer}
      meter={props.meter}
      status={microphoneStatus(
        props.microphone,
        props.mixer.isAudible("microphone")
      )}
      actions={
        <>
          <Popover>
            <PopoverTrigger
              aria-label="Microphone settings"
              size="icon-xs"
              variant="ghost"
            >
              <GearSixIcon />
            </PopoverTrigger>
            <PopoverContent class="w-72">
              <AudioDeviceSelect
                devices={devices.devices}
                loading={devices.isLoading}
                onRequestPermission={() => void devices.requestPermission()}
                onValueChange={props.onDeviceChange}
                permission={
                  devices.permission === "unsupported"
                    ? "denied"
                    : devices.permission
                }
                value={props.deviceId}
              />
            </PopoverContent>
          </Popover>
          <Button
            onClick={() =>
              active() ? props.microphone.stop() : void props.microphone.start()
            }
            size="xs"
            variant={active() ? "secondary" : "outline"}
          >
            {active() ? "Stop" : "Start"}
          </Button>
        </>
      }
      notice={
        <Show when={props.microphone.status === "denied"}>
          <ChannelStripNotice variant="destructive">
            Microphone access is blocked. Allow it in your browser's site
            settings.
          </ChannelStripNotice>
        </Show>
      }
    />
  );
};

const SystemChannel = (
  props: ChannelProps & { system: UseSystemAudioResult }
) => (
  <MixerSourceStrip
    accent="var(--chart-4)"
    id="system"
    title="System audio"
    description={
      props.system.status === "active"
        ? "Capturing"
        : "Share a screen or tab with audio"
    }
    icon={<DesktopIcon />}
    meter={props.meter}
    mixer={props.mixer}
    monitorable={false}
    status={systemStatus(props.system)}
    actions={
      <Switch
        aria-label="Capture system audio"
        checked={props.system.status === "active"}
        disabled={!props.system.isSupported}
        onCheckedChange={(checked) =>
          checked ? void props.system.start() : props.system.stop()
        }
        size="sm"
      />
    }
    notice={
      <Show when={props.system.status === "no-audio"}>
        <ChannelStripNotice variant="warning">
          Nothing to hear: tick "Share audio" in the browser's picker.
        </ChannelStripNotice>
      </Show>
    }
  />
);

const MusicChannel = (
  props: ChannelProps & {
    player: AudioPlayerController;
    track: MixerTrack | undefined;
    trackCount: number;
    onNext: () => void;
  }
) => (
  <MixerSourceStrip
    accent="var(--chart-1)"
    id="music"
    title="Music"
    description={props.track ? props.track.title : "No tracks"}
    icon={<MusicNotesIcon />}
    meter={props.meter}
    mixer={props.mixer}
    status={
      props.player.playing ? { label: "Playing", tone: "live" } : undefined
    }
    actions={
      <>
        <Button
          aria-label={props.player.playing ? "Pause music" : "Play music"}
          disabled={!props.track}
          onClick={() => void props.player.toggle()}
          size="icon-xs"
          variant="ghost"
        >
          {props.player.playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Button
          aria-label="Next track"
          disabled={props.trackCount < 2}
          onClick={() => props.onNext()}
          size="icon-xs"
          variant="ghost"
        >
          <SkipForwardIcon />
        </Button>
      </>
    }
  />
);

const SoundsChannel = (
  props: ChannelProps & { sounds: MixerSound[]; bus: AudioNode | null }
) => (
  <MixerSourceStrip
    accent="var(--chart-3)"
    id="sounds"
    title="Sounds"
    description={`${props.sounds.length} pads`}
    icon={<WaveformIcon />}
    meter={props.meter}
    mixer={props.mixer}
    actions={
      <Popover>
        <PopoverTrigger
          aria-label="Sound pads"
          disabled={!props.sounds.length}
          size="icon-xs"
          variant="ghost"
        >
          <SquaresFourIcon />
        </PopoverTrigger>
        <PopoverContent class="w-80">
          <SoundPadGrid class="[--pad-min-width:4rem]" columns={4} hotkeys>
            <For each={props.sounds}>
              {(sound) => <MixerPad sound={sound} bus={props.bus} />}
            </For>
          </SoundPadGrid>
        </PopoverContent>
      </Popover>
    }
  />
);

export const SystemAudioMixer = (props: SystemAudioMixerProps) => {
  const [orientation, setOrientation] = createSignal<Orientation>(
    props.defaultOrientation ?? "horizontal"
  );

  const mixer = useMixer({
    channels: CHANNELS,
    get persistKey() {
      return props.persistKey;
    },
  });

  const [deviceId, setDeviceId] = createSignal<string | null>(null);

  const microphone = useMicrophone({
    get deviceId() {
      return deviceId();
    },
  });

  const system = useSystemAudio();
  const [trackIndex, setTrackIndex] = createSignal(0);
  const tracks = () => props.tracks ?? NO_TRACKS;
  const sounds = () => props.sounds ?? NO_SOUNDS;

  const track = () =>
    tracks()[Math.min(trackIndex(), Math.max(0, tracks().length - 1))];

  const nextTrack = () =>
    setTrackIndex((index) =>
      tracks().length ? (index + 1) % tracks().length : 0
    );

  const player = useAudioPlayer(() => ({
    onEnded: nextTrack,
    src: track()?.src,
  }));

  const soundBus = useGainNode({ destination: null });

  const graph = useWebAudioMixer(mixer, () => ({
    ducking: { targets: ["music"], trigger: "microphone" },
    inputs: {
      microphone: microphone.stream,
      music: player.element,
      sounds: soundBus,
      system: system.stream,
    },
  }));

  createCompatEffect(
    () => graph.output,
    (output) => {
      props.onOutputChange?.(output);
    }
  );
  onCleanup(() => props.onOutputChange?.(null));

  const show = (id: MixerSourceId) =>
    (props.sources ?? ALL_SOURCES).includes(id);

  const meterFor = (id: MixerSourceId) =>
    graph.meters[id] ?? graph.master.meter;

  return (
    <Mixer
      class={cn(
        "[--channel-strip-header-width:16rem]",
        props.class,
        props.className
      )}
      orientation={orientation()}
    >
      <MixerHeader>
        <MixerTitle>Audio mixer</MixerTitle>
        <MixerActions>
          <Tabs
            value={orientation()}
            onValueChange={(value) => {
              if (value === "horizontal" || value === "vertical")
                setOrientation(value);
            }}
          >
            <TabsList aria-label="Mixer layout">
              <TabsTrigger value="horizontal">Rows</TabsTrigger>
              <TabsTrigger value="vertical">Console</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            aria-label="Reset mixer"
            onClick={() => mixer.reset()}
            size="icon-sm"
            variant="ghost"
          >
            <ArrowCounterClockwiseIcon />
          </Button>
        </MixerActions>
      </MixerHeader>
      <MixerChannels>
        <Show when={show("microphone")}>
          <MicrophoneChannel
            deviceId={deviceId()}
            onDeviceChange={setDeviceId}
            microphone={microphone}
            mixer={mixer}
            meter={meterFor("microphone")}
          />
        </Show>
        <Show when={show("system")}>
          <SystemChannel
            system={system}
            mixer={mixer}
            meter={meterFor("system")}
          />
        </Show>
        <Show when={show("music")}>
          <MusicChannel
            player={player}
            track={track()}
            trackCount={tracks().length}
            onNext={nextTrack}
            mixer={mixer}
            meter={meterFor("music")}
          />
        </Show>
        <Show when={show("sounds")}>
          <SoundsChannel
            sounds={sounds()}
            bus={soundBus}
            mixer={mixer}
            meter={meterFor("sounds")}
          />
        </Show>
      </MixerChannels>
      <MixerEmpty>No audio sources.</MixerEmpty>
      <MixerSeparator />
      <MixerMaster>
        <MixerMasterStrip mixer={mixer} meter={graph.master.meter} />
      </MixerMaster>
    </Mixer>
  );
};
