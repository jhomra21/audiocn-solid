import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
  LcdDisplaySeparator,
} from "@/components/ui/lcd-display";
import { LcdSpectrum } from "@/components/ui/lcd-spectrum";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LcdSpectrumModes = () => {
  const signal = useDemoSignal({ bands: 32, kind: "speech" });

  return (
    <LcdDisplay class="w-full max-w-xl" matrix={false} variant="green">
      <LcdDisplayRow>
        <LcdDisplayLabel>Bar</LcdDisplayLabel>
        <LcdSpectrum class="h-28" source={signal.visual} />
      </LcdDisplayRow>
      <LcdDisplaySeparator />
      <LcdDisplayRow>
        <LcdDisplayLabel>Dot</LcdDisplayLabel>
        <LcdSpectrum class="h-28" mode="dot" source={signal.visual} />
      </LcdDisplayRow>
    </LcdDisplay>
  );
};
