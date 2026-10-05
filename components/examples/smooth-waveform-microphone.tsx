import { Button } from "@/components/ui/button";
import { SmoothWaveform } from "@/components/ui/smooth-waveform";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

const SmoothWaveformMicrophone = () => {
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);

  return (
    <div class="flex w-full max-w-lg flex-col gap-4">
      <SmoothWaveform
        aria-label="Microphone"
        class="text-primary h-28"
        mode="scope"
        source={analyser.visual}
      />
      <Button
        class="self-start"
        onClick={() =>
          microphone.status === "active"
            ? microphone.stop()
            : void microphone.start()
        }
        size="sm"
        variant="outline"
      >
        {microphone.status === "active"
          ? "Stop microphone"
          : "Use my microphone"}
      </Button>
    </div>
  );
};

export default SmoothWaveformMicrophone;
