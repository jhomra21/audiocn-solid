import {
  LcdDisplay,
  LcdDisplayLabel,
  LcdDisplayRow,
  LcdDisplayStatus,
  LcdDisplayValue,
  LcdDisplaySeparator,
} from "@/components/ui/lcd-display";

const LcdDisplayFont = () => (
  <LcdDisplay
    class="w-full max-w-80 font-black [--lcd-display-font:var(--font-doto)]"
    matrix={false}
  >
    <LcdDisplayRow>
      <LcdDisplayLabel>Model</LcdDisplayLabel>
      <LcdDisplayValue>Opus 5.5</LcdDisplayValue>
    </LcdDisplayRow>
    <LcdDisplaySeparator />
    <LcdDisplayRow>
      <LcdDisplayLabel>Effort</LcdDisplayLabel>
      <LcdDisplayValue>High</LcdDisplayValue>
    </LcdDisplayRow>
    <LcdDisplayStatus state="busy" />
  </LcdDisplay>
);

export default LcdDisplayFont;
