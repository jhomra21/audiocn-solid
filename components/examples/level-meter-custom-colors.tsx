import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const zones = [
  { fromDb: Number.NEGATIVE_INFINITY, zone: "ok" as const },
  { fromDb: -12, zone: "warn" as const },
  { fromDb: -3, zone: "clip" as const },
];

export const LevelMeterCustomColors = () => {
  const signal = useDemoSignal({ kind: "music", seed: 9 });

  return (
    <div class="grid w-full max-w-md gap-5">
      <LevelMeter
        aria-label="Monochrome meter"
        class="[--meter-clip:var(--foreground)] [--meter-ok:var(--muted-foreground)] [--meter-warn:var(--foreground)]"
        size="lg"
        source={signal.meter}
        variant="segmented"
      />
      <LevelMeter
        aria-label="Meter with custom zones"
        size="lg"
        source={signal.meter}
        zones={zones}
      />
    </div>
  );
};
