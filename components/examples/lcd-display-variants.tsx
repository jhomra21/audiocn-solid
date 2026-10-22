import { For } from "solid-js";

import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
  LcdDisplayValue,
} from "@/components/ui/lcd-display";

const READINGS = [
  { label: "Primary", value: "128.0", variant: "primary" },
  { label: "Amber", value: "−12 dB", variant: "amber" },
  { label: "Green", value: "44.1 kHz", variant: "green" },
  { label: "Cyan", value: "−3.0 dB", variant: "cyan" },
  { label: "Red", value: "CLIP", variant: "red" },
] as const;

const LcdDisplayVariants = () => (
  <div class="grid gap-3 sm:grid-cols-2">
    <For each={READINGS}>
      {(reading) => (
        <LcdDisplay variant={reading.variant}>
          <LcdDisplayRow>
            <LcdDisplayLabel>{reading.label}</LcdDisplayLabel>
            <LcdDisplayValue>{reading.value}</LcdDisplayValue>
          </LcdDisplayRow>
        </LcdDisplay>
      )}
    </For>
  </div>
);

export default LcdDisplayVariants;
