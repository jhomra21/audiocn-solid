import { Show, createSignal } from "solid-js";

import { SpeakerHighIcon, SpeakerXIcon } from "@/components/icons/phosphor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
} from "@/components/ui/volume-control";

const VolumeControlPopover = () => {
  const [volume, setVolume] = createSignal(0.8);
  const [muted, setMuted] = createSignal(false);

  return (
    <Popover placement="top" gutter={4}>
      <PopoverTrigger aria-label="Volume" size="icon" variant="outline">
        <Show when={!muted() && volume() !== 0} fallback={<SpeakerXIcon />}>
          <SpeakerHighIcon />
        </Show>
      </PopoverTrigger>
      <PopoverContent class="w-auto" aria-label="Volume controls">
        <VolumeControl
          muted={muted()}
          onMutedChange={setMuted}
          onValueChange={setVolume}
          orientation="vertical"
          value={volume()}
        >
          <VolumeControlMute>
            <Show when={!muted()} fallback={<SpeakerXIcon />}>
              <SpeakerHighIcon />
            </Show>
          </VolumeControlMute>
          <VolumeControlSlider />
        </VolumeControl>
      </PopoverContent>
    </Popover>
  );
};

export default VolumeControlPopover;
