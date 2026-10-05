import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

const LiveWaveformMicrophone = () => {
  const microphone = useMicrophone();

  const analyser = useAudioAnalyser(() => microphone.stream, {
    historySize: 120,
  });

  return (
    <div class="flex w-full max-w-md flex-col gap-4">
      <LiveWaveform
        active={microphone.status === "active"}
        aria-label="Microphone waveform"
        class="h-20"
        mode="scrolling"
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

export default LiveWaveformMicrophone;
