import { For } from "solid-js";

import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const presets = ["peak", "vu", "instant"] as const;

export const LevelMeterBallistics = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 3 });

  return (
    <div class="grid w-full max-w-md gap-4">
      <For each={presets}>
        {(preset) => (
          <div class="grid grid-cols-[4rem_1fr] items-center gap-3">
            <span class="text-muted-foreground font-mono text-xs">
              {preset}
            </span>
            <LevelMeter
              aria-label={`${preset} ballistics`}
              ballistics={preset}
              source={signal.meter}
            />
          </div>
        )}
      </For>
    </div>
  );
};
