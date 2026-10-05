import { For } from "solid-js";

import { MicrophoneSlashIcon } from "@/components/icons/phosphor";
import { ChannelToggle, MuteToggle } from "@/components/ui/channel-toggle";

const variants = ["default", "outline", "ghost"] as const;

const ChannelToggleVariants = () => (
  <div class="grid gap-4">
    <For each={variants}>
      {(variant) => (
        <div class="flex items-center gap-2">
          <MuteToggle defaultPressed variant={variant}>
            <MicrophoneSlashIcon />
            Muted
          </MuteToggle>
          <MuteToggle variant={variant}>Mute</MuteToggle>
          <ChannelToggle
            aria-label="Record arm"
            defaultPressed
            variant={variant}
          >
            R
          </ChannelToggle>
          <span class="text-muted-foreground font-mono text-xs">{variant}</span>
        </div>
      )}
    </For>
  </div>
);

export default ChannelToggleVariants;
