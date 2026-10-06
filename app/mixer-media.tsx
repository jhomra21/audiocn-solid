import { createSignal } from "solid-js";

import ChannelStripConsole from "@/components/examples/channel-strip-console";
import {
  AudioPlayer,
  AudioPlayerArtwork,
  AudioPlayerPlay,
  AudioPlayerTime,
} from "@/components/ui/audio-player";
import {
  ChannelStrip,
  ChannelStripTitle,
  useChannelStrip,
} from "@/components/ui/channel-strip";
import { Fader } from "@/components/ui/fader";
import { LevelMeter } from "@/components/ui/level-meter";
import { Mixer, MixerChannels, MixerEmpty } from "@/components/ui/mixer";
import { SoundPad, SoundPadGrid } from "@/components/ui/sound-pad";
import { TrackList, TrackListItem } from "@/components/ui/track-list";
import { Waveform } from "@/components/ui/waveform";
import type { AudioPlayerController } from "@/hooks/use-audio-player";

const SoloProbe = () => {
  const strip = useChannelStrip();

  return <span>{strip.solo ? "soloed" : "not soloed"}</span>;
};

export const MixerMediaApp = () => {
  if (new URLSearchParams(location.search).get("case") === "console")
    return <ChannelStripConsole />;

  const [seeks, setSeeks] = createSignal<number[]>([]);
  const [selected, setSelected] = createSignal(0);
  const [padCounts, setPadCounts] = createSignal<Record<string, number>>({});
  const [togglePlaying, setTogglePlaying] = createSignal(false);
  const [playerLog, setPlayerLog] = createSignal<string[]>([]);

  const bump = (name: string) =>
    setPadCounts((counts) => ({ ...counts, [name]: (counts[name] ?? 0) + 1 }));

  const log = (entry: string) => setPlayerLog((entries) => [...entries, entry]);

  const controller: AudioPlayerController = {
    buffered: 0,
    currentTime: 84,
    duration: 220,
    element: null,
    error: null,
    loop: false,
    muted: false,
    pause: () => log("pause"),
    play: async () => {
      log("play");
    },
    playbackRate: 1,
    playing: false,
    seek: (seconds) => log(`seek:${seconds}`),
    setLoop: (loop) => log(`loop:${loop}`),
    setMuted: (muted) => log(`muted:${muted}`),
    setPlaybackRate: (rate) => log(`rate:${rate}`),
    setVolume: (volume) => log(`volume:${volume}`),
    status: "paused",
    time: { subscribe: () => () => {} },
    toggle: async () => {
      log("toggle");
    },
    volume: 1,
  };

  return (
    <main class="grid gap-6 p-6">
      <section data-testid="strip-vertical">
        <ChannelStrip muted orientation="vertical">
          <ChannelStripTitle>Mic</ChannelStripTitle>
          <LevelMeter aria-label="Mic level" />
        </ChannelStrip>
      </section>
      <section data-testid="strip-plain">
        <ChannelStrip>
          <ChannelStripTitle>Plain</ChannelStripTitle>
        </ChannelStrip>
      </section>
      <section data-testid="strip-tall">
        <ChannelStrip orientation="vertical">
          <ChannelStripTitle>Tall</ChannelStripTitle>
        </ChannelStrip>
      </section>
      <section data-testid="strip-solo">
        <ChannelStrip solo>
          <SoloProbe />
        </ChannelStrip>
      </section>
      <section data-testid="mixer-empty">
        <Mixer aria-label="Empty mixer">
          <MixerChannels />
          <MixerEmpty>Nothing here</MixerEmpty>
        </Mixer>
      </section>
      <section data-testid="mixer-pair">
        <Mixer orientation="vertical">
          <MixerChannels>
            <ChannelStrip>
              <ChannelStripTitle>A</ChannelStripTitle>
              <Fader aria-label="A volume" />
            </ChannelStrip>
            <ChannelStrip>
              <ChannelStripTitle>B</ChannelStripTitle>
              <Fader aria-label="B volume" />
            </ChannelStrip>
          </MixerChannels>
        </Mixer>
      </section>
      <section data-testid="waveforms">
        <Waveform
          aria-label="Clip"
          defaultCurrentTime={10}
          duration={60}
          onSeekCommitted={(time) => setSeeks((times) => [...times, time])}
          peaks={[0.2, 0.5, 1]}
        />
        <Waveform
          aria-label="Display only"
          duration={10}
          interactive={false}
          peaks={[1]}
        />
        <output data-testid="seeks">{JSON.stringify(seeks())}</output>
      </section>
      <section data-testid="tracks">
        <TrackList>
          <TrackListItem active onSelect={() => setSelected((n) => n + 1)}>
            One
          </TrackListItem>
          <TrackListItem>Two</TrackListItem>
        </TrackList>
        <output data-testid="selected">{selected()}</output>
      </section>
      <section data-testid="pads">
        <SoundPadGrid aria-label="Slot pads">
          <SoundPad data-slot="context-menu-trigger">One</SoundPad>
          <SoundPad data-slot="context-menu-trigger">Two</SoundPad>
        </SoundPadGrid>
        <SoundPad accent="red" style={{ "--from-test": "1" }}>
          Accent pad
        </SoundPad>
        <SoundPadGrid
          aria-label="Column pads"
          columns={4}
          style={{ "--from-test": "1" }}
        >
          <SoundPad>Column pad</SoundPad>
        </SoundPadGrid>
        <SoundPad
          mode="toggle"
          onStop={() => bump("toggleStop")}
          onTrigger={() => bump("toggleTrigger")}
          playing={togglePlaying()}
        >
          Toggle mode pad
        </SoundPad>
        <button onClick={() => setTogglePlaying(true)}>
          Mark toggle playing
        </button>
        <SoundPad
          mode="hold"
          onStop={() => bump("holdStop")}
          onTrigger={() => bump("holdTrigger")}
        >
          Hold mode pad
        </SoundPad>
        <input aria-label="Notes" />
        <SoundPadGrid aria-label="Hotkey pads" hotkeyScope="global" hotkeys>
          <SoundPad hotkey="q" onTrigger={() => bump("hotkey")}>
            Q
          </SoundPad>
        </SoundPadGrid>
        <output data-testid="pad-counts">{JSON.stringify(padCounts())}</output>
      </section>
      <section data-testid="artwork">
        <AudioPlayerArtwork alt="Night Drive album cover" src="/cover.png" />
        <AudioPlayerArtwork data-testid="decorative" src="/cover.png" />
      </section>
      <section data-testid="external-player">
        <AudioPlayer aria-label="External" player={controller}>
          <AudioPlayerPlay />
          <AudioPlayerTime />
          <AudioPlayerTime type="remaining" />
          <span tabindex="-1">focus target</span>
        </AudioPlayer>
        <output data-testid="player-log">{JSON.stringify(playerLog())}</output>
      </section>
    </main>
  );
};
