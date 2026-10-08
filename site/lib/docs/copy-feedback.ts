import { createTiks } from "@rexa-developer/tiks";
import { createSignal, onCleanup } from "solid-js";

import { requestPlaybackAudioSession } from "@/hooks/use-audio-context";

export type CopyFeedbackState = "idle" | "done" | "error";

const COPIED_RESET_MS = 1500;

const copyFeedbackSound = createTiks({ respectReducedMotion: true });

const HAPTIC_PATTERNS = {
  done: [30, 60, 40],
  error: [40, 40, 40, 40, 40],
} as const;

const playHaptic = (state: Exclude<CopyFeedbackState, "idle">) => {
  try {
    navigator.vibrate?.([...HAPTIC_PATTERNS[state]]);
  } catch {
    // Optional hardware feedback must not affect clipboard status.
  }
};

export const createCopyFeedback = (read: () => string | undefined) => {
  const [state, setState] = createSignal<CopyFeedbackState>("idle");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request = 0;

  onCleanup(() => {
    request += 1;
    clearTimeout(timer);
  });

  const reset = () => {
    clearTimeout(timer);
    timer = setTimeout(() => setState("idle"), COPIED_RESET_MS);
  };

  const fail = () => {
    setState("error");

    try {
      copyFeedbackSound.error();
    } catch {
      // Clipboard status remains available when browser audio is unavailable.
    }

    playHaptic("error");
    reset();
  };

  const copy = async () => {
    let text: string | undefined;

    try {
      text = read();
    } catch {
      fail();

      return;
    }

    if (text === undefined) return;

    const currentRequest = ++request;
    clearTimeout(timer);
    requestPlaybackAudioSession();

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (currentRequest !== request) return;

      fail();

      return;
    }

    if (currentRequest !== request) return;

    setState("done");

    try {
      copyFeedbackSound.success();
    } catch {
      // Clipboard status remains available when browser audio is unavailable.
    }

    playHaptic("done");
    reset();
  };

  return [state, copy] as const;
};
