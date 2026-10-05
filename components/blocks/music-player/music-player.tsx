import { For, Show, createSignal, createUniqueId } from "solid-js";

import {
  MusicNotesIcon,
  PauseFillIcon,
  PlayFillIcon,
  RepeatIcon,
  RepeatOnceIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  SpeakerHighIcon,
  SpeakerXIcon,
} from "@/components/icons/phosphor";
import {
  AudioPlayer,
  AudioPlayerArtwork,
  AudioPlayerControls,
  AudioPlayerDescription,
  AudioPlayerNext,
  AudioPlayerPlay,
  AudioPlayerPrevious,
  AudioPlayerTime,
  AudioPlayerTitle,
  AudioPlayerVolume,
} from "@/components/ui/audio-player";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Label } from "@/components/ui/label";
import {
  ParameterSlider,
  ParameterSliderControl,
  ParameterSliderHeader,
  ParameterSliderLabel,
  ParameterSliderValue,
} from "@/components/ui/parameter-slider";
import { Switch } from "@/components/ui/switch";
import { Toggle } from "@/components/ui/toggle";
import {
  TrackList,
  TrackListItem,
  TrackListItemContent,
  TrackListItemDescription,
  TrackListItemDuration,
  TrackListItemIndex,
  TrackListItemTitle,
} from "@/components/ui/track-list";
import {
  VolumeControlMute,
  VolumeControlSlider,
} from "@/components/ui/volume-control";
import {
  Waveform,
  WaveformCanvas,
  WaveformCursor,
  WaveformHover,
} from "@/components/ui/waveform";
import {
  disconnectFrom,
  getMediaElementSource,
} from "@/hooks/use-audio-analyser";
import { useAudioContext } from "@/hooks/use-audio-context";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useWaveformData } from "@/hooks/use-waveform-data";
import { dbToGain } from "@/lib/audio/decibels";
import { formatTime } from "@/lib/audio/time";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import { createCompatEffect } from "@/lib/solid/effect";

export interface MusicTrack {
  id: string;
  title: string;
  artist?: string;
  src: string;
  artwork?: string;
  duration?: number;
}

export interface MusicPlayerProps {
  tracks?: MusicTrack[];
  defaultTracks?: MusicTrack[];
  onTrackChange?: (track: MusicTrack) => void;
  duckingSource?: FrameSource<MeterFrame> | null;
  output?: AudioNode | null;
  class?: string;
  className?: string;
}

type Repeat = "off" | "all" | "one";

const NO_TRACKS: MusicTrack[] = [];

const DUCK_THRESHOLD_DB = -35;

const DUCK_ATTACK = 0.02;

const DUCK_RELEASE = 0.15;

const DUCK_HOLD = 0.2;

const nextRepeat = { all: "one", off: "all", one: "off" } satisfies Record<
  Repeat,
  Repeat
>;

