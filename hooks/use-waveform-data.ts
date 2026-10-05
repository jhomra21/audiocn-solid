import { createMemo, createSignal } from "solid-js";

import { useAudioContext } from "@/hooks/use-audio-context";
import { loadAudioBuffer } from "@/hooks/use-sound";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export type WaveformDataStatus = "idle" | "loading" | "ready" | "error";

export interface UseWaveformDataOptions {
  samples?: number;
}

export interface WaveformData {
  readonly peaks: Float32Array | null;
  readonly duration: number;
  readonly status: WaveformDataStatus;
  readonly error: Error | null;
}

const peakCache = new WeakMap<AudioBuffer, Map<number, Float32Array>>();

const isSoundUrl = (source: string | AudioBuffer | null): source is string =>
  typeof source === "string";

/** Normalised maxima across all channels, including the final partial bucket. */
export const computePeaks = (
  buffer: AudioBuffer,
  samples: number
): Float32Array => {
  const count = Math.max(1, Math.floor(samples));
  let cache = peakCache.get(buffer);

  if (!cache) {
    cache = new Map();
    peakCache.set(buffer, cache);
  }

  const cached = cache.get(count);

  if (cached) return cached;
  const peaks = new Float32Array(count);
  let loudest = 0;

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);

    for (let index = 0; index < count; index++) {
      const start = Math.floor((index * data.length) / count);

      const end = Math.min(
        data.length,
        Math.max(start + 1, Math.floor(((index + 1) * data.length) / count))
      );

      let peak = peaks[index] ?? 0;

      for (let sample = start; sample < end; sample++)
        peak = Math.max(peak, Math.abs(data[sample] ?? 0));
      peaks[index] = peak;
      loudest = Math.max(loudest, peak);
    }
  }

  if (loudest > 0)
    for (let index = 0; index < count; index++)
      peaks[index] = (peaks[index] ?? 0) / loudest;
  cache.set(count, peaks);

  return peaks;
};

const IDLE: WaveformData = {
  peaks: null,
  duration: 0,
  status: "idle",
  error: null,
};

const LOADING: WaveformData = { ...IDLE, status: "loading" };

const UNSUPPORTED: WaveformData = {
  ...IDLE,
  status: "error",
  error: new Error("This browser can't decode audio."),
};

interface LoadResult {
  src: string;
  samples: number;
  data: WaveformData;
}

export const useWaveformData = (
  src: MaybeAccessor<string | AudioBuffer | null>,
  options: MaybeAccessor<UseWaveformDataOptions> = {}
): WaveformData => {
  const audio = useAudioContext();

  const samples = () =>
    Math.max(1, Math.floor(readMaybeAccessor(options).samples ?? 512));

  const [result, setResult] = createSignal<LoadResult | null>(null);
  createCompatEffect(
    () => ({ src: readMaybeAccessor(src), samples: samples() }),
    (next) => {
      const context = audio.context;
      const source = next.src;

      if (!(context && isSoundUrl(source))) return;
      let cancelled = false;

      const load = async () => {
        try {
          const buffer = await loadAudioBuffer(context, source);

          if (!cancelled)
            setResult({
              src: source,
              samples: next.samples,
              data: {
                peaks: computePeaks(buffer, next.samples),
                duration: buffer.duration,
                status: "ready",
                error: null,
              },
            });
        } catch (error) {
          if (!cancelled)
            setResult({
              src: source,
              samples: next.samples,
              data: {
                ...IDLE,
                status: "error",
                error:
                  error instanceof Error ? error : new Error(String(error)),
              },
            });
        }
      };

      void load();

      return () => {
        cancelled = true;
      };
    }
  );

  const data = createMemo<WaveformData>(() => {
    const source = readMaybeAccessor(src);

    if (!source) return IDLE;

    if (!isSoundUrl(source))
      return {
        peaks: computePeaks(source, samples()),
        duration: source.duration,
        status: "ready",
        error: null,
      };

    if (audio.status === "unsupported") return UNSUPPORTED;
    const loaded = result();

    return loaded?.src === source && loaded.samples === samples()
      ? loaded.data
      : LOADING;
  });

  return {
    get peaks() {
      return data().peaks;
    },
    get duration() {
      return data().duration;
    },
    get status() {
      return data().status;
    },
    get error() {
      return data().error;
    },
  };
};
