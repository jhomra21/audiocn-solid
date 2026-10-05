import {
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerXIcon,
} from "@/components/icons/phosphor";
import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
  VolumeControlValue,
} from "@/components/ui/volume-control";

const VolumeControlDemo = () => (
  <VolumeControl class="w-full max-w-xs" defaultValue={0.6}>
    <VolumeControlMute class="group/mute">
      <SpeakerXIcon class="hidden group-data-[level=muted]/mute:block" />
      <SpeakerNoneIcon class="hidden group-data-[level=low]/mute:block" />
      <SpeakerLowIcon class="hidden group-data-[level=medium]/mute:block" />
      <SpeakerHighIcon class="hidden group-data-[level=high]/mute:block" />
    </VolumeControlMute>
    <VolumeControlSlider />
    <VolumeControlValue />
  </VolumeControl>
);

export default VolumeControlDemo;
