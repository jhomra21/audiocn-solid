import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterClip,
  LevelMeterHold,
  LevelMeterScale,
  LevelMeterTrack,
  LevelMeterValue,
} from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LevelMeterDemo = () => {
  const signal = useDemoSignal({ channels: 2, kind: "music" });

  return (
    <LevelMeter
      aria-label="Program level"
      class="max-w-md"
      source={signal.meter}
    >
      <LevelMeterChannels>
        <LevelMeterChannel index={0}>
          <LevelMeterTrack>
            <LevelMeterBar />
            <LevelMeterHold />
          </LevelMeterTrack>
        </LevelMeterChannel>
        <LevelMeterChannel index={1}>
          <LevelMeterTrack>
            <LevelMeterBar />
            <LevelMeterHold />
          </LevelMeterTrack>
        </LevelMeterChannel>
        <LevelMeterScale />
      </LevelMeterChannels>
      <LevelMeterValue />
      <LevelMeterClip />
    </LevelMeter>
  );
};
