import { LcdDisplay } from "@/components/ui/lcd-display";
import {
  LcdVuMeter,
  LcdVuMeterChannel,
  LcdVuMeterChannels,
  LcdVuMeterScale,
} from "@/components/ui/lcd-vumeter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LcdVuMeterVertical = () => {
  const signal = useDemoSignal({ channels: 2, kind: "music", seed: 4 });

  return (
    <LcdDisplay variant="amber">
      <LcdVuMeter
        aria-label="Program level"
        class="h-48"
        orientation="vertical"
        segments={24}
        size="lg"
        source={signal.meter}
      >
        <LcdVuMeterChannels>
          <LcdVuMeterChannel index={0} />
          <LcdVuMeterChannel index={1} />
          <LcdVuMeterScale />
        </LcdVuMeterChannels>
      </LcdVuMeter>
    </LcdDisplay>
  );
};
