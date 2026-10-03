import { createMemo, createSignal } from "solid-js";

import { createCompatEffect } from "@/lib/solid-effect";

export type MicrophoneStatus =
  | "idle"
  | "acquiring"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

export interface UseMicrophoneOptions {
  deviceId?: string | null;
  enabled?: boolean;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
}

export interface UseMicrophoneResult {
  readonly stream: MediaStream | null;
  readonly status: MicrophoneStatus;
  readonly error: Error | null;
  start: () => Promise<void>;
  stop: () => void;
}

interface MicrophoneResult {
  key: string;
  stream: MediaStream | null;
  status: MicrophoneStatus;
  failure: Error | null;
}

const stopStream = (stream: MediaStream | null) => {
  if (!stream) {
    return;
  }

  for (const track of stream.getTracks()) {
    track.stop();
  }
};

const statusForError = (caught: unknown): MicrophoneStatus => {
  if (!(caught instanceof DOMException)) {
    return "error";
  }

  if (caught.name === "NotAllowedError" || caught.name === "SecurityError") {
    return "denied";
  }

  if (
    caught.name === "NotFoundError" ||
    caught.name === "OverconstrainedError"
  ) {
    return "unavailable";
  }

  return "error";
};

const canOpenMicrophone = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const buildConstraints = (
  options: Required<
    Pick<
      UseMicrophoneOptions,
      "autoGainControl" | "echoCancellation" | "noiseSuppression"
    >
  > &
    Pick<UseMicrophoneOptions, "channelCount" | "deviceId">
): MediaTrackConstraints => {
  const constraints: MediaTrackConstraints = {
    autoGainControl: options.autoGainControl,
    echoCancellation: options.echoCancellation,
    noiseSuppression: options.noiseSuppression,
  };

  if (options.deviceId) {
    constraints.deviceId = { exact: options.deviceId };
  }

  if (options.channelCount) {
    constraints.channelCount = options.channelCount;
  }

  return constraints;
};

/** Opens a microphone as a MediaStream, with browser processing off by default. */
export const useMicrophone = (
  options: UseMicrophoneOptions = {}
): UseMicrophoneResult => {
  const [manual, setManual] = createSignal<boolean | null>(null);
  const [result, setResult] = createSignal<MicrophoneResult | null>(null);

  const wanted = createMemo(() => manual() ?? (options.enabled ?? false));

  const constraints = createMemo(() =>
    buildConstraints({
      autoGainControl: options.autoGainControl ?? false,
      channelCount: options.channelCount,
      deviceId: options.deviceId,
      echoCancellation: options.echoCancellation ?? false,
      noiseSuppression: options.noiseSuppression ?? false,
    })
  );

  const key = createMemo(() => JSON.stringify(constraints()));

  createCompatEffect(
    () => ({ key: key(), wanted: wanted() }),
    (current) => {
      if (!current.wanted || !canOpenMicrophone()) {
        setResult(null);

        return;
      }

      let cancelled = false;
      const listeners = new AbortController();
      let acquired: MediaStream | null = null;
      setResult(null);

      void navigator.mediaDevices
        .getUserMedia({
          audio: JSON.parse(current.key) as MediaTrackConstraints,
        })
        .then((stream) => {
          if (cancelled) {
            stopStream(stream);

            return;
          }

          acquired = stream;

          const handleEnded = () => {
            setResult({
              failure: null,
              key: current.key,
              status: "unavailable",
              stream: null,
            });
          };

          for (const track of stream.getAudioTracks()) {
            track.addEventListener("ended", handleEnded, {
              signal: listeners.signal,
            });
          }

          setResult({
            failure: null,
            key: current.key,
            status: "active",
            stream,
          });
        })
        .catch((caught) => {
          if (cancelled) {
            return;
          }

          setResult({
            failure:
              caught instanceof Error ? caught : new Error(String(caught)),
            key: current.key,
            status: statusForError(caught),
            stream: null,
          });
        });

      return () => {
        cancelled = true;
        listeners.abort();
        stopStream(acquired);
      };
    }
  );

  return {
    get error() {
      const current = result();

      if (!wanted()) {
        return null;
      }

      if (!canOpenMicrophone()) {
        return new Error("This browser cannot open a microphone.");
      }

      return current?.key === key() ? current.failure : null;
    },
    async start() {
      setManual(true);
      await Promise.resolve();
    },
    get status() {
      if (!wanted()) {
        return "idle";
      }

      if (!canOpenMicrophone()) {
        return "unavailable";
      }

      const current = result();

      return current?.key === key() ? current.status : "acquiring";
    },
    stop() {
      setManual(false);
    },
    get stream() {
      const current = result();

      return current?.key === key() ? current.stream : null;
    },
  };
};
