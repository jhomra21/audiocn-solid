import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
  VolumeControlValue,
} from "@/components/ui/volume-control";

const VolumeControlDemo = () => (
  <VolumeControl class="w-full max-w-xs" defaultValue={0.6}>
    <VolumeControlMute class="group/mute">
      <span aria-hidden="true">♫</span>
    </VolumeControlMute>
    <VolumeControlSlider />
    <VolumeControlValue />
  </VolumeControl>
);

export default VolumeControlDemo;
