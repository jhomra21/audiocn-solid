import { Button } from "@/components/ui/button";
import { ElectricBarVisualizer } from "@/components/ui/electric-bar-visualizer";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useMicrophone } from "@/hooks/use-microphone";

const ElectricBarVisualizerMicrophone = () => {
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);

  return (
    <div class="flex w-full max-w-sm flex-col gap-4">
      <ElectricBarVisualizer
        align="end"
        aria-label="Microphone"
        class="text-primary h-24"
        idle="wave"
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

export default ElectricBarVisualizerMicrophone;
