import { createSignal } from "solid-js";

import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
  LcdDisplaySelect,
  LcdDisplaySelectContent,
  LcdDisplaySelectTrigger,
  LcdDisplaySeparator,
  LcdDisplayStatus,
} from "@/components/ui/lcd-display";
import { LcdMeter } from "@/components/ui/lcd-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";

const INPUTS = [
  { kind: "music", label: "Line In", value: "line" },
  { kind: "speech", label: "USB Mic", value: "usb" },
  { kind: "tone", label: "Test Tone", value: "tone" },
] as const;

type Input = (typeof INPUTS)[number]["value"];

export const LcdMeterDemo = () => {
  const [input, setInput] = createSignal<Input>("line");

  const kind = () =>
    INPUTS.find((item) => item.value === input())?.kind ?? INPUTS[0].kind;

  const signal = useDemoSignal({
    channels: 2,
    get kind() {
      return kind();
    },
    seed: 3,
  });

  return (
    <LcdDisplay class="w-full max-w-96">
      <LcdDisplayRow>
        <LcdDisplayLabel>Input</LcdDisplayLabel>
        <LcdDisplaySelect
          items={[...INPUTS]}
          onValueChange={(next) => {
            const item = INPUTS.find((option) => option.value === next);

            if (item) setInput(item.value);
          }}
          value={input()}
        >
          <LcdDisplaySelectTrigger />
          <LcdDisplaySelectContent />
        </LcdDisplaySelect>
      </LcdDisplayRow>
      <LcdDisplaySeparator />
      <LcdMeter aria-label="Input level" source={signal.meter} />
      <LcdDisplayStatus />
    </LcdDisplay>
  );
};
