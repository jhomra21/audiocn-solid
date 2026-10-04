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

const channels = ["Mic", "Music", "Game"];

const FaderVertical = () => {
  const [levels, setLevels] = createSignal<Record<string, number>>({
    Game: -12,
    Mic: 0,
    Music: -18,
  });

  return (
    <div class="flex h-64 gap-6">
      {channels.map((channel) => (
        <Fader
          class="flex-col items-center"
          onValueChange={(value) =>
            setLevels({ ...levels(), [channel]: value })
          }
          orientation="vertical"
          taper="audio"
          value={levels()[channel]}
          variant="console"
        >
          <FaderValue />
          <div class="flex min-h-0 flex-1 gap-1">
            <FaderTrack>
              <FaderRange />
              <FaderThumb />
            </FaderTrack>
            <FaderScale />
          </div>
          <FaderLabel class="text-muted-foreground text-xs">
            {channel}
          </FaderLabel>
        </Fader>
      ))}
    </div>
  );
};

export default FaderVertical;
