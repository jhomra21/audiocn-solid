import { LcdDisplay } from "@/components/ui/lcd-display";
import { LcdSpectrum } from "@/components/ui/lcd-spectrum";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LcdSpectrumDemo = () => {
  const signal = useDemoSignal({ bands: 48, kind: "music" });

  return (
    <LcdDisplay class="w-full max-w-xl" matrix={false}>
      <LcdSpectrum
        class="h-44"
        maxDb={0}
        minDb={-60}
        peakHold
        source={signal.visual}
      />
    </LcdDisplay>
  );
};
