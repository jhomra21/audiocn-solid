import { createSignal } from "solid-js";

import {
  AudioDeviceSelect,
  AudioDeviceSelectContent,
  AudioDeviceSelectPreview,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from "@/components/ui/audio-device-select";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useAudioAnalyser } from "@/hooks/use-audio-analyser";
import { useAudioDevices } from "@/hooks/use-audio-devices";
import { useMicrophone } from "@/hooks/use-microphone";

const AudioDeviceSelectDemo = () => {
  const devices = useAudioDevices();
  const [deviceId, setDeviceId] = createSignal<string | null>(null);

  const microphone = useMicrophone({
    get deviceId() {
      return deviceId();
    },
    get enabled() {
      return deviceId() !== null;
    },
  });

  const analyser = useAudioAnalyser(() => microphone.stream, {
    historySize: 120,
  });

  return (
    <div class="flex w-full max-w-sm flex-col gap-2">
      <AudioDeviceSelect
        devices={devices.devices}
        loading={devices.isLoading}
        onRequestPermission={() => void devices.requestPermission()}
        onValueChange={setDeviceId}
        permission={
          devices.permission === "unsupported" ? "denied" : devices.permission
        }
        value={deviceId()}
      >
        <AudioDeviceSelectTrigger>
          <AudioDeviceSelectValue placeholder="Select a microphone" />
        </AudioDeviceSelectTrigger>
        <AudioDeviceSelectContent />
      </AudioDeviceSelect>
      <AudioDeviceSelectPreview>
        <LiveWaveform
          active={microphone.status === "active"}
          aria-label="Microphone preview"
          barWidth={2}
          class="h-8"
          mode="scrolling"
          source={analyser.visual}
        />
      </AudioDeviceSelectPreview>
    </div>
  );
};

export default AudioDeviceSelectDemo;
