import { LiveWaveform } from "@/components/ui/live-waveform";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const LiveWaveformVariants = () => {
  const signal = useDemoSignal({ historySize: 120, kind: "music" });

  return (
    <div class="grid w-full max-w-md gap-6">
      <div class="grid gap-1.5">
        <span class="text-muted-foreground text-xs">static bars</span>
        <LiveWaveform
          aria-label="Spectrum bars"
          class="h-14"
          source={signal.visual}
        />
      </div>
      <div class="grid gap-1.5">
        <span class="text-muted-foreground text-xs">static mirror</span>
        <LiveWaveform
          aria-label="Mirrored spectrum"
          class="text-primary h-14"
          source={signal.visual}
          variant="mirror"
        />
      </div>
      <div class="grid gap-1.5">
        <span class="text-muted-foreground text-xs">static line</span>
        <LiveWaveform
          aria-label="Waveform trace"
          class="h-14"
          source={signal.visual}
          variant="line"
        />
      </div>
      <div class="grid gap-1.5">
        <span class="text-muted-foreground text-xs">scrolling line</span>
        <LiveWaveform
          aria-label="Level history"
          class="h-14 [--waveform:var(--meter-ok)]"
          mode="scrolling"
          source={signal.visual}
          variant="line"
        />
      </div>
    </div>
  );
};

export default LiveWaveformVariants;
