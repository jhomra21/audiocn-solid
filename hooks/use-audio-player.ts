import { createSignal, untrack } from "solid-js";

import { clamp } from "@/lib/audio/decibels";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { FrameSource } from "@/lib/audio/types";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export type AudioPlayerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "ended"
  | "error";

export interface UseAudioPlayerOptions {
  src?: string;
  autoPlay?: boolean;
  loop?: boolean;
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  preload?: "none" | "metadata" | "auto";
  crossOrigin?: "anonymous" | "use-credentials";
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: MediaError | null) => void;
}

export interface AudioPlayerController {
  readonly element: HTMLAudioElement | null;
  readonly status: AudioPlayerStatus;
  readonly playing: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly buffered: number;
  readonly volume: number;
  readonly muted: boolean;
  readonly playbackRate: number;
  readonly loop: boolean;
  readonly error: MediaError | null;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  setLoop: (loop: boolean) => void;
  time: FrameSource<number>;
}

const safeDuration = (element: HTMLAudioElement) =>
  Number.isFinite(element.duration) ? element.duration : 0;

const bufferedEnd = (element: HTMLAudioElement) =>
  element.buffered.length
    ? element.buffered.end(element.buffered.length - 1)
    : 0;

const tryPlay = async (audio: HTMLAudioElement) => {
  try {
    await audio.play();
  } catch {
    // A refused autoplay remains paused. A later user gesture can retry.
  }
};

/** Owns one media element. Reactive options do not undo imperative overrides unless they change. */
export const useAudioPlayer = (
  options: MaybeAccessor<UseAudioPlayerOptions> = {}
): AudioPlayerController => {
  const read = () => readMaybeAccessor(options);
  const initial = untrack(read);
  const element = typeof Audio === "undefined" ? null : new Audio();
  const [status, setStatus] = createSignal<AudioPlayerStatus>("idle");
  const [currentTime, setCurrentTime] = createSignal(0);
  const [duration, setDuration] = createSignal(0);
  const [buffered, setBuffered] = createSignal(0);
  const [volume, setVolumeState] = createSignal(initial.volume ?? 1);
  const [muted, setMutedState] = createSignal(initial.muted ?? false);
  const [rate, setRate] = createSignal(initial.playbackRate ?? 1);
  const [error, setError] = createSignal<MediaError | null>(null);
  const [loopOverride, setLoopOverride] = createSignal<boolean | null>(null);
  const effectiveLoop = () => loopOverride() ?? read().loop ?? false;
  const time = createFrameEmitter<number>();

  createCompatEffect(
    () => element,
    (audio) => {
      if (!audio) return;

      const sync = () => {
        setCurrentTime(audio.currentTime);
        setDuration(safeDuration(audio));
        setBuffered(bufferedEnd(audio));
      };

      const handlers = {
        canplay: () =>
          setStatus((previous) =>
            previous === "loading" ? "ready" : previous
          ),
        durationchange: sync,
        emptied: () => {
          setBuffered(0);
          setCurrentTime(0);
          setDuration(0);
        },
        ended: () => {
          setStatus("ended");
          read().onEnded?.();
        },
        error: () => {
          setError(audio.error);
          setStatus("error");
          read().onError?.(audio.error);
        },
        loadedmetadata: sync,
        loadstart: () => {
          setError(null);
          setStatus("loading");
        },
        pause: () => {
          setStatus((previous) => (previous === "ended" ? previous : "paused"));
          read().onPause?.();
        },
        playing: () => {
          setStatus("playing");
          read().onPlay?.();
        },
        progress: () => setBuffered(bufferedEnd(audio)),
        ratechange: () => setRate(audio.playbackRate),
        seeked: sync,
        timeupdate: () => setCurrentTime(audio.currentTime),
        volumechange: () => {
          setMutedState(audio.muted);
          setVolumeState(audio.volume);
        },
      } satisfies Partial<Record<keyof HTMLMediaElementEventMap, () => void>>;

      const listeners = new AbortController();

      for (const [event, handler] of Object.entries(handlers)) {
        audio.addEventListener(event, handler, { signal: listeners.signal });
      }

      return () => {
        listeners.abort();
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      };
    }
  );

  createCompatEffect(
    () => read().preload ?? "metadata",
    (preload) => {
      if (element) element.preload = preload;
    }
  );
  createCompatEffect(
    () => ({ src: read().src, crossOrigin: read().crossOrigin }),
    ({ src, crossOrigin }) => {
      if (!element) return;
      const origin = crossOrigin ?? null;
      const changed = element.crossOrigin !== origin;
      element.crossOrigin = origin;

      if (!src) {
        if (element.hasAttribute("src")) {
          element.pause();
          element.removeAttribute("src");
          element.load();
        }

        return;
      }

      if (changed || element.getAttribute("src") !== src) {
        element.src = src;
        element.load();
      }

      if (read().autoPlay && element.paused && element.currentTime === 0)
        void tryPlay(element);
    }
  );
  let appliedVolume: number | undefined;
  let appliedMuted: boolean | undefined;
  let appliedRate: number | undefined;
  createCompatEffect(
    () => read().volume ?? 1,
    (next) => {
      if (element && appliedVolume !== next) {
        appliedVolume = next;
        element.volume = clamp(next, 0, 1);
      }
    }
  );
  createCompatEffect(
    () => read().muted ?? false,
    (next) => {
      if (element && appliedMuted !== next) {
        appliedMuted = next;
        element.muted = next;
      }
    }
  );
  createCompatEffect(
    () => read().playbackRate ?? 1,
    (next) => {
      if (element && appliedRate !== next) {
        appliedRate = next;
        element.playbackRate = next;
      }
    }
  );
  createCompatEffect(effectiveLoop, (next) => {
    if (element) element.loop = next;
  });
  const playing = () => Boolean(read().src) && status() === "playing";
  createCompatEffect(playing, (active) => {
    if (!(element && active)) return;

    return subscribeFrame(() => time.emit(element.currentTime));
  });

  const play = async () => {
    if (!element) return;

    if (element.ended) element.currentTime = 0;
    await tryPlay(element);
  };

  const pause = () => element?.pause();

  return {
    element,
    get status() {
      return read().src ? status() : "idle";
    },
    get playing() {
      return playing();
    },
    get currentTime() {
      return read().src ? currentTime() : 0;
    },
    get duration() {
      return duration();
    },
    get buffered() {
      return buffered();
    },
    get volume() {
      return volume();
    },
    get muted() {
      return muted();
    },
    get playbackRate() {
      return rate();
    },
    get loop() {
      return effectiveLoop();
    },
    get error() {
      return error();
    },
    play,
    pause,
    async toggle() {
      if (element?.paused) await play();
      else pause();
    },
    seek(seconds) {
      if (!element) return;
      const target = clamp(seconds, 0, safeDuration(element) || seconds);
      element.currentTime = target;
      time.emit(target);
    },
    setVolume(next) {
      if (element) element.volume = clamp(next, 0, 1);
    },
    setMuted(next) {
      if (element) element.muted = next;
    },
    setPlaybackRate(next) {
      if (element) element.playbackRate = next;
    },
    setLoop: setLoopOverride,
    time,
  };
};
