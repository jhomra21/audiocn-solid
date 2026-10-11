import { createSignal, onCleanup } from "solid-js";

import { useAudioContext } from "@/hooks/use-audio-context";
import { useGainNode } from "@/hooks/use-gain-node";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { FrameSource } from "@/lib/audio/types";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export interface UseSoundOptions {
  volume?: number;
  playbackRate?: number;
  loop?: boolean;
  interrupt?: boolean;
  maxVoices?: number;
  /** Omit for speakers, null for manual routing. */
  destination?: AudioNode | null;
}

export interface SoundController {
  play: () => void;
  stop: () => void;
  readonly isPlaying: boolean;
  readonly isLoaded: boolean;
  readonly error: Error | null;
  readonly duration: number;
  progress: FrameSource<number>;
  output: AudioNode | null;
}

const bufferCache = new WeakMap<
  BaseAudioContext,
  Map<string, Promise<AudioBuffer>>
>();

const isSoundUrl = (source: string | AudioBuffer | null): source is string =>
  typeof source === "string";

const fetchAndDecode = async (context: BaseAudioContext, src: string) => {
  const response = await fetch(src);

  if (!response.ok)
    throw new Error(`Could not load ${src}: ${response.status}`);

  return context.decodeAudioData(await response.arrayBuffer());
};

/** Fetches and decodes once per context; failures can be retried. */
export const loadAudioBuffer = (
  context: BaseAudioContext,
  src: string
): Promise<AudioBuffer> => {
  let cache = bufferCache.get(context);

  if (!cache) {
    cache = new Map();
    bufferCache.set(context, cache);
  }

  const cached = cache.get(src);

  if (cached) return cached;
  const loading = fetchAndDecode(context, src);
  cache.set(src, loading);
  void loading.catch(() => cache.delete(src));

  return loading;
};

interface LoadResult {
  context: AudioContext;
  src: string;
  buffer: AudioBuffer | null;
  error: Error | null;
}

interface Voice {
  node: AudioBufferSourceNode;
  startedAt: number;
}

/** Low-latency decoded playback. Voices retain the loop and rate they started with. */
export const useSound = (
  src: MaybeAccessor<string | AudioBuffer | null>,
  options: MaybeAccessor<UseSoundOptions> = {}
): SoundController => {
  const { context, resume } = useAudioContext();
  const read = () => readMaybeAccessor(options);
  const [result, setResult] = createSignal<LoadResult | null>(null);
  const [playing, setPlaying] = createSignal(false);
  const progress = createFrameEmitter<number>();

  const output = useGainNode(() => ({
    gain: read().volume ?? 1,
    destination: read().destination,
    timeConstant: 0.005,
  }));

  createCompatEffect(
    () => readMaybeAccessor(src),
    (source) => {
      if (!(context && isSoundUrl(source))) return;
      let cancelled = false;

      const load = async () => {
        try {
          const buffer = await loadAudioBuffer(context, source);

          if (!cancelled)
            setResult({ context, src: source, buffer, error: null });
        } catch (error) {
          if (!cancelled)
            setResult({
              context,
              src: source,
              buffer: null,
              error: error instanceof Error ? error : new Error(String(error)),
            });
        }
      };

      void load();

      return () => {
        cancelled = true;
      };
    }
  );

  const loaded = () => {
    const source = readMaybeAccessor(src);

    if (!source) return null;

    if (!isSoundUrl(source)) return { buffer: source, error: null };
    const current = result();

    return current?.src === source && current.context === context
      ? current
      : null;
  };

  let voices: Voice[] = [];
  let disposed = false;

  const release = (voice: Voice) => {
    voice.node.onended = null;
    voice.node.disconnect();
    voices = voices.filter((item) => item !== voice);
  };

  const stopVoice = (voice: Voice) => {
    release(voice);
    voice.node.stop();
  };

  const stop = () => {
    for (const voice of voices) stopVoice(voice);

    if (!disposed) setPlaying(false);
    progress.emit(0);
  };

  const play = () => {
    const buffer = loaded()?.buffer;

    if (!(context && buffer && output) || disposed) return;

    void resume().catch(() => {});

    if (read().interrupt ?? true) stop();
    else {
      const limit = Math.max(1, Math.floor(read().maxVoices ?? 4));

      while (voices.length >= limit) stopVoice(voices[0]!);
    }

    const node = context.createBufferSource();
    node.buffer = buffer;
    node.loop = read().loop ?? false;
    node.playbackRate.value = read().playbackRate ?? 1;
    node.connect(output);
    const voice = { node, startedAt: context.currentTime };
    node.onended = () => {
      release(voice);

      if (!voices.length && !disposed) {
        setPlaying(false);
        progress.emit(0);
      }
    };

    node.start();
    voices.push(voice);
    setPlaying(true);
  };

  createCompatEffect(playing, (active) => {
    if (!(active && context)) return;

    return subscribeFrame(() => {
      const latest = voices.at(-1);
      const buffer = latest?.node.buffer;

      if (!(latest && buffer)) return;

      const elapsed =
        (context.currentTime - latest.startedAt) *
        latest.node.playbackRate.value;

      progress.emit(
        latest.node.loop
          ? (elapsed % buffer.duration) / buffer.duration
          : Math.min(1, elapsed / buffer.duration)
      );
    });
  });
  onCleanup(() => {
    disposed = true;
    stop();
  });

  return {
    play,
    stop,
    progress,
    output,
    get isPlaying() {
      return playing();
    },
    get isLoaded() {
      return Boolean(loaded()?.buffer);
    },
    get error() {
      return loaded()?.error ?? null;
    },
    get duration() {
      return loaded()?.buffer?.duration ?? 0;
    },
  };
};
