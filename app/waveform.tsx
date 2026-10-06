import { Show, createSignal } from "solid-js";

import WaveformDemo from "@/components/examples/waveform-demo";
import {
  Waveform,
  WaveformCanvas,
  WaveformCursor,
  WaveformHover,
  WaveformMarker,
  WaveformRegion,
} from "@/components/ui/waveform";
import type { WaveformRegionValue } from "@/components/ui/waveform";
import { useWaveformData } from "@/hooks/use-waveform-data";
import { createFrameEmitter } from "@/lib/audio/frame-source";

const PEAKS = [0.2, 0.6, 1, 0.6, 0.2];

const WaveformDataCase = () => {
  const waveform = useWaveformData("song.mp3");

  return <output data-testid="waveform-status">{waveform.status}</output>;
};

const HoverCase = () => {
  const [loading, setLoading] = createSignal(false);

  return (
    <main class="grid gap-4 p-6">
      <Waveform duration={100} loading={loading()} peaks={PEAKS}>
        <WaveformHover />
      </Waveform>
      <button onClick={() => setLoading(!loading())}>Toggle loading</button>
    </main>
  );
};

export const WaveformApp = () => {
  const testCase = new URLSearchParams(location.search).get("case");

  if (testCase === "hover") return <HoverCase />;

  if (testCase === "data-without-web-audio") return <WaveformDataCase />;

  if (new URLSearchParams(location.search).has("demo"))
    return (
      <main class="p-6">
        <WaveformDemo />
      </main>
    );
  const [mounted, setMounted] = createSignal(true);
  const [interactive, setInteractive] = createSignal(true);
  const [committed, setCommitted] = createSignal<number | null>(null);

  const [region, setRegion] = createSignal<WaveformRegionValue>({
    start: 20,
    end: 40,
  });

  const [subscriptions, setSubscriptions] = createSignal(0);
  const emitter = createFrameEmitter<number>();

  const source = {
    subscribe(listener: (time: number) => void) {
      setSubscriptions((count) => count + 1);
      const dispose = emitter.subscribe(listener);

      return () => {
        dispose();
        setSubscriptions((count) => count - 1);
      };
    },
  };

  const peaks = new Float32Array(
    Array.from(
      { length: 128 },
      (_, index) => 0.2 + Math.abs(Math.sin(index * 0.3)) * 0.7
    )
  );

  return (
    <main class="mx-auto grid max-w-xl gap-6 p-6">
      <h1>Waveform contracts</h1>
      <Show when={mounted()}>
        <Waveform
          aria-label="Clip waveform"
          peaks={peaks}
          duration={120}
          time={source}
          interactive={interactive()}
          onSeekCommitted={setCommitted}
        >
          <WaveformCanvas />
          <WaveformCursor />
          <WaveformHover />
          <WaveformRegion
            start={region().start}
            end={region().end}
            onValueChange={setRegion}
          />
          <WaveformMarker time={90}>Outro</WaveformMarker>
        </Waveform>
      </Show>
      <output data-testid="committed-time">{committed() ?? "none"}</output>
      <output data-testid="region">
        {region().start}/{region().end}
      </output>
      <output data-testid="waveform-subscribers">{subscriptions()}</output>
      <button onClick={() => emitter.emit(30)}>Emit playhead</button>
      <button onClick={() => setInteractive(false)}>Disable seeking</button>
      <button onClick={() => setMounted(false)}>Remove waveform</button>
    </main>
  );
};
