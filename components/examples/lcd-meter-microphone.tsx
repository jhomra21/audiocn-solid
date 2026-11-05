import { Button } from "@/components/ui/button";
import { LcdDisplay } from "@/components/ui/lcd-display";
import { LcdMeter } from "@/components/ui/lcd-meter";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

export const LcdMeterMicrophone = () => {
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);
  const listening = () => microphone.status === "active";

  return (
    <div class="grid max-w-xl gap-4">
      <LcdDisplay variant="green">
        <LcdMeter aria-label="Microphone level" source={analyser.meter} />
      </LcdDisplay>
      <Button
        class="justify-self-start"
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
