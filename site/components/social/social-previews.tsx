import { For, Show } from "solid-js";
import type { Component } from "solid-js";

import {
  DesktopIcon,
  MicrophoneIcon,
  MusicNotesIcon,
  SpeakerHighIcon,
  WaveformIcon,
} from "@/components/icons/phosphor";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
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
import { ElectricBarVisualizer } from "@/components/ui/electric-bar-visualizer";
import { ElectricWaveform } from "@/components/ui/electric-waveform";
import { Fader } from "@/components/ui/fader";
import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack,
  LevelMeterValue,
} from "@/components/ui/level-meter";
import { LiveWaveform } from "@/components/ui/live-waveform";
import {
  Mixer,
  MixerChannels,
  MixerMaster,
  MixerSeparator,
} from "@/components/ui/mixer";
import { SmoothWaveform } from "@/components/ui/smooth-waveform";
import { Spectrum } from "@/components/ui/spectrum";
import {
  Waveform,
  WaveformCanvas,
  WaveformCursor,
  WaveformMarker,
  WaveformRegion,
} from "@/components/ui/waveform";
import { formatDb } from "@/lib/audio/decibels";
import type { MeterFrame } from "@/lib/audio/types";
import KnobsTile from "@/site/components/home/tiles/knobs-tile";
import {
  MicSetupPreview,
  MusicPlayerPreview,
  PlayerPreview,
  QuickPopoverPreview,
  SoundboardPreview,
  SystemMixerPreview,
  SystemSettingsPreview,
} from "@/site/components/social/block-previews";
import {
  ClipPreview,
  DevicesPreview,
  FadersPreview,
  PadsPreview,
  PanPreview,
  ParametersPreview,
  ReadoutPreview,
  ScalePreview,
  ThemingPreview,
  TogglesPreview,
  TracksPreview,
  VolumePreview,
} from "@/site/components/social/control-previews";
import type { SocialPreviewName } from "@/site/lib/social-catalog";
import {
  createStillSource,
  socialPeaks,
  socialVisualSource,
} from "@/site/lib/social-signal";

import styles from "./social-card.module.css";

const METER_CHANNELS = [0, 1];

const MIXER_CHANNELS = [
  { gainDb: 0, icon: MicrophoneIcon, peakDb: -12, title: "Mic" },
  { gainDb: -8, icon: DesktopIcon, peakDb: -21, title: "System" },
  { gainDb: -14, icon: MusicNotesIcon, peakDb: -7, title: "Music" },
  { gainDb: -4, icon: WaveformIcon, peakDb: -16, title: "Sounds" },
];

const MASTER_CHANNEL = {
  gainDb: 0,
  icon: SpeakerHighIcon,
  peakDb: -8,
  title: "Master",
};

const PreviewStrip = (props: {
  channel: (typeof MIXER_CHANNELS)[number];
  master?: boolean;
}) => (
  <ChannelStrip variant={props.master ? "master" : "default"}>
    <ChannelStripHeader>
      <ChannelStripIcon>
        <props.channel.icon />
      </ChannelStripIcon>
      <ChannelStripTitle>{props.channel.title}</ChannelStripTitle>
    </ChannelStripHeader>
    <ChannelStripMeter>
      <LevelMeter
        aria-label={`${props.channel.title} level`}
        channels={[
          { peakDb: props.channel.peakDb },
          { peakDb: props.channel.peakDb - 3 },
        ]}
        size="sm"
      />
    </ChannelStripMeter>
    <ChannelStripFader>
      <Fader
        aria-label={`${props.channel.title} volume`}
        size="sm"
        value={props.channel.gainDb}
      />
    </ChannelStripFader>
    <ChannelStripValue>{formatDb(props.channel.gainDb)}</ChannelStripValue>
    <Show when={!props.master}>
      <ChannelStripControls>
        <MuteToggle
          aria-label={`Mute ${props.channel.title}`}
          pressed={false}
          size="sm"
        >
          M
        </MuteToggle>
        <SoloToggle
          aria-label={`Solo ${props.channel.title}`}
          pressed={false}
          size="sm"
        >
          S
        </SoloToggle>
      </ChannelStripControls>
    </Show>
  </ChannelStrip>
);

const MixerPreview = () => (
  <Mixer
    aria-label="Mixer"
    aria-labelledby={undefined}
    class="w-full"
    orientation="vertical"
  >
    <MixerChannels>
      <For each={MIXER_CHANNELS}>
        {(channel) => <PreviewStrip channel={channel} />}
      </For>
    </MixerChannels>
    <MixerSeparator />
    <MixerMaster>
      <PreviewStrip channel={MASTER_CHANNEL} master />
    </MixerMaster>
  </Mixer>
);

const StereoMeter = (props: {
  label: string;
  peakDb: number;
  variant?: "solid" | "segmented";
}) => {
  const source = createStillSource<MeterFrame>({
    channels: [
      { peakDb: props.peakDb, rmsDb: props.peakDb - 6 },
      { peakDb: props.peakDb - 3, rmsDb: props.peakDb - 9 },
    ],
  });

  return (
    <div class="flex flex-col items-center gap-4">
      <LevelMeter
        aria-label={`${props.label} level`}
        class="h-64"
        orientation="vertical"
        size="lg"
        source={source}
        variant={props.variant ?? "solid"}
      >
        <LevelMeterChannels>
          <For each={METER_CHANNELS}>
            {(index) => (
              <LevelMeterChannel index={index}>
                <LevelMeterTrack>
                  <LevelMeterBar />
                  <LevelMeterHold />
                </LevelMeterTrack>
              </LevelMeterChannel>
            )}
          </For>
          <LevelMeterScale />
        </LevelMeterChannels>
        <LevelMeterValue />
      </LevelMeter>
      <span class="text-muted-foreground font-mono text-sm">{props.label}</span>
    </div>
  );
};

