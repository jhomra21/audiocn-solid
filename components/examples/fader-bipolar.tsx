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

const FaderBipolar = () => {
  const [gainDb, setGainDb] = createSignal(0);

  return (
    <Fader
      class="max-w-sm"
      max={24}
      min={-24}
      onValueChange={setGainDb}
      origin={0}
      step={1}
      value={gainDb()}
    >
      <div class="flex items-center justify-between">
        <FaderLabel>Input gain</FaderLabel>
        <FaderValue editable />
      </div>
      <FaderTrack>
        <FaderRange />
        <FaderThumb />
      </FaderTrack>
      <FaderScale ticks={[-24, -12, 0, 12, 24]} />
    </Fader>
  );
};

export default FaderBipolar;
