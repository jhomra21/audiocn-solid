import { createMemo, createSignal } from "solid-js";

import {
  createAnalyserTap,
  createInputNode,
  disconnectFrom,
} from "@/hooks/use-audio-analyser";
import type {
  AnalyserInput,
  AnalyserTap,
  AnalyserTapOptions,
} from "@/hooks/use-audio-analyser";
import { useAudioContext } from "@/hooks/use-audio-context";
import { isChannelAudible } from "@/hooks/use-mixer";
import type { Mixer, MixerState } from "@/hooks/use-mixer";
import { dbToGain } from "@/lib/audio/decibels";
import { createFrameRelay } from "@/lib/audio/frame-source";
import type { FrameRelay } from "@/lib/audio/frame-source";
import type { FrameSource, MeterFrame, VisualFrame } from "@/lib/audio/types";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

const RAMP_SECONDS = 0.005;

const DUCK_HOLD_SECONDS = 0.2;

const MS_PER_SECOND = 1000;

const TIME_CONSTANTS_PER_RAMP = 3;

export interface DuckingOptions {
  trigger: string;
  targets: string[];
  thresholdDb?: number;
  amountDb?: number;
  attackMs?: number;
  releaseMs?: number;
}

type MixerInputs = Record<string, AnalyserInput | undefined>;

export interface WebAudioMixerOptions {
  inputs: MixerInputs;
  ducking?: DuckingOptions | DuckingOptions[];
  limiter?: boolean;
  analyser?: Pick<
    AnalyserTapOptions,
    "fftSize" | "bands" | "historySize" | "smoothing"
  >;
  enabled?: boolean;
}

export interface WebAudioMixerGraph {
  readonly meters: Record<string, FrameSource<MeterFrame>>;
  readonly visuals: Record<string, FrameSource<VisualFrame>>;
  master: { meter: FrameSource<MeterFrame>; visual: FrameSource<VisualFrame> };
  readonly output: MediaStream | null;
  readonly destination: AudioNode | null;
  readonly context: AudioContext | null;
}

interface Relays {
  meter: FrameRelay<MeterFrame>;
  visual: FrameRelay<VisualFrame>;
}

interface Core {
  context: AudioContext;
  masterGain: GainNode;
  monitorGain: GainNode;
  output: MediaStreamAudioDestinationNode;
  tap: AnalyserTap;
  dispose: () => void;
}

interface Strip {
  input: Exclude<AnalyserInput, null>;
  gain: GainNode;
  duck: GainNode;
  panner: StereoPannerNode;
  monitorSend: GainNode;
  tap: AnalyserTap;
  dispose: () => void;
}

const ramp = (param: AudioParam, value: number, context: BaseAudioContext) =>
  param.setTargetAtTime(value, context.currentTime, RAMP_SECONDS);

const buildCore = (
  context: AudioContext,
  limiterEnabled: boolean,
  analyser: AnalyserTapOptions
): Core => {
  const masterGain = context.createGain();
  masterGain.gain.value = 0;
  const output = context.createMediaStreamDestination();
  const limiter = limiterEnabled ? context.createDynamicsCompressor() : null;

  if (limiter) {
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.05;
  }

  let last: AudioNode = masterGain;

  if (limiter) {
    masterGain.connect(limiter);
    last = limiter;
  }

  last.connect(output);
  const monitorGain = context.createGain();
  monitorGain.gain.value = 0;
  monitorGain.connect(context.destination);

  const tap = createAnalyserTap(context, last, {
    ...analyser,
    channels: "stereo",
  });

  return {
    context,
    masterGain,
    monitorGain,
    output,
    tap,
    dispose() {
      tap.dispose();
      masterGain.disconnect();
      limiter?.disconnect();
      monitorGain.disconnect();
      output.disconnect();

      for (const track of output.stream.getTracks()) track.stop();
    },
  };
};

