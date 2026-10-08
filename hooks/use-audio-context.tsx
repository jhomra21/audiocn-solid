import { createContext, createSignal, useContext } from "solid-js";

import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";

export type AudioContextStatus = AudioContextState | "unsupported";

const ProvidedContext = createContext<AudioContext | null>(null);

let sharedContext: AudioContext | null = null;

/** The page-wide `AudioContext`, created on first use. Null on the server. */
export const getSharedAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") {
    return null;
  }

  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new AudioContext({ latencyHint: "interactive" });
  }

  return sharedContext;
};

export interface AudioContextProviderProps {
  /** Use your own context instead of the shared one. */
  context: AudioContext;
  children?: any;
}

/** Makes every audiocn hook below it use `context`. */
export const AudioContextProvider = (props: AudioContextProviderProps) =>
  provideContext(ProvidedContext, props.context, () => props.children);

const GESTURE_EVENTS = ["pointerdown", "keydown", "touchend"] as const;

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string;
  };
};

export interface UseAudioContextResult {
  readonly context: AudioContext | null;
  readonly status: AudioContextStatus;
  /** Selects playback and resumes suspended or interrupted audio. Call from a user gesture. */
  resume: () => Promise<void>;
}

/**
 * The shared or provided AudioContext. It resumes on the first user gesture,
 * which browsers require before audio can start.
 */
export const useAudioContext = (): UseAudioContextResult => {
  const provided = useContext(ProvidedContext);
  const context = provided ?? getSharedAudioContext();

  const [status, setStatus] = createSignal<AudioContextStatus>(
    context?.state ?? "unsupported"
  );

  createCompatEffect(
    () => context,
    (current) => {
      if (!current) {
        setStatus("unsupported");

        return;
      }

      const readStatus = () => setStatus(current.state);

      const resumeOnGesture = async () => {
        try {
          await resume();
        } catch {
          // The next gesture tries again.
        }
      };

      readStatus();
      current.addEventListener("statechange", readStatus);

      for (const event of GESTURE_EVENTS) {
        document.addEventListener(event, resumeOnGesture, { passive: true });
      }

      return () => {
        current.removeEventListener("statechange", readStatus);

        for (const event of GESTURE_EVENTS) {
          document.removeEventListener(event, resumeOnGesture);
        }
      };
    }
  );

  // Safari uses "interrupted" after backgrounding or losing audio hardware.
  // A running context can still be silent in the default ambient session.
  const resume = async () => {
    if (!context || context.state === "closed") return;

    // SAFETY: This is the optional Web Audio Session extension to Navigator.
    const session = (
      typeof navigator === "undefined"
        ? undefined
        : (navigator as AudioSessionNavigator)
    )?.audioSession;

    if (session?.type === "auto") {
      try {
        session.type = "playback";
      } catch {
        // AudioSession is optional; still attempt native context recovery.
      }
    }

    // Invoke native resume synchronously, before yielding the user gesture.
    if (context.state === "suspended" || context.state === "interrupted") {
      await context.resume();
    }
  };

  return {
    get context() {
      return context;
    },
    resume,
    get status() {
      return status();
    },
  };
};
