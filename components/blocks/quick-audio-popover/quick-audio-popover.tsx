import { createSignal, createUniqueId } from "solid-js";

import {
  MicrophoneIcon,
  MicrophoneSlashIcon,
} from "@/components/icons/phosphor";
import { AudioDeviceSelect } from "@/components/ui/audio-device-select";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useMicrophone } from "@/hooks/use-microphone";
import { useSystemAudio } from "@/hooks/use-system-audio";
import type { JSXElement } from "@/lib/solid/jsx-types";

export interface QuickAudioPopoverProps {
  children?: JSXElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export const QuickAudioPopover = (props: QuickAudioPopoverProps) => {
  const systemAudioId = createUniqueId();
  const devices = useAudioDevices();
  const [deviceId, setDeviceId] = createSignal<string | null>(null);
  const [muted, setMuted] = createSignal(false);

  const microphone = useMicrophone({
    get deviceId() {
      return deviceId();
    },
  });

  const analyser = useAudioAnalyser(() => microphone.stream, {
    get enabled() {
      return !muted();
    },
  });

  const system = useSystemAudio();
  const live = () => microphone.status === "active" && !muted();

  const placement = () =>
    props.align && props.align !== "center"
      ? (`${props.side ?? "bottom"}-${props.align}` as const)
      : (props.side ?? "bottom");

  return (
    <Popover placement={placement()}>
      <PopoverTrigger
        aria-label={live() ? "Audio: microphone live" : "Audio settings"}
        variant="outline"
      >
        {live() ? (
          <MicrophoneIcon data-icon="inline-start" />
        ) : (
          <MicrophoneSlashIcon data-icon="inline-start" />
        )}
        <BarVisualizer
          aria-hidden="true"
          barCount={5}
          class="text-foreground h-4 w-8 [--bar-gap:2px] [--bar-width:3px]"
          minLevel={0.15}
          source={live() ? analyser.visual : null}
        />
      </PopoverTrigger>
      <PopoverContent class="w-80">
        <PopoverHeader>
          <PopoverTitle>Audio</PopoverTitle>
          <PopoverDescription>Microphone and system audio.</PopoverDescription>
        </PopoverHeader>
        <FieldGroup>
          <Field>
            <FieldLabel>Microphone</FieldLabel>
            <AudioDeviceSelect
              devices={devices.devices}
              loading={devices.isLoading}
              onRequestPermission={() => void devices.requestPermission()}
              onValueChange={setDeviceId}
              permission={
                devices.permission === "unsupported"
                  ? "denied"
                  : devices.permission
              }
              value={deviceId()}
            />
          </Field>
          <div class="flex gap-2">
            <Button
              class="flex-1"
              onClick={() =>
                microphone.status === "active"
                  ? microphone.stop()
                  : void microphone.start()
              }
              size="sm"
              variant="outline"
            >
              {microphone.status === "active" ? "Turn off" : "Turn on"}
            </Button>
            <Button
              class="flex-1"
              disabled={microphone.status !== "active"}
              onClick={() => setMuted((value) => !value)}
              size="sm"
              variant={muted() ? "destructive" : "outline"}
            >
              {muted() ? "Unmute" : "Mute"}
            </Button>
          </div>
          <Separator />
          <Field orientation="horizontal">
            <FieldLabel for={systemAudioId}>System audio</FieldLabel>
            <Switch
              checked={system.status === "active"}
              disabled={!system.isSupported}
              id={systemAudioId}
              onCheckedChange={(checked) =>
                checked ? void system.start() : system.stop()
              }
            />
          </Field>
          {props.children}
        </FieldGroup>
      </PopoverContent>
    </Popover>
  );
};
