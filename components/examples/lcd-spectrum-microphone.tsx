import { Button } from "@/components/ui/button";
import { LcdDisplay } from "@/components/ui/lcd-display";
import { LcdSpectrum } from "@/components/ui/lcd-spectrum";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

export const LcdSpectrumMicrophone = () => {
  const microphone = useMicrophone();

  const analyser = useAudioAnalyser(() => microphone.stream, {
    bands: 64,
    fftSize: 4096,
  });

  const listening = () => microphone.status === "active";

  return (
    <div class="flex w-full max-w-lg flex-col gap-4">
      <LcdDisplay matrix={false}>
        <LcdSpectrum peakHold source={analyser.visual} />
      </LcdDisplay>
      <Button
        class="self-start"
        onClick={() => {
          if (listening()) microphone.stop();
          else void microphone.start();
        }}
        size="sm"
        variant="outline"
      >
        {listening() ? "Stop microphone" : "Use my microphone"}
      </Button>
    </div>
  );
};