export const MusicPlayer = (props: MusicPlayerProps) => {
  const tracks = () => props.tracks ?? props.defaultTracks ?? NO_TRACKS;
  const duckingId = createUniqueId();
  const [index, setIndex] = createSignal(0);
  const position = () => Math.min(index(), Math.max(0, tracks().length - 1));
  const [shuffle, setShuffle] = createSignal(false);
  const [repeat, setRepeat] = createSignal<Repeat>("all");
  const [ducking, setDucking] = createSignal(true);
  const [autoAdvance, setAutoAdvance] = createSignal(false);
  const [duckAmountDb, setDuckAmountDb] = createSignal(-12);
  const track = () => tracks()[position()];

  const go = (direction: number) => {
    const count = tracks().length;

    if (!count) return;
    let next = (position() + direction + count) % count;

    if (shuffle() && count > 1)
      next = (position() + 1 + Math.floor(Math.random() * (count - 1))) % count;
    setIndex(next);
    setAutoAdvance(true);
    const nextTrack = tracks()[next];

    if (nextTrack) props.onTrackChange?.(nextTrack);
  };

  const player = useAudioPlayer(() => ({
    autoPlay: autoAdvance(),
    loop: repeat() === "one",
    src: track()?.src,
    onEnded: () => {
      if (repeat() === "all" || position() < tracks().length - 1) go(1);
    },
  }));

  const waveform = useWaveformData(() => track()?.src ?? null, {
    samples: 400,
  });

  const { context } = useAudioContext();
  const duckGain = context?.createGain() ?? null;

  const routed = () =>
    props.output !== undefined || props.duckingSource !== undefined;

  createCompatEffect(
    () => ({ routed: routed(), output: props.output }),
    (settings) => {
      if (!(context && duckGain && player.element && settings.routed)) return;
      const source = getMediaElementSource(context, player.element);
      disconnectFrom(source, context.destination);
      source.connect(duckGain);

      const target =
        settings.output === undefined ? context.destination : settings.output;

      if (target) duckGain.connect(target);

      return () => {
        disconnectFrom(source, duckGain);

        if (target) disconnectFrom(duckGain, target);
        source.connect(context.destination);
      };
    }
  );
  useFrameSource(
    () => props.duckingSource,
    (frame) => {
      if (!(duckGain && context && ducking())) return;
      let loudest = Number.NEGATIVE_INFINITY;

      for (const level of frame.channels)
        loudest = Math.max(loudest, level.peakDb);

      if (loudest < DUCK_THRESHOLD_DB) return;
      const now = context.currentTime;
      duckGain.gain.cancelScheduledValues(now);
      duckGain.gain.setTargetAtTime(dbToGain(duckAmountDb()), now, DUCK_ATTACK);
      duckGain.gain.setTargetAtTime(1, now + DUCK_HOLD, DUCK_RELEASE);
    },
    {
      get enabled() {
        return routed() && Boolean(duckGain);
      },
    }
  );

  return (
    <Show
      when={tracks().length}
      fallback={
        <Empty class={props.class ?? props.className}>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MusicNotesIcon />
            </EmptyMedia>
            <EmptyTitle>No music</EmptyTitle>
            <EmptyDescription>Add tracks to start playing.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      }
    >
      <Card class={props.class ?? props.className}>
        <CardContent>
          <div class="flex flex-col gap-4">
            <AudioPlayer
              class="flex-col items-stretch gap-3"
              onNext={() => go(1)}
              onPrevious={() => go(-1)}
              player={player}
            >
              <div class="flex items-center gap-3">
                <Show
                  when={track()?.artwork}
                  fallback={
                    <span class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-lg">
                      <MusicNotesIcon class="size-5" />
                    </span>
                  }
                >
                  {(src) => <AudioPlayerArtwork src={src()} />}
                </Show>
                <div class="flex min-w-0 flex-1 flex-col">
                  <AudioPlayerTitle>{track()?.title}</AudioPlayerTitle>
                  <AudioPlayerDescription>
                    {track()?.artist}
                  </AudioPlayerDescription>
                </div>
              </div>
              <Waveform
                class="h-14"
                currentTime={player.currentTime}
                duration={waveform.duration || player.duration}
                loading={waveform.status === "loading"}
                onSeekCommitted={(value) => player.seek(value)}
                peaks={waveform.peaks}
                time={player.time}
              >
                <WaveformCanvas />
                <WaveformCursor />
                <WaveformHover />
              </Waveform>
              <div class="flex items-center justify-between">
                <AudioPlayerTime />
                <AudioPlayerTime type="remaining" />
              </div>
              <div class="flex items-center justify-between gap-2">
                <Toggle
                  aria-label="Shuffle"
                  onPressedChange={setShuffle}
                  pressed={shuffle()}
                  size="sm"
                >
                  <ShuffleIcon />
                </Toggle>
                <AudioPlayerControls>
                  <AudioPlayerPrevious>
                    <SkipBackIcon />
                  </AudioPlayerPrevious>
                  <AudioPlayerPlay>
                    {(state) =>
                      state.playing ? <PauseFillIcon /> : <PlayFillIcon />
                    }
                  </AudioPlayerPlay>
                  <AudioPlayerNext>
                    <SkipForwardIcon />
                  </AudioPlayerNext>
                </AudioPlayerControls>
                <Toggle
                  aria-label={`Repeat: ${repeat()}`}
                  onPressedChange={() => setRepeat(nextRepeat[repeat()])}
                  pressed={repeat() !== "off"}
                  size="sm"
                >
                  <Show when={repeat() === "one"} fallback={<RepeatIcon />}>
                    <RepeatOnceIcon />
                  </Show>
                </Toggle>
              </div>
              <AudioPlayerVolume>
                <VolumeControlMute>
                  {player.muted ? <SpeakerXIcon /> : <SpeakerHighIcon />}
                </VolumeControlMute>
                <VolumeControlSlider />
              </AudioPlayerVolume>
            </AudioPlayer>
            <TrackList variant="outline">
              <For each={tracks()}>
                {(item, row) => (
                  <TrackListItem
                    active={row() === position()}
                    playing={row() === position() && player.playing}
                    onSelect={() => {
                      const same = row() === position();
                      setIndex(row());
                      props.onTrackChange?.(item);

                      if (same) void player.toggle();
                      else setAutoAdvance(true);
                    }}
                  >
                    <TrackListItemIndex>{row() + 1}</TrackListItemIndex>
                    <TrackListItemContent>
                      <TrackListItemTitle>{item.title}</TrackListItemTitle>
                      <Show when={item.artist}>
                        <TrackListItemDescription>
                          {item.artist}
                        </TrackListItemDescription>
                      </Show>
                    </TrackListItemContent>
                    <TrackListItemDuration>
                      {item.duration ? formatTime(item.duration) : null}
                    </TrackListItemDuration>
                  </TrackListItem>
                )}
              </For>
            </TrackList>
            <Show when={props.duckingSource !== undefined}>
              <div class="flex flex-col gap-3 rounded-xl border p-3">
                <div class="flex items-center justify-between">
                  <Label for={duckingId}>Lower music while you talk</Label>
                  <Switch
                    checked={ducking()}
                    id={duckingId}
                    onCheckedChange={setDucking}
                    size="sm"
                  />
                </div>
                <ParameterSlider
                  disabled={!ducking()}
                  max={0}
                  min={-30}
                  onValueChange={setDuckAmountDb}
                  unit="dB"
                  value={duckAmountDb()}
                >
                  <ParameterSliderHeader>
                    <ParameterSliderLabel>Amount</ParameterSliderLabel>
                    <ParameterSliderValue />
                  </ParameterSliderHeader>
                  <ParameterSliderControl />
                </ParameterSlider>
              </div>
            </Show>
          </div>
        </CardContent>
      </Card>
    </Show>
  );
};
