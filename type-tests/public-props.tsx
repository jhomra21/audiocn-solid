import { Button } from "@/components/ui/button";
import { ClipIndicator } from "@/components/ui/clip-indicator";
import { LevelMeter } from "@/components/ui/level-meter";

export const PublicPropTypeContract = () => (
  <>
    <Button
      aria-pressed="true"
      data-x="1"
      onKeyDown={() => {}}
      role="switch"
      style={{ color: "red" }}
    >
      Button
    </Button>
    <ClipIndicator onPointerDown={() => {}} />
    <LevelMeter peakDb={-6} role="img" />
  </>
);
