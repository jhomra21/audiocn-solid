import { LevelMeter, LevelMeterChannel } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LevelMeterCssLevel = () => {
  const signal = useDemoSignal({ kind: "speech", seed: 5 });

  return (
    <LevelMeter
      aria-label="Speaking indicator"
      class="w-auto"
      source={signal.meter}
    >
      <LevelMeterChannel class="relative size-20 items-center justify-center">
        <span class="bg-primary/15 absolute size-20 scale-[calc(0.6_+_var(--meter-level)_*_0.6)] rounded-full" />
        <span class="bg-primary/30 absolute size-14 scale-[calc(0.8_+_var(--meter-level)_*_0.4)] rounded-full" />
        <span class="bg-primary relative size-10 rounded-full" />
      </LevelMeterChannel>
    </LevelMeter>
  );
};
