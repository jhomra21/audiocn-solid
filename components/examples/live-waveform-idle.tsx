import { createSignal } from "solid-js";

import { Button } from "@/components/ui/button";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const LiveWaveformIdle = () => {
  const [active, setActive] = createSignal(false);
  const signal = useDemoSignal({ historySize: 120, kind: "speech" });

  return (
    <div class="flex w-full max-w-md flex-col gap-4">
      <div class="bg-muted/20 rounded-lg border">
        <LiveWaveform
          active={active()}
          aria-label="Recording preview"
          class="h-16"
          mode="scrolling"
          source={signal.visual}
        />
      </div>
      <Button
        class="self-start"
        onClick={() => setActive((value) => !value)}
        size="sm"
        variant="outline"
      >
        {active() ? "Pause" : "Listen"}
      </Button>
    </div>
  );
};

export default LiveWaveformIdle;
