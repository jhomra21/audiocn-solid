import { SmoothWaveform } from "@/components/ui/smooth-waveform";

const SmoothWaveformStates = () => (
  <div class="grid w-full max-w-lg gap-6 sm:grid-cols-2">
    <div class="grid gap-2">
      <SmoothWaveform aria-label="Idle" class="text-primary h-20" />
      <span class="text-muted-foreground text-center text-xs">idle</span>
    </div>
    <div class="grid gap-2">
      <SmoothWaveform
        aria-label="Connecting"
        class="text-primary h-20"
        loading
      />
      <span class="text-muted-foreground text-center text-xs">loading</span>
    </div>
  </div>
);

export default SmoothWaveformStates;
