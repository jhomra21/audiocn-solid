import { createSignal } from "solid-js";

import {
  Fader,
  FaderLabel,
  FaderRange,
  FaderReset,
  FaderScale,
  FaderThumb,
  FaderTrack,
  FaderValue,
} from "@/components/ui/fader";

const FaderDemo = () => {
  const [gainDb, setGainDb] = createSignal(-6);

  return (
    <Fader class="max-w-sm" onValueChange={setGainDb} value={gainDb()}>
      <div class="flex items-center gap-2">
        <FaderLabel class="mr-auto">Microphone</FaderLabel>
        <FaderReset />
        <FaderValue />
      </div>
      <FaderTrack>
        <FaderRange />
        <FaderThumb />
      </FaderTrack>
      <FaderScale />
    </Fader>
  );
};

export default FaderDemo;
