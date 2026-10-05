import { Show, createSignal, onCleanup } from "solid-js";

import {
  AudioContextProvider,
  getSharedAudioContext,
} from "@/hooks/use-audio-context";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useSound } from "@/hooks/use-sound";
import { useWaveformData } from "@/hooks/use-waveform-data";

interface ProbeProps {
  remember: (audio: HTMLAudioElement | null) => void;
}

const MediaProbe = (props: ProbeProps) => {
  const [src, setSrc] = createSignal<string | undefined>("/test-tone.wav");
  const [volume, setVolume] = createSignal(1);
  const [muted, setMuted] = createSignal(false);
  const [rate, setRate] = createSignal(1);
  const [errors, setErrors] = createSignal(0);

  const player = useAudioPlayer(() => ({
    src: src(),
    volume: volume(),
    muted: muted(),
    playbackRate: rate(),
    loop: false,
    onError: () => setErrors((count) => count + 1),
  }));

  props.remember(player.element);
  const [time, setTime] = createSignal(0);
  useFrameSource(player.time, setTime);

  return (
    <section class="grid gap-2">
      <span
        hidden
        ref={(node: HTMLSpanElement) => {
          if (player.element) node.append(player.element);
        }}
      />
      <output data-testid="player-status">{player.status}</output>
      <output data-testid="player-duration">{player.duration}</output>
      <output data-testid="smooth-time">{time()}</output>
      <output data-testid="media-options">
        {player.volume}/{String(player.muted)}/{player.playbackRate}/
        {String(player.loop)}
      </output>
      <output data-testid="media-error-events">{errors()}</output>
      <button onClick={() => void player.play()}>Play media</button>
      <button onClick={player.pause}>Pause media</button>
      <button onClick={() => player.seek(1)}>Seek media</button>
      <button
        onClick={() => {
          player.setVolume(0.25);
          player.setMuted(true);
          player.setPlaybackRate(1.5);
          player.setLoop(true);
        }}
      >
        Configure media
      </button>
      <button
        onClick={() => {
          setVolume(0.6);
          setMuted(true);
          setRate(2);
          player.setLoop(false);
        }}
      >
        Stage media props
      </button>
      <button
        onClick={() => {
          setMuted(false);
          setRate(1);
        }}
      >
        Change media props
      </button>
      <button onClick={() => setSrc(undefined)}>Clear media source</button>
      <button onClick={() => setSrc("/bad-tone.wav")}>Bad media source</button>
      <button onClick={() => setSrc("/test-tone.wav")}>
        Reset media source
      </button>
    </section>
  );
};

const SoundProbe = () => {
  const [src, setSrc] = createSignal<string | null>("/test-tone.wav");
  const [interrupt, setInterrupt] = createSignal(false);

  const sound = useSound(src, () => ({
    interrupt: interrupt(),
    maxVoices: 2,
    volume: 0,
  }));

  const waveform = useWaveformData(src, { samples: 16 });
  const [progress, setProgress] = createSignal(0);
  useFrameSource(sound.progress, setProgress);

  return (
    <section class="grid gap-2">
      <output data-testid="sound-loaded">{String(sound.isLoaded)}</output>
      <output data-testid="sound-playing">{String(sound.isPlaying)}</output>
      <output data-testid="sound-progress">{progress()}</output>
      <output data-testid="sound-error">{sound.error?.message ?? ""}</output>
      <output data-testid="wave-status">{waveform.status}</output>
      <output data-testid="wave-peaks">
        {waveform.peaks?.length ?? 0}/
        {waveform.peaks ? Math.max(...waveform.peaks) : 0}/{waveform.duration}
      </output>
      <button onClick={sound.play}>Play sound</button>
      <button onClick={sound.stop}>Stop sound</button>
      <button onClick={() => setInterrupt(true)}>Interrupt sound</button>
      <button onClick={() => setSrc("/slow-tone.wav")}>
        Slow sound source
      </button>
      <button onClick={() => setSrc("/bad-tone.wav")}>Bad sound source</button>
      <button onClick={() => setSrc(null)}>Clear sound source</button>
    </section>
  );
};

export const PlaybackApp = () => {
  const decoded = new URLSearchParams(location.search).has("decoded");
  const context = getSharedAudioContext();
  const [mounted, setMounted] = createSignal(true);
  const [voices, setVoices] = createSignal(0);
  const [disposedMedia, setDisposedMedia] = createSignal("mounted");
  let audio: HTMLAudioElement | null = null;
  const nodes = new Set<AudioBufferSourceNode>();

  if (context) {
    const create = context.createBufferSource.bind(context);
    context.createBufferSource = () => {
      const node = create();
      const start = node.start.bind(node);
      const stop = node.stop.bind(node);
      node.start = (...args) => {
        nodes.add(node);
        setVoices(nodes.size);
        start(...args);
      };

      node.stop = (...args) => {
        nodes.delete(node);
        setVoices(nodes.size);
        stop(...args);
      };

      node.addEventListener(
        "ended",
        () => {
          nodes.delete(node);
          setVoices(nodes.size);
        },
        { once: true }
      );

      return node;
    };

    onCleanup(() => {
      context.createBufferSource = create;
    });
  }

  return (
    <main class="grid gap-4 p-6">
      <h1>Playback contracts</h1>
      <Show when={mounted()}>
        {decoded && context ? (
          <AudioContextProvider context={context}>
            <SoundProbe />
          </AudioContextProvider>
        ) : (
          <MediaProbe
            remember={(element) => {
              audio = element;
            }}
          />
        )}
      </Show>
      <output data-testid="sound-voices">{voices()}</output>
      <button
        onClick={() => {
          setMounted(false);
          queueMicrotask(() =>
            setDisposedMedia(audio?.paused ? "paused" : "playing")
          );
        }}
      >
        Remove playback
      </button>
      <output data-testid="disposed-media">{disposedMedia()}</output>
    </main>
  );
};
