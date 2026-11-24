import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
} from "@/components/icons/phosphor";
import { Button } from "@/components/ui/button";
import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
} from "@/components/ui/lcd-display";
import {
  LcdVuMeter,
  LcdVuMeterChannel,
  LcdVuMeterChannels,
  LcdVuMeterClip,
  LcdVuMeterValue,
} from "@/components/ui/lcd-vumeter";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

export const LcdVuMeterMicrophone = () => {
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);
  const listening = () => microphone.status === "active";

  return (
    <div class="flex w-full max-w-md flex-col gap-4">
      <LcdDisplay>
        <LcdDisplayRow>
          <LcdDisplayLabel>Mic</LcdDisplayLabel>
          <LcdVuMeter source={analyser.meter}>
            <LcdVuMeterChannels>
              <LcdVuMeterChannel />
            </LcdVuMeterChannels>
            <LcdVuMeterValue />
            <LcdVuMeterClip />
          </LcdVuMeter>
        </LcdDisplayRow>
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
        {listening() ? (
          <MicrophoneSlashIcon data-icon="inline-start" />
        ) : (
          <MicrophoneIcon data-icon="inline-start" />
        )}
        {listening() ? "Stop microphone" : "Use my microphone"}
      </Button>
    </div>
  );
};
