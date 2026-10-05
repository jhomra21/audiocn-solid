import { For } from "solid-js";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const alignments = ["center", "end", "start"] as const;

const BarVisualizerAlign = () => {
  const signal = useDemoSignal({ kind: "music" });

  return (
    <div class="grid w-full max-w-md grid-cols-3 gap-6">
      <For each={alignments}>
        {(align) => (
          <div class="grid gap-2">
            <div class="bg-muted/40 rounded-lg p-2">
              <BarVisualizer
                align={align}
                aria-label={`Bars aligned to ${align}`}
                barCount={12}
                class="h-16"
                source={signal.visual}
              />
            </div>
            <span class="text-muted-foreground text-center font-mono text-xs">
              {align}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

export default BarVisualizerAlign;