const buildStrip = (
  core: Core,
  input: Exclude<AnalyserInput, null>,
  analyser: AnalyserTapOptions
): Strip => {
  const { context } = core;
  const { node, owned } = createInputNode(context, input);
  const takesOverElement = input instanceof HTMLMediaElement;

  if (takesOverElement) disconnectFrom(node, context.destination);
  const gain = context.createGain();
  const duck = context.createGain();
  const panner = context.createStereoPanner();
  const monitorSend = context.createGain();
  gain.gain.value = 0;
  monitorSend.gain.value = 0;
  node.connect(gain);
  gain.connect(duck);
  duck.connect(panner);
  panner.connect(core.masterGain);
  panner.connect(monitorSend);
  monitorSend.connect(core.monitorGain);

  const tap = createAnalyserTap(context, panner, {
    ...analyser,
    channels: "stereo",
  });

  return {
    input,
    gain,
    duck,
    panner,
    monitorSend,
    tap,
    dispose() {
      tap.dispose();
      disconnectFrom(node, gain);
      gain.disconnect();
      duck.disconnect();
      panner.disconnect();
      monitorSend.disconnect();

      if (owned) node.disconnect();

      if (takesOverElement) node.connect(context.destination);
    },
  };
};

const loudestPeak = (frame: MeterFrame) => {
  let loudest = Number.NEGATIVE_INFINITY;

  for (const level of frame.channels) loudest = Math.max(loudest, level.peakDb);

  return loudest;
};

/** Owns audio edges and stable frame relays, not Solid state. */
const createMixerGraph = () => {
  const relays = new Map<string, Relays>();
  const strips = new Map<string, Strip>();

  const master: Relays = {
    meter: createFrameRelay<MeterFrame>(),
    visual: createFrameRelay<VisualFrame>(),
  };

  let core: Core | null = null;
  let analyser: AnalyserTapOptions = {};
  let state: MixerState | null = null;
  let lastInputs: MixerInputs = {};

  const relaysFor = (id: string): Relays => {
    let entry = relays.get(id);

    if (!entry) {
      entry = {
        meter: createFrameRelay<MeterFrame>(),
        visual: createFrameRelay<VisualFrame>(),
      };
      relays.set(id, entry);
    }

    return entry;
  };

  const removeStrip = (id: string) => {
    strips.get(id)?.dispose();
    strips.delete(id);
    const entry = relays.get(id);
    entry?.meter.setSource(null);
    entry?.visual.setSource(null);
  };

  const apply = () => {
    if (!(core && state)) return;

    for (const channel of state.channels) {
      const strip = strips.get(channel.id);

      if (!strip) continue;
      ramp(
        strip.gain.gain,
        isChannelAudible(state, channel.id) ? dbToGain(channel.gainDb) : 0,
        core.context
      );
      ramp(strip.panner.pan, channel.pan, core.context);
      ramp(strip.monitorSend.gain, channel.monitor ? 1 : 0, core.context);
    }

    const level = state.master.muted ? 0 : dbToGain(state.master.gainDb);
    ramp(core.masterGain.gain, level, core.context);
    ramp(core.monitorGain.gain, level, core.context);
  };

  const reconcile = (inputs: MixerInputs) => {
    lastInputs = inputs;

    if (!core) return;

    for (const [id, strip] of strips)
      if (inputs[id] !== strip.input) removeStrip(id);

    for (const [id, input] of Object.entries(inputs)) {
      if (!input || strips.has(id)) continue;
      const strip = buildStrip(core, input, analyser);
      strips.set(id, strip);
      const entry = relaysFor(id);
      entry.meter.setSource(strip.tap.meter);
      entry.visual.setSource(strip.tap.visual);
    }

    apply();
  };

  const duck = (rules: DuckingOptions[]) => {
    const unsubscribers = rules.map((rule) => {
      const attack =
        (rule.attackMs ?? 50) / MS_PER_SECOND / TIME_CONSTANTS_PER_RAMP;

      const release =
        (rule.releaseMs ?? 400) / MS_PER_SECOND / TIME_CONSTANTS_PER_RAMP;

      return relaysFor(rule.trigger).meter.subscribe((frame) => {
        if (!core || loudestPeak(frame) < (rule.thresholdDb ?? -35)) return;
        const now = core.context.currentTime;

        for (const target of rule.targets) {
          const param = strips.get(target)?.duck.gain;

          if (!param) continue;
          param.cancelScheduledValues(now);
          param.setTargetAtTime(dbToGain(rule.amountDb ?? -12), now, attack);
          param.setTargetAtTime(1, now + DUCK_HOLD_SECONDS, release);
        }
      });
    });

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();

      if (core)
        for (const strip of strips.values()) {
          strip.duck.gain.cancelScheduledValues(core.context.currentTime);
          ramp(strip.duck.gain, 1, core.context);
        }
    };
  };

  return {
    master,
    relaysFor,
    reconcile,
    duck,
    apply(next: MixerState) {
      state = next;
      apply();
    },
    start(
      context: AudioContext,
      options: { limiter: boolean; analyser: AnalyserTapOptions }
    ) {
      analyser = options.analyser;
      core = buildCore(context, options.limiter, analyser);
      master.meter.setSource(core.tap.meter);
      master.visual.setSource(core.tap.visual);
      reconcile(lastInputs);

      return core;
    },
    stop() {
      for (const id of strips.keys()) removeStrip(id);
      master.meter.setSource(null);
      master.visual.setSource(null);
      core?.dispose();
      core = null;
    },
  };
};

