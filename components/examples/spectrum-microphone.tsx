import { Button } from "@/components/ui/button";
import { Spectrum } from "@/components/ui/spectrum";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

const SpectrumMicrophone = () => {
  const microphone = useMicrophone();

  const analyser = useAudioAnalyser(() => microphone.stream, {
    bands: 64,
    fftSize: 4096,
  });

  return (
    <div class="flex w-full max-w-lg flex-col gap-4">
      <Spectrum peakHold source={analyser.visual} />
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

export default SpectrumMicrophone;
