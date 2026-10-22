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

const MODELS = [
  { label: "Opus 5.5", value: "opus" },
  { label: "Sonnet 5.5", value: "sonnet" },
  { label: "Haiku 5.5", value: "haiku" },
];

const EFFORTS = [
  { label: "Low", value: "low" },
  { label: "Med", value: "med" },
  { label: "High", value: "high" },
  { label: "Ultra", value: "ultra" },
];

const LcdDisplayDemo = () => {
  const [model, setModel] = createSignal("opus");
  const [effort, setEffort] = createSignal("high");

  return (
    <LcdDisplay class="w-full max-w-80">
      <LcdDisplayRow>
        <LcdDisplayLabel>Model</LcdDisplayLabel>
        <LcdDisplaySelect
          items={MODELS}
          onValueChange={setModel}
          value={model()}
        >
          <LcdDisplaySelectTrigger />
          <LcdDisplaySelectContent />
        </LcdDisplaySelect>
      </LcdDisplayRow>
      <LcdDisplaySeparator />
      <LcdDisplayRow>
        <LcdDisplayLabel>Effort</LcdDisplayLabel>
        <LcdDisplaySelect
          items={EFFORTS}
          onValueChange={setEffort}
          value={effort()}
        >
          <LcdDisplaySelectTrigger />
          <LcdDisplaySelectContent />
        </LcdDisplaySelect>
      </LcdDisplayRow>
      <LcdDisplayStatus />
    </LcdDisplay>
  );
};

export default LcdDisplayDemo;
