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

export interface UseAudioContextResult {
  readonly context: AudioContext | null;
  readonly status: AudioContextStatus;
  /** Resumes a suspended context. Call it from a user gesture. */
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
        if (current.state !== "suspended") {
          return;
        }

        try {
          await current.resume();
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

  return {
    get context() {
      return context;
    },
    async resume() {
      if (context && context.state === "suspended") {
        await context.resume();
      }
    },
    get status() {
      return status();
    },
  };
};
