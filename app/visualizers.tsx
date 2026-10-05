import { Show, createSignal } from "solid-js";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import type { BarVisualizerActions } from "@/components/ui/bar-visualizer";
import { ElectricBarVisualizer } from "@/components/ui/electric-bar-visualizer";
import type { ElectricBarVisualizerActions } from "@/components/ui/electric-bar-visualizer";
import { ElectricWaveform } from "@/components/ui/electric-waveform";
import type { ElectricWaveformActions } from "@/components/ui/electric-waveform";
import { LiveWaveform } from "@/components/ui/live-waveform";
import type { LiveWaveformActions } from "@/components/ui/live-waveform";
import { SmoothWaveform } from "@/components/ui/smooth-waveform";
import type { SmoothWaveformActions } from "@/components/ui/smooth-waveform";
import { Spectrum } from "@/components/ui/spectrum";
import type { VisualFrame } from "@/lib/audio/types";
import type { MutableRef } from "@/lib/solid/ref";

export const VisualizersApp = () => {
  const [mounted, setMounted] = createSignal(true);
  const [count, setCount] = createSignal(8);
  const [subscriptions, setSubscriptions] = createSignal(0);
  const listeners = new Set<(frame: VisualFrame) => void>();

  const source = {
    subscribe(listener: (frame: VisualFrame) => void) {
      listeners.add(listener);
      setSubscriptions(listeners.size);

      return () => {
        listeners.delete(listener);
        setSubscriptions(listeners.size);
      };
    },
  };

  const frame: VisualFrame = {
    bands: new Float32Array([0.3, 0.8, 0.4, 0.9]),
    history: new Float32Array([0.3, 0.8, 0.4, 0.9]),
    historyStart: 0,
    historyLength: 4,
    peakDb: -3,
    timeDomain: new Float32Array([0, 0.8, 0, -0.8, 0]),
  };

  const bars: MutableRef<BarVisualizerActions | null> = { current: null };
  const smooth: MutableRef<SmoothWaveformActions | null> = { current: null };
  const live: MutableRef<LiveWaveformActions | null> = { current: null };

  const electricBars: MutableRef<ElectricBarVisualizerActions | null> = {
    current: null,
  };

  const electricWave: MutableRef<ElectricWaveformActions | null> = {
    current: null,
  };

  const [actions, setActions] = createSignal("waiting");

  return (
    <main class="mx-auto w-full max-w-xl p-4">
      <h1>Visualizer contracts</h1>
      <Show when={mounted()}>
        <BarVisualizer source={source} barCount={count()} actionsRef={bars} />
        <SmoothWaveform source={source} actionsRef={smooth} />
        <LiveWaveform source={source} actionsRef={live} />
        <ElectricBarVisualizer source={source} actionsRef={electricBars} />
        <ElectricWaveform source={source} actionsRef={electricWave} />
        <Spectrum source={source} peakHold grid={false} />
      </Show>
      <button
        onClick={() => {
          for (const emit of listeners) emit(frame);
        }}
      >
        Paint signal
      </button>
      <button onClick={() => setCount(12)}>Change bar count</button>
      <button
        onClick={() => {
          bars.current?.paint([0.9]);
          smooth.current?.paint(frame);
          live.current?.paint(frame);
          electricBars.current?.paint([0.9]);
          electricWave.current?.paint(frame);
          setActions(
            electricBars.current && electricWave.current ? "ready" : "missing"
          );
        }}
      >
        Paint actions
      </button>
      <button
        onClick={() => {
          setMounted(false);
          queueMicrotask(() =>
            setActions(
              electricBars.current || electricWave.current
                ? "leaked"
                : "cleared"
            )
          );
        }}
      >
        Remove visualizers
      </button>
      <output data-testid="visual-subscriptions">{subscriptions()}</output>
      <output data-testid="electric-actions">{actions()}</output>
    </main>
  );
};
