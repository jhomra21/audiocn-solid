import { createSignal, onCleanup } from "solid-js";

import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";

export type SystemAudioStatus =
  | "idle"
  | "prompting"
  | "active"
  | "no-audio"
  | "denied"
  | "ended"
  | "unsupported";

export interface UseSystemAudioOptions {
  systemAudio?: boolean;
  preferCurrentTab?: boolean;
}

export interface UseSystemAudioResult {
  readonly isSupported: boolean;
  readonly stream: MediaStream | null;
  readonly status: SystemAudioStatus;
  readonly error: Error | null;
  start: () => Promise<void>;
  stop: () => void;
}

interface DisplayMediaOptions extends DisplayMediaStreamOptions {
  systemAudio: "include" | "exclude";
  preferCurrentTab: boolean;
  selfBrowserSurface: "exclude";
}

const supported = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getDisplayMedia);

const stopStream = (stream: MediaStream | null) => {
  for (const track of stream?.getTracks() ?? []) track.stop();
};

/** Captures only after an explicit user gesture; stops tracks on owner disposal. */
export const useSystemAudio = (
  options: MaybeAccessor<UseSystemAudioOptions> = {}
): UseSystemAudioResult => {
  const [stream, setStream] = createSignal<MediaStream | null>(null);
  const [status, setStatus] = createSignal<SystemAudioStatus>("idle");
  const [error, setError] = createSignal<Error | null>(null);
  let attempt: { cancelled: boolean } | null = null;
  let listeners: AbortController | null = null;

  const stop = () => {
    if (attempt) attempt.cancelled = true;
    attempt = null;
    listeners?.abort();
    listeners = null;
    stopStream(stream());
    setStream(null);
    setStatus("idle");
  };

  const start = async () => {
    if (!supported()) {
      setStatus("unsupported");

      return;
    }

    stop();
    const current = { cancelled: false };
    attempt = current;
    setStatus("prompting");
    setError(null);
    const settings = readMaybeAccessor(options);

    const constraints: DisplayMediaOptions = {
      audio: {
        autoGainControl: false,
        echoCancellation: false,
        noiseSuppression: false,
      },
      video: true,
      systemAudio: (settings.systemAudio ?? true) ? "include" : "exclude",
      preferCurrentTab: settings.preferCurrentTab ?? false,
      selfBrowserSurface: "exclude",
    };

    try {
      const display = await navigator.mediaDevices.getDisplayMedia(constraints);

      if (current.cancelled) {
        stopStream(display);

        return;
      }

      attempt = null;

      for (const track of display.getVideoTracks()) track.stop();
      const tracks = display.getAudioTracks();

      if (!tracks.length) {
        setStatus("no-audio");

        return;
      }

      const audio = new MediaStream(tracks);
      listeners = new AbortController();

      for (const track of tracks) {
        track.addEventListener(
          "ended",
          () => {
            if (stream() === audio) {
              listeners?.abort();
              listeners = null;
              stopStream(audio);
              setStream(null);
              setStatus("ended");
            }
          },
          { signal: listeners.signal }
        );
      }

      setStream(audio);
      setStatus("active");
    } catch (caught) {
      if (current.cancelled) return;
      attempt = null;
      setStatus(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "denied"
          : "idle"
      );
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }
  };

  onCleanup(stop);

  return {
    get isSupported() {
      return supported();
    },
    get stream() {
      return stream();
    },
    get status() {
      return supported() ? status() : "unsupported";
    },
    get error() {
      return error();
    },
    start,
    stop,
  };
};
