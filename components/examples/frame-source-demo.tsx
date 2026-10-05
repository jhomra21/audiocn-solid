import { Button } from "@/components/ui/button";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useDemoSignal } from "@/hooks/use-demo-signal";
import { useLevel } from "@/hooks/use-level";
import { useMicrophone } from "@/hooks/use-microphone";
import { formatDb } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";

interface LevelRowProps {
  label: string;
  source: FrameSource<MeterFrame>;
}

const LevelRow = (props: LevelRowProps) => {
  const level = useLevel(() => props.source, { intervalMs: 100 });

  return (
    <div class="grid grid-cols-1 items-center gap-1 font-mono text-sm tabular-nums sm:grid-cols-[8rem_1fr_1fr_4rem] sm:gap-3">
      <span class="text-muted-foreground font-sans">{props.label}</span>
      <span>peak {formatDb(level.peakDb, { floorDb: -90 })}</span>
      <span>
        rms{" "}
        {formatDb(level.rmsDb ?? Number.NEGATIVE_INFINITY, { floorDb: -90 })}
      </span>
      <span class="text-muted-foreground">{level.zone}</span>
    </div>
  );
};

const FrameSourceDemo = () => {
  const demo = useDemoSignal({ kind: "speech" });
  const microphone = useMicrophone();
  const analyser = useAudioAnalyser(() => microphone.stream);

  return (
    <div class="flex w-full max-w-xl flex-col gap-4">
      <LevelRow label="Demo signal" source={demo.meter} />
      <LevelRow label="Microphone" source={analyser.meter} />
      <div class="flex flex-wrap items-center gap-3">
        <Button
          onClick={() =>
            microphone.status === "active"
              ? microphone.stop()
              : void microphone.start()
          }
          size="sm"
          variant="outline"
        >
          {microphone.status === "active"
            ? "Stop microphone"
            : "Use my microphone"}
        </Button>
        <span class="text-muted-foreground text-xs">
          Microphone: {microphone.status}
        </span>
      </div>
    </div>
  );
};

export default FrameSourceDemo;
