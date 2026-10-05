import { createSignal } from "solid-js";

import {
  Fader,
  FaderThumb,
  FaderTrack,
  FaderValue,
} from "@/components/ui/fader";
import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const FaderWithMeter = () => {
  const [gainDb, setGainDb] = createSignal(0);

  const signal = useDemoSignal({
    channels: 2,
    kind: "music",
    get gainDb() {
      return gainDb();
    },
  });

  return (
    <Fader
      aria-label="Program gain"
      class="h-64 flex-col items-center"
      max={6}
      min={-60}
      onValueChange={setGainDb}
      orientation="vertical"
      size="lg"
      value={gainDb()}
      variant="console"
    >
      <FaderValue />
      <FaderTrack class="w-6 overflow-visible bg-transparent">
        <LevelMeter
          aria-label="Program level"
          class="absolute inset-0 h-full min-h-0"
          maxDb={6}
          orientation="vertical"
          size="sm"
          source={signal.meter}
        />
        <FaderThumb />
      </FaderTrack>
    </Fader>
  );
};

export default FaderWithMeter;
