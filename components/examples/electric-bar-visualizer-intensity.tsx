import { For } from "solid-js";

import { ElectricBarVisualizer } from "@/components/ui/electric-bar-visualizer";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const settings = [
  { arcs: false, intensity: 0.2, label: "calm", sparks: false },
  { arcs: true, intensity: 0.6, label: "default", sparks: true },
  { arcs: true, intensity: 1, label: "charged", sparks: true },
] as const;

const ElectricBarVisualizerIntensity = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 5 });

  return (
    <div class="grid w-full max-w-md gap-6 sm:grid-cols-3">
      <For each={settings}>
        {(setting) => (
          <div class="grid gap-2">
            <ElectricBarVisualizer
              arcs={setting.arcs}
              aria-label={`Visualizer, ${setting.label}`}
              barCount={10}
              class="text-primary h-20"
              intensity={setting.intensity}
              source={signal.visual}
              sparks={setting.sparks}
            />
            <span class="text-muted-foreground text-center font-mono text-xs">
              {setting.label}
            </span>
          </div>
        )}
      </For>
    </div>
  );
};

export default ElectricBarVisualizerIntensity;
