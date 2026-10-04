import { createSignal } from "solid-js";

import { formatPan, PanControl } from "@/components/ui/pan-control";

const PanControlDemo = () => {
  const [pan, setPan] = createSignal(-0.3);

  return (
    <div class="grid w-full max-w-xs gap-2">
      <div class="flex justify-between text-sm">
        <span class="font-medium">Pan</span>
        <span class="text-muted-foreground font-mono text-xs">
          {formatPan(pan())}
        </span>
      </div>
      <PanControl onValueChange={setPan} value={pan()} />
      <div class="text-muted-foreground flex justify-between text-xs">
        <span>L</span>
        <span>R</span>
      </div>
    </div>
  );
};

export default PanControlDemo;
