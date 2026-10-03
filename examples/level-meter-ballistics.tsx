import { For } from "solid-js";

import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const presets = ["peak", "vu", "instant"] as const;

export const LevelMeterBallistics = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 3 });

  return (
    <div className="grid w-full max-w-md gap-4">
      <For each={presets}>
        {(preset) => (
          <div className="grid grid-cols-[4rem_1fr] items-center gap-3">
            <span className="text-muted-foreground font-mono text-xs">{preset}</span>
            <LevelMeter aria-label={`${preset} ballistics`} ballistics={preset} source={signal.meter} />
          </div>
        )}
      </For>
    </div>
  );
};
