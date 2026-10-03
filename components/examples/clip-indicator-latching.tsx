import { Button } from "@/components/ui/button";
import { ClipIndicator } from "@/components/ui/clip-indicator";
import type { ClipIndicatorActions } from "@/components/ui/clip-indicator";
import type { MutableRef } from "@/lib/solid/ref";

export const ClipIndicatorLatching = () => {
  const clip: MutableRef<ClipIndicatorActions | null> = { current: null };

  return (
    <div class="flex items-center gap-4">
      <ClipIndicator actionsRef={clip} holdMs={Number.POSITIVE_INFINITY} showCount />
      <Button onClick={() => clip.current?.report(0)} size="sm" variant="outline">
        Simulate a clip
      </Button>
      <Button onClick={() => clip.current?.reset()} size="sm" variant="ghost">
        Reset
      </Button>
    </div>
  );
};