/** Reactive graph ownership with stable meters across channel changes and graph rebuilds. */
export const useWebAudioMixer = (
  mixer: Mixer,
  options: MaybeAccessor<WebAudioMixerOptions>
): WebAudioMixerGraph => {
  const { context } = useAudioContext();
  const read = () => readMaybeAccessor(options);
  const graph = createMixerGraph();
  const [core, setCore] = createSignal<Core | null>(null);

  const settingsKey = createMemo(() => {
    const current = read();

    return JSON.stringify({
      enabled: current.enabled ?? true,
      limiter: current.limiter ?? true,
      fftSize: current.analyser?.fftSize,
      bands: current.analyser?.bands,
      historySize: current.analyser?.historySize,
      smoothing: current.analyser?.smoothing,
    });
  });

  createCompatEffect(settingsKey, () => {
    const current = read();

    if (!(context && (current.enabled ?? true))) return;
    setCore(
      graph.start(context, {
        limiter: current.limiter ?? true,
        analyser: current.analyser ?? {},
      })
    );

    return () => {
      graph.stop();
      setCore(null);
    };
  });
  createCompatEffect(() => {
    const inputs = read().inputs;
    const wanted: MixerInputs = {};

    for (const channel of mixer.channels)
      wanted[channel.id] = inputs[channel.id];

    return wanted;
  }, graph.reconcile);
  createCompatEffect(() => mixer.state, graph.apply);
  const duckingKey = createMemo(() => JSON.stringify(read().ducking ?? []));
  createCompatEffect(duckingKey, () => {
    const rules = read().ducking;

    return graph.duck(rules ? (Array.isArray(rules) ? rules : [rules]) : []);
  });

  const sources = createMemo(() => {
    const meters: WebAudioMixerGraph["meters"] = {};
    const visuals: WebAudioMixerGraph["visuals"] = {};

    for (const channel of mixer.channels) {
      const relays = graph.relaysFor(channel.id);
      meters[channel.id] = relays.meter;
      visuals[channel.id] = relays.visual;
    }

    return { meters, visuals };
  });

  return {
    master: graph.master,
    get context() {
      return core()?.context ?? null;
    },
    get destination() {
      return core()?.masterGain ?? null;
    },
    get output() {
      return core()?.output.stream ?? null;
    },
    get meters() {
      return sources().meters;
    },
    get visuals() {
      return sources().visuals;
    },
  };
};
