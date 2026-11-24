import { For, Show } from "solid-js";

import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
} from "@/components/ui/lcd-display";
import {
  LcdNumberField,
  LcdNumberFieldGroup,
  LcdNumberFieldInput,
  LcdNumberFieldScrubArea,
  LcdNumberFieldStepper,
  LcdNumberFieldUnit,
} from "@/components/ui/lcd-number-field";

const PARAMETERS = [
  { label: "Tempo", unit: "Bpm", value: 128, variant: "amber" },
  { label: "Gain", unit: "dB", value: -6, variant: "green" },
  { label: "Delay", unit: "ms", value: 250, variant: "cyan" },
  { label: "Bars", unit: "", value: 16, variant: "red" },
] as const;

export const LcdNumberFieldInks = () => (
  <div class="grid w-full max-w-xl gap-4 sm:grid-cols-2">
    <For each={PARAMETERS}>
      {(parameter) => (
        <LcdDisplay size="sm" variant={parameter.variant}>
          <LcdDisplayRow>
            <LcdNumberField defaultValue={parameter.value}>
              <LcdNumberFieldScrubArea>
                <LcdDisplayLabel>{parameter.label}</LcdDisplayLabel>
              </LcdNumberFieldScrubArea>
              <LcdNumberFieldGroup>
                <LcdNumberFieldInput />
                <Show when={parameter.unit}>
                  <LcdNumberFieldUnit>{parameter.unit}</LcdNumberFieldUnit>
                </Show>
                <LcdNumberFieldStepper />
              </LcdNumberFieldGroup>
            </LcdNumberField>
          </LcdDisplayRow>
        </LcdDisplay>
      )}
    </For>
  </div>
);
