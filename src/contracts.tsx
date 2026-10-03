import { createSignal } from "solid-js";

import { ClipIndicator } from "@/components/ui/clip-indicator";
import type {
  ClipIndicatorActions,
  ClipIndicatorClickEvent,
} from "@/components/ui/clip-indicator";
import { DbReadout } from "@/components/ui/db-readout";
import { DbScale, DbScaleTick } from "@/components/ui/db-scale";
import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterTrack,
  LevelMeterValue,
} from "@/components/ui/level-meter";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";

const ReadoutSwitch = () => {
  const source = createFrameEmitter<MeterFrame>();
  const [mode, setMode] = createSignal<"source" | "value">("source");

  return (
    <section data-contract="readout-switch">
      <DbReadout
        intervalMs={25}
        source={mode() === "source" ? source : null}
        value={mode() === "value" ? -6 : undefined}
      />
      <button data-testid="emit-readout" onClick={() => source.emit({ channels: [{ peakDb: -12 }] })} type="button">
        Emit
      </button>
      <button data-testid="use-value" onClick={() => setMode("value")} type="button">
        Value
      </button>
      <button data-testid="use-source" onClick={() => setMode("source")} type="button">
        Source
      </button>
    </section>
  );
};

const PreventedClip = () => {
  let actions: ClipIndicatorActions | null = null;

  return (
    <section data-contract="prevented-clip">
      <ClipIndicator
        actionsRef={(next) => {
          actions = next;
        }}
        holdMs={Number.POSITIVE_INFINITY}
        onClick={(event: ClipIndicatorClickEvent) => event.preventBaseUIHandler()}
        showCount
      />
      <button data-testid="report-clip" onClick={() => actions?.report(0)} type="button">
        Report
      </button>
    </section>
  );
};

export const ContractApp = () => {
  const reducedMotion = useReducedMotion();

  return (
    <main data-runtime-contracts>
      <section data-contract="value-floor">
        <LevelMeter peakDb={-50}>
          <LevelMeterValue floorDb={-40} />
        </LevelMeter>
      </section>

      <section data-contract="readout-overrides">
        <DbReadout data-slot="custom-readout" data-zone="mine" role="status" value={-6} />
      </section>

      <section data-contract="scale-style">
        <DbScale>
          <DbScaleTick style="color: red" value={-6} />
        </DbScale>
      </section>

      <section data-contract="ignored-children">
        <LevelMeter peakDb={-20}>
          <LevelMeterChannels>
            <LevelMeterChannel>
              <LevelMeterTrack>
                <LevelMeterBar>BAR-CHILD</LevelMeterBar>
                <LevelMeterHold>HOLD-CHILD</LevelMeterHold>
              </LevelMeterTrack>
            </LevelMeterChannel>
          </LevelMeterChannels>
        </LevelMeter>
      </section>

      <section data-contract="meter-overrides">
        <LevelMeter
          aria-valuemin={-100}
          data-slot="custom-meter"
          peakDb={-20}
          role="progressbar"
        />
      </section>

      <PreventedClip />

      <section data-contract="custom-render">
        <ClipIndicator
          render={(renderProps, state) => {
            const children = renderProps.children;
            const forwarded = { ...renderProps };
            delete forwarded.children;
            return (
              <div
                {...(forwarded as any)}
                data-render-state={state.clipping ? "clip" : "idle"}
              >
                {children}
              </div>
            );
          }}
        />
      </section>

      <ReadoutSwitch />

      <span data-testid="reduced-motion">
        {reducedMotion() ? "reduce" : "no-preference"}
      </span>
    </main>
  );
};
