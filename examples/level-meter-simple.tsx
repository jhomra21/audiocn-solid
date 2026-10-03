import { LevelMeter } from "@/components/ui/level-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

export const LevelMeterSimple = () => {
  const signal = useDemoSignal({ kind: "speech" });
  return <LevelMeter aria-label="Microphone level" className="max-w-sm" source={signal.meter} />;
};
