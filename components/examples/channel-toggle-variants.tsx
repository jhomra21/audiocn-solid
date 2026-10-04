import { ChannelToggle, MuteToggle } from "@/components/ui/channel-toggle";

const ChannelToggleVariants = () => (
  <div class="flex flex-wrap items-center gap-2">
    <MuteToggle pressed>Muted</MuteToggle>
    <ChannelToggle pressed tone="mute">
      Mute tone
    </ChannelToggle>
    <ChannelToggle pressed tone="solo">
      Solo tone
    </ChannelToggle>
    <ChannelToggle pressed tone="monitor">
      Monitor tone
    </ChannelToggle>
  </div>
);

export default ChannelToggleVariants;