const MeterPreview = () => (
  <div class="flex items-center justify-center gap-16">
    <StereoMeter label="Program" peakDb={-7} />
    <StereoMeter label="Voice" peakDb={-16} variant="segmented" />
  </div>
);

const WaveformPreview = () => (
  <div class="flex w-full flex-col gap-6">
    <div class="flex items-center justify-between font-mono text-sm">
      <span>Night Drive</span>
      <span class="text-muted-foreground">0:24 / 1:00</span>
    </div>
    <Waveform
      aria-label="Night Drive"
      class="h-36 w-full"
      currentTime={24}
      duration={60}
      peaks={socialPeaks}
      variant="mirror"
    >
      <WaveformCanvas />
      <WaveformRegion end={38} start={24} />
      <WaveformMarker time={46}>Outro</WaveformMarker>
      <WaveformCursor />
    </Waveform>
    <span class="text-muted-foreground font-mono text-xs">
      SEEK / REGIONS / MARKERS
    </span>
  </div>
);

const HomePreview = () => (
  <div class={styles.homePreview}>
    <div class={styles.homeMixer}>
      <MixerPreview />
    </div>
    <div class={styles.homeKnobs}>
      <KnobsTile />
    </div>
    <div class={styles.homeWaveform}>
      <Waveform
        aria-label="Track waveform"
        class="h-20"
        currentTime={24}
        duration={60}
        peaks={socialPeaks}
        variant="mirror"
      />
    </div>
  </div>
);

const ElectricWaveformPreview = () => (
  <ElectricWaveform
    aria-label="Electric audio trace"
    class="h-64 w-full"
    intensity={0.7}
    source={socialVisualSource}
  />
);

const BarsPreview = () => (
  <BarVisualizer
    aria-label="Audio frequency bands"
    barCount={32}
    class="h-56 w-full"
    source={socialVisualSource}
  />
);

const ElectricBarsPreview = () => (
  <ElectricBarVisualizer
    aria-label="Electric frequency bars"
    barCount={24}
    barWidth={12}
    class="h-64 w-full"
    source={socialVisualSource}
  />
);

const LivePreview = () => (
  <div class="flex w-full flex-col gap-8">
    <LiveWaveform
      aria-label="Oscilloscope trace"
      class="h-24"
      lineWidth={3}
      source={socialVisualSource}
      variant="line"
    />
    <LiveWaveform
      aria-label="Signal history"
      class="h-24"
      mode="scrolling"
      source={socialVisualSource}
    />
  </div>
);

const SmoothPreview = () => (
  <div class="flex w-full flex-col gap-8">
    <SmoothWaveform
      aria-label="Flowing audio wave"
      class="h-24"
      lineWidth={3}
      source={socialVisualSource}
    />
    <SmoothWaveform
      aria-label="Oscilloscope line"
      class="h-24"
      lineWidth={3}
      mode="scope"
      source={socialVisualSource}
    />
  </div>
);

const SpectrumPreview = () => (
  <Spectrum class="h-64 w-full" peakHold source={socialVisualSource} />
);

const ChannelPreview = () => (
  <div class="w-full">
    <PreviewStrip channel={MIXER_CHANNELS[0]} />
  </div>
);

const CollectionPreview = () => (
  <div class={styles.collection}>
    <div class={styles.collectionKnobs}>
      <KnobsTile />
    </div>
    <div>
      <LevelMeter
        aria-label="Stereo level"
        channels={[{ peakDb: -7 }, { peakDb: -16 }]}
        size="lg"
      />
      <Fader aria-label="Gain" class="mt-5" value={-8} />
    </div>
    <div class={styles.collectionWaveform}>
      <Waveform
        aria-label="Track waveform"
        class="h-28"
        currentTime={24}
        duration={60}
        peaks={socialPeaks}
        variant="mirror"
      />
    </div>
  </div>
);

const BlocksPreview = () => (
  <div class="flex w-full flex-col gap-8">
    <MixerPreview />
    <PadsPreview />
  </div>
);

export const socialPreviews: Record<SocialPreviewName, Component> = {
  bars: BarsPreview,
  blocks: BlocksPreview,
  channel: ChannelPreview,
  clip: ClipPreview,
  collection: CollectionPreview,
  devices: DevicesPreview,
  "electric-bars": ElectricBarsPreview,
  "electric-waveform": ElectricWaveformPreview,
  faders: FadersPreview,
  home: HomePreview,
  knobs: KnobsTile,
  "live-waveform": LivePreview,
  meters: MeterPreview,
  "mic-setup": MicSetupPreview,
  mixer: MixerPreview,
  "music-player": MusicPlayerPreview,
  pads: PadsPreview,
  pan: PanPreview,
  parameters: ParametersPreview,
  player: PlayerPreview,
  "quick-popover": QuickPopoverPreview,
  readout: ReadoutPreview,
  scale: ScalePreview,
  "smooth-waveform": SmoothPreview,
  soundboard: SoundboardPreview,
  spectrum: SpectrumPreview,
  "system-mixer": SystemMixerPreview,
  "system-settings": SystemSettingsPreview,
  theming: ThemingPreview,
  toggles: TogglesPreview,
  tracks: TracksPreview,
  volume: VolumePreview,
  waveform: WaveformPreview,
};
