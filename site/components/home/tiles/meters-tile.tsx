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
import type { DemoSignalKind } from "@/hooks/use-demo-signal";

const CHANNEL_INDEXES = [0, 1];

interface MeterProps {
  label: string;
  kind: DemoSignalKind;
  channels: number;
  seed: number;
}

const Meter = (props: MeterProps) => {
  const signal = useDemoSignal({
    channels: props.channels,
    kind: props.kind,
    seed: props.seed,
  });

  return (
    <div class="flex flex-col items-center gap-2">
      <LevelMeter
        aria-label={`${props.label} level`}
        class="h-56"
        orientation="vertical"
        size="lg"
        source={signal.meter}
      >
        <LevelMeterChannels>
          {CHANNEL_INDEXES.slice(0, props.channels).map((index) => (
            <LevelMeterChannel index={index}>
              <LevelMeterTrack>
                <LevelMeterBar />
                <LevelMeterHold />
              </LevelMeterTrack>
            </LevelMeterChannel>
          ))}
          <LevelMeterScale />
        </LevelMeterChannels>
        <LevelMeterValue />
        <LevelMeterClip holdMs={Number.POSITIVE_INFINITY} showCount />
      </LevelMeter>
      <span class="text-xs font-medium">{props.label}</span>
    </div>
  );
};

const MetersTile = () => (
  <div class="flex w-full justify-center gap-8">
    <Meter channels={2} kind="music" label="Program" seed={4} />
    <Meter channels={1} kind="speech" label="Voice" seed={8} />
  </div>
);

export default MetersTile;
