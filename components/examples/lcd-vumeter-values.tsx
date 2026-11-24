import { For } from "solid-js";

import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
} from "@/components/ui/lcd-display";
import { LcdVuMeter } from "@/components/ui/lcd-vumeter";

const levels = [
  { label: "Quiet", peakDb: -42 },
  { label: "Good", peakDb: -16 },
  { label: "Hot", peakDb: -7 },
  { label: "Clipping", peakDb: 0 },
];

export const LcdVuMeterValues = () => (
  <LcdDisplay class="w-full max-w-md">
    <For each={levels}>
      {(level) => (
        <LcdDisplayRow>
          {/* One width for every label, so the meters line up. */}
          <LcdDisplayLabel class="w-[6em] shrink-0">
            {level.label}
          </LcdDisplayLabel>
          <LcdVuMeter peakDb={level.peakDb} />
        </LcdDisplayRow>
      )}
    </For>
  </LcdDisplay>
);
