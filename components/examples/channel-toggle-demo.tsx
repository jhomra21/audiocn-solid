import { createSignal } from "solid-js";

import {
  MonitorToggle,
  MuteToggle,
  SoloToggle,
} from "@/components/ui/channel-toggle";

const ChannelToggleDemo = () => {
  const [muted, setMuted] = createSignal(true);
  const [solo, setSolo] = createSignal(false);
  const [monitor, setMonitor] = createSignal(false);

  return (
    <div class="flex items-center gap-1.5">
      <MuteToggle onPressedChange={setMuted} pressed={muted()}>
        M
      </MuteToggle>
      <SoloToggle onPressedChange={setSolo} pressed={solo()}>
        S
      </SoloToggle>
      <MonitorToggle onPressedChange={setMonitor} pressed={monitor()} size="icon">
        ◖
      </MonitorToggle>
    </div>
  );
};

export default ChannelToggleDemo;
