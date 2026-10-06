import { children, createRoot, createSignal } from "solid-js";

import { createAnalyserTap } from "@/hooks/use-audio-analyser";
import {
  AudioContextProvider,
  getSharedAudioContext,
} from "@/hooks/use-audio-context";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useAudioPlayer } from "@/hooks/use-audio-player";
import { useClipHold } from "@/hooks/use-clip-hold";
import { createDemoSignal, useDemoSignal } from "@/hooks/use-demo-signal";
import { useFrameSource } from "@/hooks/use-frame-source";
import { useGainNode } from "@/hooks/use-gain-node";
import { useLevel } from "@/hooks/use-level";
import { useMicrophone } from "@/hooks/use-microphone";
import { isChannelAudible, mixerReducer, useMixer } from "@/hooks/use-mixer";
import { useSound } from "@/hooks/use-sound";
import { useSystemAudio } from "@/hooks/use-system-audio";
import { createFrameEmitter, createFrameRelay } from "@/lib/audio/frame-source";
import type { FrameSource } from "@/lib/audio/types";
import { createDemoMixer, useDemoMixer } from "@/lib/docs/use-demo-mixer";
import { createCompatEffect } from "@/lib/solid/effect";

/** A function that records how it was called. */
const spy = () => {
  const calls: unknown[][] = [];

  return Object.assign(
    (...args: unknown[]) => {
      calls.push(args);
    },
    { calls }
  );
};

const fakeNode = () => ({ connect: spy(), disconnect: spy() });

/** An audio context that only records what the hooks ask of it. */
const createFakeAudio = () => {
  const clock = { now: 0 };
  const destination = {};
  const gains: (ReturnType<typeof fakeNode> & { gain: FakeParam })[] = [];
  const streamSources: ReturnType<typeof fakeNode>[] = [];
  const streamsSeen: MediaStream[] = [];

  interface FakeParam {
    setTargetAtTime: ReturnType<typeof spy>;
    setValueAtTime: ReturnType<typeof spy>;
    value: number;
  }

  const fake = {
    addEventListener() {},
    createBufferSource: () => ({
      ...fakeNode(),
      buffer: null,
      loop: false,
      onended: null,
      playbackRate: { value: 1 },
      start() {},
      stop() {},
    }),
    createGain: () => {
      const node = {
        ...fakeNode(),
        gain: { setTargetAtTime: spy(), setValueAtTime: spy(), value: 1 },
      };

      gains.push(node);

      return node;
    },
    createMediaStreamSource: (stream: MediaStream) => {
      const node = fakeNode();
      streamsSeen.push(stream);
      streamSources.push(node);

      return node;
    },
    get currentTime() {
      return clock.now;
    },
    destination,
    removeEventListener() {},
    state: "running",
  };

  return {
    clock,
    // `setPrototypeOf` returns `any`; the hooks under test touch only the members faked above.
    context: Object.setPrototypeOf(fake, null),
    destination,
    gains,
    streamSources,
    streamsSeen,
  };
};

/** An analyser tap over a node that hears a constant signal, as upstream's history tests build it. */
const createTestTap = () => {
  const analyser = {
    frequencyBinCount: 16,
    getFloatFrequencyData: (data: Float32Array) => data.fill(-24),
    getFloatTimeDomainData: (data: Float32Array) => data.fill(0.25),
  };

  const context: BaseAudioContext = Object.setPrototypeOf(
    { createAnalyser: () => analyser, sampleRate: 48_000 },
    null
  );

  const node: AudioNode = Object.setPrototypeOf(fakeNode(), null);

  return createAnalyserTap(context, node, { historyIntervalMs: 50 });
};

/** The built-in sources that send history timing. */
const createHistorySource = (kind: "demo" | "analyser") => {
  if (kind === "demo")
    return { dispose() {}, visual: createDemoSignal().visual };
  const tap = createTestTap();

  return { dispose: tap.dispose, visual: tap.visual };
};

/** A real audio stream whose tracks count their stops. */
const createStream = () => {
  const context = getSharedAudioContext();

  if (!context) throw new Error("This page has no AudioContext");
  const { stream } = context.createMediaStreamDestination();
  let stopped = 0;

  for (const track of stream.getTracks()) {
    const stop = track.stop.bind(track);
    track.stop = () => {
      stopped += 1;
      stop();
    };
  }

  return { stopped: () => stopped, stream };
};

interface MediaDeviceSpec {
  deviceId: string;
  groupId: string;
  kind: MediaDeviceKind;
  label: string;
}

const requests: MediaStreamConstraints[] = [];

const streams: ReturnType<typeof createStream>[] = [];

const media = {
  /** Resolves the display capture that `hold` kept waiting. */
  pick: (): void => {},
  /** Resolves the microphone capture that `hold` kept waiting. */
  release: (): void => {},
  requests: requests,
  streams: streams,
  hold: false,
};

const nextStream = () => {
  const next = createStream();
  media.streams.push(next);

  return next.stream;
};

/** Replaces the browser's media devices with a scripted set. */
const mockMedia = (devices: MediaDeviceSpec[]) => {
  Object.defineProperty(navigator, "permissions", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      addEventListener() {},
      enumerateDevices: () => Promise.resolve(devices),
      getDisplayMedia: () =>
        new Promise<MediaStream>((resolve) => {
          media.pick = () => resolve(nextStream());
        }),
      getUserMedia: (constraints: MediaStreamConstraints) => {
        media.requests.push(constraints);

        if (!media.hold) return Promise.resolve(nextStream());

        return new Promise<MediaStream>((resolve) => {
          media.release = () => resolve(nextStream());
        });
      },
      removeEventListener() {},
    },
  });
};

const mediaCalls = { loads: 0, pauses: 0 };

