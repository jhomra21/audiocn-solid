import { For } from "solid-js";

import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const variants = ["solid", "segmented", "gradient"] as const;

export const LevelMeterVariants = () => {
  const signal = useDemoSignal({ channels: 2, kind: "music", seed: 2 });

  return (
    <div class="grid w-full max-w-md gap-5">
      <For each={variants}>
        {(variant) => (
          <div class="grid gap-1.5">
            <span class="text-muted-foreground text-xs">{variant}</span>
            <LevelMeter
              aria-label={`${variant} meter`}
              size="lg"
              source={signal.meter}
              variant={variant}
            />
          </div>
        )}
      </For>
    </div>
  );
};
