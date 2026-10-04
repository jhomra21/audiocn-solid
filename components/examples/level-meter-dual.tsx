import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack,
} from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LevelMeterDual = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 7 });

  return (
    <LevelMeter
      aria-label="Voice level"
      class="max-w-md"
      size="lg"
      source={signal.meter}
    >
      <LevelMeterChannels>
        <LevelMeterChannel>
          <LevelMeterTrack>
            <LevelMeterBar class="opacity-40" measure="peak" />
            <LevelMeterBar measure="rms" />
            <LevelMeterHold />
          </LevelMeterTrack>
        </LevelMeterChannel>
        <LevelMeterScale />
      </LevelMeterChannels>
    </LevelMeter>
  );
};