/** Counts `load()` and `pause()` on every media element. */
const countMediaCalls = () => {
  const { load, pause } = HTMLMediaElement.prototype;

  HTMLMediaElement.prototype.load = function countedLoad() {
    mediaCalls.loads += 1;
    load.call(this);
  };

  HTMLMediaElement.prototype.pause = function countedPause() {
    mediaCalls.pauses += 1;
    pause.call(this);
  };
};

/** A short silent WAV the browser can load. */
const silentWavUrl = () => {
  const rate = 8000;
  const bytes = new DataView(new ArrayBuffer(44 + rate / 10));

  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1)
      bytes.setUint8(offset + index, value.charCodeAt(index));
  };

  text(0, "RIFF");
  bytes.setUint32(4, 36 + rate / 10, true);
  text(8, "WAVEfmt ");
  bytes.setUint32(16, 16, true);
  bytes.setUint16(20, 1, true);
  bytes.setUint16(22, 1, true);
  bytes.setUint32(24, rate, true);
  bytes.setUint32(28, rate, true);
  bytes.setUint16(32, 1, true);
  bytes.setUint16(34, 8, true);
  text(36, "data");
  bytes.setUint32(40, rate / 10, true);

  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
};

interface Watched {
  count: number;
  last?: unknown;
  stop: () => void;
}

interface Root {
  dispose: () => void;
  value?: unknown;
}

let heldFrame: FrameRequestCallback | undefined;

const watched = new Map<string, Watched>();

const collected = new Map<string, { frames: unknown[]; stop: () => void }>();

const roots = new Map<string, Root>();

const lab = {
  countMediaCalls,
  createFakeAudio,
  createHistorySource,
  createStream,
  media,
  mediaCalls,
  mockMedia,
  silentWavUrl,
  /** Runs `build` in its own reactive root, inside `context` when one is given. */
  mount<T>(key: string, build: () => T, context?: AudioContext) {
    roots.get(key)?.dispose();

    createRoot((dispose) => {
      const entry: Root = { dispose };
      roots.set(key, entry);

      if (!context) {
        entry.value = build();

        return;
      }

      const Probe = () => {
        entry.value = build();

        return null;
      };

      // Solid 2 builds a provider's children lazily. Reading them once from the
      // root body runs `build` but never the effects it creates, so an effect
      // of this root observes them instead; it runs on the next settle.
      const mounted = children(() => (
        <AudioContextProvider context={context}>
          <Probe />
        </AudioContextProvider>
      ));

      createCompatEffect(
        () => mounted.toArray(),
        () => {}
      );
    });
  },
  /** Reads what the mounted `build` returned. */
  use<T, R>(key: string, read: (value: T) => R): R {
    const entry = roots.get(key);

    if (!entry) throw new Error(`Nothing is mounted as ${key}`);

    // SAFETY: the caller names the type that its own `mount` returned.
    return read(entry.value as T);
  },
  unmount(key: string) {
    roots.get(key)?.dispose();
    roots.delete(key);
  },
  /** Lets queued effects, signal writes and promises run. */
  settle: () => new Promise<void>((resolve) => queueMicrotask(resolve)),
  signal: createSignal,
  /** Keeps a copy of the latest frame a source sent, since sources reuse buffers. */
  watch<T>(name: string, source: FrameSource<T>) {
    watched.get(name)?.stop();
    const entry: Watched = { count: 0, stop: () => {} };
    entry.stop = source.subscribe((frame) => {
      entry.count += 1;
      entry.last = structuredClone(frame);
    });
    watched.set(name, entry);
  },
  /** Keeps what `pick` reads from every frame a source sends. */
  collect<T, R>(name: string, source: FrameSource<T>, pick: (frame: T) => R) {
    collected.get(name)?.stop();
    const frames: unknown[] = [];

    const entry = {
      frames,
      stop: source.subscribe((frame) => frames.push(pick(frame))),
    };

    collected.set(name, entry);
  },
  /** Takes over frame scheduling: nothing runs until `tick` is called. */
  holdFrames() {
    window.requestAnimationFrame = (next) => {
      heldFrame = next;

      return 1;
    };

    window.cancelAnimationFrame = () => {
      heldFrame = undefined;
    };
  },
  /** Runs the held frame as if the browser painted at `nowMs`. */
  tick(nowMs: number) {
    heldFrame?.(nowMs);
  },
  lastFrame<R>(name: string): R | undefined {
    // SAFETY: the caller names what its own `collect` picked.
    return collected.get(name)?.frames.at(-1) as R | undefined;
  },
  stopCollecting(name: string) {
    collected.get(name)?.stop();
  },
  collectedFrames<R>(name: string): R[] {
    // SAFETY: the caller names what its own `collect` picked.
    return (collected.get(name)?.frames ?? []) as R[];
  },
  unwatch(name: string) {
    watched.get(name)?.stop();
  },
  seen<T>(name: string) {
    const entry = watched.get(name);

    // SAFETY: the caller names the frame type of the source it watched.
    return { count: entry?.count ?? 0, last: entry?.last as T };
  },
  resetSeen(name: string) {
    const entry = watched.get(name);

    if (entry) entry.count = 0;
  },
  lib: {
    createDemoMixer,
    createDemoSignal,
    createFrameEmitter,
    createFrameRelay,
    isChannelAudible,
    mixerReducer,
    useAudioDevices,
    useAudioPlayer,
    useClipHold,
    useDemoMixer,
    useDemoSignal,
    useFrameSource,
    useGainNode,
    useLevel,
    useMicrophone,
    useMixer,
    useSound,
    useSystemAudio,
  },
};

export type HookLab = typeof lab;

declare global {
  interface Window {
    lab: HookLab;
  }
}

export const HooksLabApp = () => {
  window.lab = lab;

  return <main>Hook lab</main>;
};
