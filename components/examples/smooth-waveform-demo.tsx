import { SmoothWaveform } from "@/components/ui/smooth-waveform";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const SmoothWaveformDemo = () => {
  const signal = useDemoSignal({ kind: "speech" });

  return (
    <SmoothWaveform
      aria-label="Voice activity"
      class="text-primary h-32 max-w-lg"
      source={signal.visual}
    />
  );
};

export default SmoothWaveformDemo;
