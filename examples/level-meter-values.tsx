import { For } from "solid-js";

import { LevelMeter } from "@/components/ui/level-meter";

const levels = [
  { label: "Quiet", peakDb: -42 },
  { label: "Good", peakDb: -16 },
  { label: "Hot", peakDb: -7 },
  { label: "Clipping", peakDb: 0 },
];

export const LevelMeterValues = () => (
  <div className="grid w-full max-w-sm gap-3">
    <For each={levels}>
      {(level) => (
        <div className="grid grid-cols-[4.5rem_1fr] items-center gap-3">
          <span className="text-muted-foreground text-sm">{level.label}</span>
          <LevelMeter aria-label={`${level.label} level`} peakDb={level.peakDb} />
        </div>
      )}
    </For>
  </div>
);
