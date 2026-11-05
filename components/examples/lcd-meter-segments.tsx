import { LcdDisplay } from "@/components/ui/lcd-display";
import { LcdMeter } from "@/components/ui/lcd-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LcdMeterSegments = () => {
  const signal = useDemoSignal({ kind: "music", seed: 4 });

  return (
    <div class="flex w-full max-w-sm flex-col gap-4">
      <LcdDisplay size="sm">
        <LcdMeter aria-label="Blocks" source={signal.meter} />
      </LcdDisplay>
      <LcdDisplay size="sm">
        {/* One dot wide, one dot apart. */}
        <LcdMeter
          aria-label="Fine ladder"
          class="[--lcd-meter-segment:var(--lcd-display-pitch)]"
          source={signal.meter}
        />
      </LcdDisplay>
      <LcdDisplay size="sm">
        <LcdMeter
          aria-label="Solid bar"
          class="[--lcd-meter-gap:0px]"
          source={signal.meter}
        />
      </LcdDisplay>
    </div>
  );
};
