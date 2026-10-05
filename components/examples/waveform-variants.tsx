import { For } from "solid-js";

import { Waveform } from "@/components/ui/waveform";

const peaks = Float32Array.from({ length: 240 }, (_, index) => {
  const envelope = Math.sin((index / 240) * Math.PI) ** 0.6;

  return (
    envelope *
    (0.55 + 0.45 * Math.abs(Math.sin(index * 0.37) * Math.cos(index * 0.11)))
  );
});

const variants = ["bars", "mirror", "line"] as const;

const WaveformVariants = () => (
  <div class="grid w-full max-w-lg gap-5">
    <For each={variants}>
      {(variant) => (
        <div class="grid gap-1.5">
          <span class="text-muted-foreground font-mono text-xs">{variant}</span>
          <Waveform
            aria-label={`${variant} waveform`}
            class="h-14"
            defaultCurrentTime={12}
            duration={30}
            peaks={peaks}
            variant={variant}
          />
        </div>
      )}
    </For>
  </div>
);

export default WaveformVariants;
