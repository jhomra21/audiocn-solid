import { createContext, createSignal, useContext } from "solid-js";

import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";

export type AudioContextStatus = AudioContextState | "unsupported";

interface AudioContextProviderValue {
  context: AudioContext;
  destination?: AudioNode;
}

const ProvidedContext = createContext<AudioContextProviderValue | null>(null);

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
  /** Route Knob click sounds through this node instead of the speakers. */
  destination?: AudioNode;
  children?: any;
}

/** Makes every audiocn hook below it use `context`. */
export const AudioContextProvider = (props: AudioContextProviderProps) =>
  provideContext(
    ProvidedContext,
    { context: props.context, destination: props.destination },
    () => props.children
  );

const GESTURE_EVENTS = ["pointerdown", "keydown", "touchend"] as const;

type AudioSessionNavigator = Navigator & {
  audioSession?: {
    type: string;
  };
};

/** Requests playback routing when available, without affecting native recovery. */
export const requestPlaybackAudioSession = () => {
  try {
    // SAFETY: This is the optional Web Audio Session extension to Navigator.
    const session = (
      typeof navigator === "undefined"
        ? undefined
        : (navigator as AudioSessionNavigator)
    )?.audioSession;

    if (session?.type === "auto") {
      session.type = "playback";
    }
  } catch {
    // AudioSession is optional; still attempt native context recovery.
  }
};

export interface UseAudioContextResult {
  readonly context: AudioContext | null;
  readonly status: AudioContextStatus;
  /** Selects playback and resumes suspended or interrupted audio. Call from a user gesture. */
  resume: () => Promise<void>;
}

export interface ProvidedAudioContext {
  readonly context: AudioContext | null;
  readonly destination: AudioNode | null;
}

/** Reads a provider without creating the shared page context. */
export const useProvidedAudioContext = (): ProvidedAudioContext => {
  const provided = useContext(ProvidedContext);
  const context = provided?.context ?? null;

  return {
    context,
    get destination() {
      return provided?.destination ?? context?.destination ?? null;
    },
  };
};

/** Requests playback routing and resumes a context from a user gesture. */
export const resumeAudioContext = async (
  context: AudioContext | null
): Promise<void> => {
  if (!context || context.state === "closed") return;

  requestPlaybackAudioSession();

  if (context.state === "suspended" || context.state === "interrupted") {
    try {
      await context.resume();
    } catch {
      // A later user gesture can retry after the browser rejects resume.
    }
  }
};

/**
 * The shared or provided AudioContext. It resumes on the first user gesture,
 * which browsers require before audio can start.
 */
export const useAudioContext = (): UseAudioContextResult => {
  const provided = useContext(ProvidedContext);
  const context = provided?.context ?? getSharedAudioContext();

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

      const resumeOnGesture = () => {
        void resume();
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
  const resume = () => resumeAudioContext(context);

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
