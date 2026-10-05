import { For } from "solid-js";

import { ElectricBarVisualizer } from "@/components/ui/electric-bar-visualizer";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const colors = [
  { class: "text-primary", label: "primary" },
  { class: "text-meter-ok", label: "meter-ok" },
  { class: "text-channel-solo", label: "channel-solo" },
  { class: "text-destructive", label: "destructive" },
] as const;

const ElectricBarVisualizerColors = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 3 });

  return (
    <div class="grid w-full max-w-lg grid-cols-2 gap-6 sm:grid-cols-4">
      <For each={colors}>
        {(color) => (
          <div class="grid gap-2">
            <ElectricBarVisualizer
              align="end"
              aria-label={`Bars in ${color.label}`}
              barCount={9}
              class={`h-20 ${color.class}`}
              source={signal.visual}
            />
            <span class="text-muted-foreground text-center font-mono text-xs">
              {color.label}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

export default ElectricBarVisualizerColors;
