import { QuickAudioPopover } from "@/components/blocks/quick-audio-popover/quick-audio-popover";
import { Button } from "@/components/ui/button";

const QuickAudioPopoverDemo = () => (
  <QuickAudioPopover>
    <Button class="w-full" size="sm" variant="ghost">
      More audio settings
    </Button>
  </QuickAudioPopover>
);

export default QuickAudioPopoverDemo;
