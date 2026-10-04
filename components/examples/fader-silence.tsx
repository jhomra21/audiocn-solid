import { createSignal } from "solid-js";

import {
  Fader,
  FaderLabel,
  FaderRange,
  FaderScale,
  FaderThumb,
  FaderTrack,
  FaderValue,
} from "@/components/ui/fader";

const FaderSilence = () => {
  const [volumeDb, setVolumeDb] = createSignal(-10);

  return (
    <Fader
      class="max-w-sm"
      max={6}
      min={-80}
      onValueChange={setVolumeDb}
      silenceAtMin
      taper="audio"
      value={volumeDb()}
    >
      <div class="flex items-center justify-between">
        <FaderLabel>Output</FaderLabel>
        <FaderValue />
      </div>
      <FaderTrack>
        <FaderRange />
        <FaderThumb />
      </FaderTrack>
      <FaderScale ticks={[6, 0, -10, -20, -40, -80]} />
    </Fader>
  );
};

export default FaderSilence;
