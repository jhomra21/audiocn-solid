import { MicrophoneIcon } from "@/components/icons/phosphor";
import { Badge } from "@/components/ui/badge";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const BarVisualizerMini = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 12 });

  return (
    <Badge class="h-7" variant="secondary">
      <MicrophoneIcon />
      Live
      <BarVisualizer
        aria-hidden="true"
        barCount={5}
        class="h-3.5 w-7 [--bar-gap:2px] [--bar-width:3px]"
        minLevel={0.15}
        source={signal.visual}
      />
    </Badge>
  );
};

export default BarVisualizerMini;
