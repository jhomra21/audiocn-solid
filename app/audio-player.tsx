import { createSignal } from "solid-js";

import {
  AudioPlayer,
  AudioPlayerControls,
  AudioPlayerLoop,
  AudioPlayerNext,
  AudioPlayerPlay,
  AudioPlayerPrevious,
  AudioPlayerRate,
  AudioPlayerSeek,
  AudioPlayerSkipBack,
  AudioPlayerSkipForward,
  AudioPlayerTime,
  AudioPlayerTitle,
  AudioPlayerVolume,
  useAudioPlayerContext,
} from "@/components/ui/audio-player";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useDemoTracks } from "@/lib/docs/use-demo-audio";

const OwnedMedia = (props: { external: boolean }) => {
  const player = useAudioPlayerContext();

  return (
    <>
      <output data-testid="owned-status">{player.status}</output>
      <div data-testid="owned-media" hidden>
        {props.external ? null : player.element}
      </div>
    </>
  );
};

export const AudioPlayerApp = () => {
  const tracks = useDemoTracks();
  const player = useAudioPlayer(() => ({ src: tracks()[1]?.src }));
  const [next, setNext] = createSignal(0);
  const [external, setExternal] = createSignal(false);
  const seekOptions = { ownedWrite: true, name: "player.seekCalls" };
  const [seekCalls, setSeekCalls] = createSignal<number[]>([], seekOptions);

  const trackedPlayer = Object.assign(Object.create(player), {
    seek: (value: number) => {
      setSeekCalls((previous) => [...previous, value]);
      player.seek(value);
    },
  });

  return (
    <main class="mx-auto grid max-w-xl gap-4 p-4">
      <h1>Audio player contracts</h1>
      <AudioPlayer
        aria-label="Demo player"
        player={trackedPlayer}
        onNext={() => setNext((count) => count + 1)}
      >
        <AudioPlayerTitle>Low Tide</AudioPlayerTitle>
        <AudioPlayerControls>
          <AudioPlayerPrevious />
          <AudioPlayerSkipBack />
          <AudioPlayerPlay />
          <AudioPlayerSkipForward />
          <AudioPlayerNext />
        </AudioPlayerControls>
        <AudioPlayerTime />
        <AudioPlayerSeek />
        <AudioPlayerTime type="duration" />
        <AudioPlayerVolume />
        <AudioPlayerRate />
        <AudioPlayerLoop />
        <input aria-label="Notes" />
      </AudioPlayer>
      <output data-testid="player-ready">{player.status}</output>
      <output data-testid="player-position">
        {Math.round(player.currentTime)}
      </output>
      <output data-testid="transport-next">{next()}</output>
      <output data-testid="seek-calls">{JSON.stringify(seekCalls())}</output>
      <AudioPlayer
        aria-label="Composable player"
        player={external() ? player : undefined}
        src={tracks()[1]?.src}
      >
        <AudioPlayerPlay
          render={(buttonProps, state) => (
            <button
              {...buttonProps}
              aria-label={state.playing ? "Custom Pause" : "Custom Play"}
              data-render-slot={state.slot}
              data-render-playing={String(state.playing)}
            />
          )}
        />
        <AudioPlayerSeek />
        <OwnedMedia external={external()} />
      </AudioPlayer>
      <button onClick={() => setExternal((value) => !value)}>
        {external() ? "Use internal controller" : "Use external controller"}
      </button>
      <button onClick={() => player.pause()}>Pause external</button>
      <output data-testid="external-playing">{String(player.playing)}</output>
      <div data-testid="seek-media" hidden>
        {player.element}
      </div>
    </main>
  );
};
