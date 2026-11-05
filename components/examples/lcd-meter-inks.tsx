import { For } from "solid-js";

import { LcdDisplay } from "@/components/ui/lcd-display";
import type {
  LcdDisplayAppearance,
  LcdDisplayVariant,
} from "@/components/ui/lcd-display";
import { LcdMeter } from "@/components/ui/lcd-meter";
import { useDemoSignal } from "@/hooks/use-demo-signal";
import type { DemoSignalKind } from "@/hooks/use-demo-signal";

const INKS = [
  { kind: "music", label: "Drums", seed: 1, variant: "amber" },
  { kind: "speech", label: "Vocal", seed: 2, variant: "green" },
  { kind: "music", label: "Keys", seed: 5, variant: "cyan" },
  // A dark screen in both themes.
  { appearance: "dark", kind: "music", label: "Bass", seed: 8, variant: "red" },
] as const satisfies readonly {
  appearance?: LcdDisplayAppearance;
  kind: DemoSignalKind;
  label: string;
  seed: number;
  variant: LcdDisplayVariant;
}[];

const InkMeter = (props: { ink: (typeof INKS)[number] }) => {
  const ink = props.ink;
  const signal = useDemoSignal({ kind: ink.kind, seed: ink.seed });

  return (
    <LcdDisplay
      appearance={"appearance" in ink ? ink.appearance : "auto"}
      size="sm"
      variant={ink.variant}
    >
      <LcdMeter aria-label={`${ink.label} level`} source={signal.meter} />
    </LcdDisplay>
  );
};

export const LcdMeterInks = () => (
  <div class="grid w-full max-w-xl gap-4 sm:grid-cols-2">
    <For each={INKS}>{(ink) => <InkMeter ink={ink} />}</For>
  </div>
);
