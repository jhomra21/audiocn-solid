import { DbReadout } from "@/components/ui/db-readout";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const DbReadoutDemo = () => {
  const signal = useDemoSignal({ kind: "speech" });

  return (
    <div class="grid grid-cols-[auto_auto] items-center gap-x-6 gap-y-2 text-sm">
      <span class="text-muted-foreground">Peak</span>
      <DbReadout source={signal.meter} />
      <span class="text-muted-foreground">RMS</span>
      <DbReadout measure="rms" source={signal.meter} />
      <span class="text-muted-foreground">Peak, held 1 s</span>
      <DbReadout holdMs={1000} source={signal.meter} />
      <span class="text-muted-foreground">Value</span>
      <DbReadout value={-6} />
    </div>
  );
};
