import { For } from "solid-js";

import { LcdDisplay } from "@/components/ui/lcd-display";
import { LcdSpectrum } from "@/components/ui/lcd-spectrum";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const INKS = ["amber", "green", "cyan", "red"] as const;

export const LcdSpectrumInks = () => {
  const signal = useDemoSignal({ bands: 24, kind: "music", seed: 6 });

  return (
    <div class="grid w-full max-w-xl gap-4 sm:grid-cols-2">
      <For each={INKS}>
        {(ink) => (
          <LcdDisplay matrix={false} size="sm" variant={ink}>
            <LcdSpectrum class="h-24" rows={12} source={signal.visual} />
          </LcdDisplay>
        )}
      </For>
    </div>
  );
};
