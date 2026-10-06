import { Show, createMemo, createSignal } from "solid-js";

import {
  ElectricBarVisualizer,
  createElectricScene,
  layoutElectricBars,
} from "@/components/ui/electric-bar-visualizer";
import type { ElectricScene } from "@/components/ui/electric-bar-visualizer";
import {
  ElectricWaveform,
  createElectricTrace,
} from "@/components/ui/electric-waveform";
import type { ElectricTrace } from "@/components/ui/electric-waveform";
import type { ElectricWaveformActions } from "@/components/ui/electric-waveform";
import { LiveWaveform } from "@/components/ui/live-waveform";
import type { LiveWaveformActions } from "@/components/ui/live-waveform";
import { SmoothWaveform } from "@/components/ui/smooth-waveform";
import type { SmoothWaveformActions } from "@/components/ui/smooth-waveform";
import { Spectrum, SpectrumCanvas } from "@/components/ui/spectrum";
import { createDemoSignal } from "@/hooks/use-demo-signal";
import type { DemoSignalKind } from "@/hooks/use-demo-signal";
import { createFrameEmitter, createFrameRelay } from "@/lib/audio/frame-source";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";
import type { JSXElement } from "@/lib/solid/jsx-types";
import type { MutableRef } from "@/lib/solid/ref";

/** A serializable `VisualFrame`; times are on the page clock, which starts at 0. */
export interface FrameSpec {
  bands?: number[];
  history?: number[];
  intervalMs?: number | null;
  length?: number;
  peakDb?: number;
  previousLevel?: number;
  start?: number;
  updatedAt?: number | null;
}

export type SourceName = "none" | "first" | "second" | "demo" | "relay";

export interface PainterProps {
  fadeEdges?: boolean;
  intensity?: number;
  lineWidth?: number;
  mode?: "scrolling" | "static";
  sensitivity?: number;
  source?: SourceName;
  variant?: "bars" | "line" | "mirror";
}

export interface PaintersHarness {
  /** Replaces the frame that `paint` and `emit` send. */
  frame: (spec?: FrameSpec) => void;
  /** Changes the current frame in place, as a source reusing one buffer does. */
  patch: (spec: FrameSpec) => void;
  paint: () => void;
  clear: () => void;
  emit: (source: "first" | "second") => void;
  /** Gives the relay the demo signal, once the painter is already running. */
  connectRelay: () => void;
  setProps: (props: PainterProps) => void;
  setLevels: (levels: number[] | undefined) => void;
  unmount: () => void;
  /** The scene and trace builders, so their moving parts can be stepped by hand. */
  electric: {
    createElectricScene: typeof createElectricScene;
    createElectricTrace: typeof createElectricTrace;
    layoutElectricBars: typeof layoutElectricBars;
    /** Steps a scene through frames 1..`frames`, each 16 ms apart. */
    runScene: (
      scene: ElectricScene,
      levelsAt: (frame: number) => number[],
      frames: number
    ) => void;
    /** Steps a trace the same way and reports whether it ended active. */
    runTrace: (
      trace: ElectricTrace,
      frameAt: (frame: number) => VisualFrame | null,
      frames: number
    ) => boolean;
    traceGeometry: { height: number; lineWidth: number; width: number };
    frameMs: number;
  };
}

declare global {
  interface Window {
    painters: PaintersHarness;
  }
}

const params = new URLSearchParams(location.search);

const sized = () => ({
  height: params.has("height") ? `${params.get("height")}px` : undefined,
  width: params.has("width") ? `${params.get("width")}px` : undefined,
});

const DEMO_KINDS = ["speech", "music", "tone", "noise", "silence"];

const isDemoKind = (kind: string | null): kind is DemoSignalKind =>
  kind !== null && DEMO_KINDS.includes(kind);

const SOURCE_NAMES = ["none", "first", "second", "demo", "relay"];

const isSourceName = (name: string | null): name is SourceName =>
  name !== null && SOURCE_NAMES.includes(name);

const FRAME_INTERVAL_MS = 50;

const FRAME_MS = 16;

const traceGeometry = { height: 80, lineWidth: 3, width: 256 };

const runScene = (
  scene: ElectricScene,
  levelsAt: (frame: number) => number[],
  frames: number
) => {
  const layout = layoutElectricBars(200, 80, {
    align: "end",
    barCount: 4,
    barGap: 4,
    barWidth: 6,
    orientation: "horizontal",
  });

  for (let frame = 1; frame <= frames; frame += 1) {
    scene.step(frame * FRAME_MS, Float32Array.from(levelsAt(frame)), layout);
  }
};

const runTrace = (
  trace: ElectricTrace,
  frameAt: (frame: number) => VisualFrame | null,
  frames: number
) => {
  let active = false;

  for (let frame = 1; frame <= frames; frame += 1) {
    active = trace.step(frame * FRAME_MS, frameAt(frame), traceGeometry);
  }

  return active;
};

const buildFrame = (spec: FrameSpec): VisualFrame => {
  const frame: VisualFrame = {
    bands: Float32Array.from(spec.bands ?? [0.5]),
    history: Float32Array.from(
      spec.history ?? [0.25, 0.5, 0.75, 1, 0, 0, 0, 0]
    ),
    historyLength: spec.length ?? 4,
    historyStart: spec.start ?? 0,
    peakDb: spec.peakDb ?? -12,
  };

  if (spec.intervalMs !== null) {
    frame.historyIntervalMs = spec.intervalMs ?? FRAME_INTERVAL_MS;
  }

  if (spec.updatedAt !== null) {
    frame.historyUpdatedAt = spec.updatedAt ?? 0;
  }

  if (spec.previousLevel !== undefined) {
    frame.historyPreviousLevel = spec.previousLevel;
  }

  return frame;
};

