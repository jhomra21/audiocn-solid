import { createSignal } from "solid-js";

import { SoundPad, SoundPadLabel } from "@/components/ui/sound-pad";
import { TempoControl, TempoControlTap } from "@/components/ui/tempo-control";

export const TempoControlPad = () => {
  const [bpm, setBpm] = createSignal(128);

  return (
    <TempoControl class="w-36 flex-col" onValueChange={setBpm} value={bpm()}>
      <output
        aria-label="Tempo"
        aria-live="off"
        class="font-mono text-lg tabular-nums"
      >
        {bpm()} BPM
      </output>
      <TempoControlTap
        as={(props) => (
          <SoundPad
            aria-label={props["aria-label"]}
            class="w-full"
            disabled={!!props.disabled}
            onClick={props.onClick}
            onKeyDown={props.onKeyDown}
          >
            {props.children}
          </SoundPad>
        )}
      >
        <SoundPadLabel>Tap tempo</SoundPadLabel>
      </TempoControlTap>
    </TempoControl>
  );
};
