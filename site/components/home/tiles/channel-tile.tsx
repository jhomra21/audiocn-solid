import { createSignal } from "solid-js";

import { HeadphonesIcon } from "@/components/icons/phosphor";
import {
  MonitorToggle,
  MuteToggle,
  SoloToggle,
} from "@/components/ui/channel-toggle";
import { Fader } from "@/components/ui/fader";
import { formatPan, PanControl } from "@/components/ui/pan-control";
import { formatDb } from "@/lib/audio/decibels";

const ChannelTile = () => {
  const [muted, setMuted] = createSignal(false);
  const [solo, setSolo] = createSignal(true);
  const [monitor, setMonitor] = createSignal(false);
  const [pan, setPan] = createSignal(-0.3);
  const [sendDb, setSendDb] = createSignal(-9);

  return (
    <div class="flex w-full flex-col gap-4">
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-medium">Vocals</span>
        <div class="flex items-center gap-1.5">
          <MuteToggle
            aria-label="Mute vocals"
            onPressedChange={setMuted}
            pressed={muted()}
          >
            M
          </MuteToggle>
          <SoloToggle
            aria-label="Solo vocals"
            onPressedChange={setSolo}
            pressed={solo()}
          >
            S
          </SoloToggle>
          <MonitorToggle
            aria-label="Monitor vocals"
            onPressedChange={setMonitor}
            pressed={monitor()}
            size="icon"
          >
            <HeadphonesIcon />
          </MonitorToggle>
        </div>
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Pan</span>
          <span class="font-mono">{formatPan(pan())}</span>
        </div>
        <PanControl
          aria-label="Vocals pan"
          onValueChange={setPan}
          value={pan()}
        />
      </div>
      <div class="grid gap-2">
        <div class="flex items-center justify-between text-xs">
          <span class="text-muted-foreground">Reverb send</span>
          <span class="font-mono">{formatDb(sendDb())}</span>
        </div>
        <Fader
          aria-label="Reverb send"
          onValueChange={setSendDb}
          size="sm"
          value={sendDb()}
        />
      </div>
    </div>
  );
};

export default ChannelTile;
