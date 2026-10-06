import { Show, createSignal, onCleanup } from "solid-js";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { ChannelStrip } from "@/components/ui/channel-strip";
import { ClipIndicator } from "@/components/ui/clip-indicator";
import type { ClipIndicatorActions } from "@/components/ui/clip-indicator";
import { DbReadout } from "@/components/ui/db-readout";
import { DbScale } from "@/components/ui/db-scale";
import { LevelMeter, LevelMeterValue } from "@/components/ui/level-meter";
import type { LevelMeterActions } from "@/components/ui/level-meter";
import type { BallisticsInput } from "@/lib/audio/ballistics";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame, VisualFrame } from "@/lib/audio/types";
import type { JSXElement } from "@/lib/solid/jsx-types";
import type { MutableRef } from "@/lib/solid/ref";

export interface MetersHarness {
  /** Pushes a frame to the readout and the meter that read from a source. */
  emitMeter: (frame: MeterFrame) => void;
  /** Pushes a frame to the bar visualizer that reads from a source. */
  emitVisual: (frame: VisualFrame) => void;
  paintMeter: (frame: MeterFrame) => void;
  reportClip: (target: "count" | "hold", db: number) => void;
  setBallistics: (ballistics: BallisticsInput | undefined) => void;
  setLevels: (levels: number[] | undefined) => void;
  setPeak: (peakDb: number | undefined) => void;
  /** A level shows the readout declaratively; `undefined` returns it to its source. */
  setReadout: (value: number | undefined) => void;
  setStripMeter: (present: boolean) => void;
}

declare global {
  interface Window {
    meters: MetersHarness;
  }
}

const params = new URLSearchParams(location.search);

const numberParam = (name: string) => {
  const value = params.get(name);

  return value === null ? undefined : Number(value);
};

const meterEmitter = createFrameEmitter<MeterFrame>();

const visualEmitter = createFrameEmitter<VisualFrame>();

const ScaleCase = () => (
  <div class="grid gap-6">
    <div data-testid="scale-default" style={{ width: "200px" }}>
      <DbScale maxDb={0} minDb={-24} />
    </div>
    <div data-testid="scale-thin" style={{ width: "100px" }}>
      <DbScale ticks={[0, -6, -12, -54, -60]} />
    </div>
    <div data-testid="scale-custom" style={{ width: "200px" }}>
      <DbScale ticks={[-3, -9]} />
    </div>
  </div>
);

/** Its parent updates every 100 ms and hands it a new `format` each time. */
const BusyCase = () => {
  const [ticks, setTicks] = createSignal(0);

  const timer = setInterval(() => setTicks((value) => value + 1), 100);
  onCleanup(() => clearInterval(timer));

  const format = () => {
    ticks();

    return (db: number) => `${db.toFixed(1)} dB`;
  };

  return (
    <DbReadout data-ticks={ticks()} format={format()} source={meterEmitter} />
  );
};

export const MetersApp = () => {
  const [peak, setPeak] = createSignal(numberParam("peak"));

  const [ballistics, setBallistics] = createSignal<BallisticsInput | undefined>(
    undefined
  );

  const [levels, setLevels] = createSignal<number[] | undefined>(undefined);
  const [readout, setReadout] = createSignal<number | undefined>(undefined);
  const [stripMeter, setStripMeter] = createSignal(true);
  const meter: MutableRef<LevelMeterActions | null> = { current: null };
  const countClip: MutableRef<ClipIndicatorActions | null> = { current: null };
  const holdClip: MutableRef<ClipIndicatorActions | null> = { current: null };

  window.meters = {
    emitMeter: (frame) => meterEmitter.emit(frame),
    emitVisual: (frame) => visualEmitter.emit(frame),
    paintMeter: (frame) => meter.current?.paint(frame),
    reportClip: (target, db) =>
      (target === "count" ? countClip : holdClip).current?.report(db),
    setBallistics,
    setLevels,
    setPeak,
    setReadout,
    setStripMeter,
  };

  const fromSource = params.has("source");

  const renderCase = (name: string | null): JSXElement => {
    switch (name) {
      case "bars": {
        return (
          <BarVisualizer
            barCount={numberParam("barCount")}
            idle={params.has("idle") ? "pulse" : undefined}
            levels={levels()}
            minLevel={numberParam("minLevel")}
            source={fromSource ? visualEmitter : undefined}
          />
        );
      }

      case "busy": {
        return <BusyCase />;
      }

      case "clip": {
        return (
          <div class="flex gap-4">
            <div data-testid="clip-count">
              <ClipIndicator actionsRef={countClip} showCount />
            </div>
            <div data-testid="clip-hold">
              <ClipIndicator actionsRef={holdClip} holdMs={500} />
            </div>
            <div data-testid="clip-controlled">
              <ClipIndicator clipping />
            </div>
          </div>
        );
      }

      case "meter": {
        return (
          <>
            <LevelMeter
              actionsRef={meter}
              aria-label="Mic"
              ballistics={ballistics()}
              orientation={
                params.get("orientation") === "vertical"
                  ? "vertical"
                  : undefined
              }
              peakDb={fromSource ? undefined : peak()}
              source={fromSource ? meterEmitter : undefined}
              style={
                params.has("fill")
                  ? { "--meter-fill": "var(--meter-warn)" }
                  : {}
              }
            >
              {params.has("value") ? <LevelMeterValue /> : undefined}
            </LevelMeter>
            <div style={{ height: "3000px" }} />
          </>
        );
      }

      case "readout": {
        return (
          <div class="grid gap-2">
            <div data-testid="declared">
              <DbReadout value={-6} />
            </div>
            <div data-testid="live">
              <DbReadout
                source={readout() === undefined ? meterEmitter : null}
                value={readout()}
              />
            </div>
          </div>
        );
      }

      case "scale": {
        return <ScaleCase />;
      }

      case "strip": {
        return (
          <ChannelStrip>
            <Show when={stripMeter()}>
              <div data-clipping="" data-slot="level-meter" />
            </Show>
          </ChannelStrip>
        );
      }

      default: {
        return null;
      }
    }
  };

  return <main class="p-4">{renderCase(params.get("case"))}</main>;
};
