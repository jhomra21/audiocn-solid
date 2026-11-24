import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
} from "@/components/ui/lcd-display";
import {
  LcdVuMeter,
  LcdVuMeterBar,
  LcdVuMeterChannel,
  LcdVuMeterChannels,
  LcdVuMeterHold,
  LcdVuMeterScale,
  LcdVuMeterTrack,
} from "@/components/ui/lcd-vumeter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LcdVuMeterDual = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 7 });

  return (
    <LcdDisplay class="w-full max-w-md">
      <LcdDisplayRow>
        <LcdDisplayLabel>Voice</LcdDisplayLabel>
        <LcdVuMeter size="lg" source={signal.meter}>
          <LcdVuMeterChannels>
            <LcdVuMeterChannel>
              <LcdVuMeterTrack>
                <LcdVuMeterBar class="opacity-40" measure="peak" />
                <LcdVuMeterBar measure="rms" />
                <LcdVuMeterHold />
              </LcdVuMeterTrack>
            </LcdVuMeterChannel>
            <LcdVuMeterScale />
          </LcdVuMeterChannels>
        </LcdVuMeter>
      </LcdDisplayRow>
    </LcdDisplay>
  );
};
