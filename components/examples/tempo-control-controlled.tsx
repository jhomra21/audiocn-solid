import { createSignal } from "solid-js";

import {
  TempoControl,
  TempoControlInput,
  TempoControlTap,
} from "@/components/ui/tempo-control";

export const TempoControlControlled = () => {
  const [bpm, setBpm] = createSignal(96);

  return (
    <div class="flex flex-col items-center gap-3">
      <TempoControl onValueChange={setBpm} value={bpm()}>
        <TempoControlInput />
        <TempoControlTap>Tap tempo</TempoControlTap>
      </TempoControl>
      <span class="text-muted-foreground text-sm tabular-nums">
        Beat duration: {Math.round(60_000 / bpm())} ms
      </span>
    </div>
  );
};
