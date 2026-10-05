import { For } from "solid-js";

import { ElectricWaveform } from "@/components/ui/electric-waveform";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const modes = ["wave", "scope"] as const;

const ElectricWaveformModes = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 4 });

  return (
    <div class="grid w-full max-w-lg gap-6">
      <For each={modes}>
        {(mode) => (
          <div class="grid gap-2">
            <ElectricWaveform
              aria-label={`Voice, ${mode}`}
              class="text-primary h-24"
              mode={mode}
              source={signal.visual}
            />
            <span class="text-muted-foreground text-center font-mono text-xs">
              {mode}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

export default ElectricWaveformModes;