const applyPatch = (frame: VisualFrame, spec: FrameSpec) => {
  if (spec.history) {
    spec.history.forEach((level, index) => {
      frame.history[index] = level;
    });
  }

  if (spec.length !== undefined) frame.historyLength = spec.length;

  if (spec.start !== undefined) frame.historyStart = spec.start;

  if (spec.updatedAt !== undefined && spec.updatedAt !== null) {
    frame.historyUpdatedAt = spec.updatedAt;
  }

  if (spec.previousLevel !== undefined) {
    frame.historyPreviousLevel = spec.previousLevel;
  }
};

export const PaintersApp = () => {
  const initialSource = params.get("source");

  const initialLevels = params.get("levels");

  const [props, setProps] = createSignal<PainterProps>({
    intensity: params.has("intensity")
      ? Number(params.get("intensity"))
      : undefined,
    source: isSourceName(initialSource) ? initialSource : undefined,
  });

  const [mounted, setMounted] = createSignal(true);

  const [levels, setLevels] = createSignal<number[] | undefined>(
    initialLevels?.split(",").map(Number)
  );

  let current = buildFrame({});

  const emitters = {
    first: createFrameEmitter<VisualFrame>(),
    second: createFrameEmitter<VisualFrame>(),
  };

  const demoKind = params.get("demo");

  const demo = createDemoSignal({
    kind: isDemoKind(demoKind) ? demoKind : undefined,
  });

  const relay = createFrameRelay<VisualFrame>();

  const sources: Record<SourceName, FrameSource<VisualFrame> | undefined> = {
    demo: demo.visual,
    first: emitters.first,
    none: undefined,
    relay,
    second: emitters.second,
  };

  // Each prop is its own memo, so changing one never re-notifies the others.
  const prop = <Key extends keyof PainterProps>(key: Key) =>
    createMemo(() => props()[key]);

  const fadeEdges = prop("fadeEdges");
  const intensity = prop("intensity");
  const lineWidth = prop("lineWidth");
  const mode = prop("mode");
  const sensitivity = prop("sensitivity");
  const variant = prop("variant");
  const sourceName = prop("source");

  const source = createMemo(() => {
    const name = sourceName() ?? "none";

    return name === "none" ? null : sources[name];
  });

  const live: MutableRef<LiveWaveformActions | null> = { current: null };
  const smooth: MutableRef<SmoothWaveformActions | null> = { current: null };

  const electricWave: MutableRef<ElectricWaveformActions | null> = {
    current: null,
  };

  const actions = () => [live.current, smooth.current, electricWave.current];

  window.painters = {
    clear: () => {
      for (const target of actions()) target?.clear();
    },
    connectRelay: () => relay.setSource(demo.visual),
    electric: {
      createElectricScene,
      createElectricTrace,
      frameMs: FRAME_MS,
      layoutElectricBars,
      runScene,
      runTrace,
      traceGeometry,
    },
    emit: (name) => emitters[name].emit(current),
    frame: (spec = {}) => {
      current = buildFrame(spec);
    },
    paint: () => {
      for (const target of actions()) target?.paint(current);
    },
    patch: (spec) => applyPatch(current, spec),
    setLevels,
    setProps: (next) => setProps({ ...props(), ...next }),
    unmount: () => setMounted(false),
  };

  const renderCase = (name: string | null): JSXElement => {
    switch (name) {
      case "electric-bars": {
        return (
          <ElectricBarVisualizer
            aria-label="Voice"
            align={params.has("align") ? "end" : undefined}
            barCount={
              params.has("barCount") ? Number(params.get("barCount")) : 4
            }
            intensity={intensity()}
            levels={levels()}
            loading={params.has("loading")}
          />
        );
      }

      case "electric-wave": {
        return (
          <ElectricWaveform
            aria-label="Voice"
            actionsRef={electricWave}
            fadeEdges={fadeEdges()}
            intensity={intensity()}
            lineWidth={lineWidth()}
            loading={params.has("loading")}
            mode={params.has("scope") ? "scope" : undefined}
            source={source()}
          />
        );
      }

      case "live": {
        return (
          <LiveWaveform
            actionsRef={live}
            fadeEdges={false}
            mode={mode() ?? "scrolling"}
            sensitivity={sensitivity()}
            source={source()}
            style={sized()}
            variant={variant()}
          />
        );
      }

      case "smooth": {
        return (
          <SmoothWaveform
            aria-label="Voice"
            actionsRef={smooth}
            fadeEdges={fadeEdges()}
            lineWidth={lineWidth()}
            loading={params.has("loading")}
            mode={params.has("scope") ? "scope" : undefined}
            source={source()}
          />
        );
      }

      case "spectrum": {
        return (
          <Spectrum source={emitters.first}>
            <SpectrumCanvas />
            <SpectrumCanvas />
          </Spectrum>
        );
      }

      default: {
        return null;
      }
    }
  };

  return (
    <main class="p-4">
      <Show when={mounted()}>{renderCase(params.get("case"))}</Show>
    </main>
  );
};
