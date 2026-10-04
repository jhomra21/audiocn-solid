import {
  Knob,
  KnobCap,
  KnobDial,
  KnobLabel,
  KnobScale,
} from "@/components/ui/knob";

const KnobVolume = () => (
  <Knob class="[--knob-size:14rem]" clickSound defaultValue={33}>
    <KnobDial>
      <KnobScale labelEvery={10} majorEvery={5} ticks={100} />
      <KnobCap />
    </KnobDial>
    <KnobLabel class="sr-only">Volume</KnobLabel>
  </Knob>
);

export default KnobVolume;
