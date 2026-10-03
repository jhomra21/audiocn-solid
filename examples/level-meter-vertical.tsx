import { For } from "solid-js";

import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack,
  LevelMeterValue,
} from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const channels = [0, 1];

export const LevelMeterVertical = () => {
  const signal = useDemoSignal({ channels: 2, kind: "music", seed: 4 });

  return (
    <LevelMeter aria-label="Program level" className="h-56" orientation="vertical" size="lg" source={signal.meter}>
      <LevelMeterChannels>
        <For each={channels}>
          {(index) => (
            <LevelMeterChannel index={index}>
              <LevelMeterTrack><LevelMeterBar /><LevelMeterHold /></LevelMeterTrack>
            </LevelMeterChannel>
          )}
        </For>
        <LevelMeterScale />
      </LevelMeterChannels>
      <LevelMeterValue />
    </LevelMeter>
  );
};
