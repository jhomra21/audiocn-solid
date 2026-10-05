import { createSignal } from "solid-js";

import {
  AudioDeviceSelect,
  AudioDeviceSelectContent,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from "@/components/ui/audio-device-select";
import type { AudioDevice } from "@/components/ui/audio-device-select";

export const AudioDevicesApp = () => {
  const [devices, setDevices] = createSignal<AudioDevice[]>([
    { id: "studio", label: "Studio microphone" },
    { id: "builtin", label: "Built-in microphone" },
  ]);

  const [permission, setPermission] = createSignal<
    "granted" | "prompt" | "denied"
  >("prompt");

  const [selected, setSelected] = createSignal<string | null>(null);

  return (
    <main class="mx-auto grid max-w-sm gap-4 p-6">
      <h1>Device selection contracts</h1>
      <AudioDeviceSelect
        devices={devices()}
        value={selected()}
        onValueChange={setSelected}
        allowNone
        permission={permission()}
        onRequestPermission={() => setPermission("granted")}
      >
        <AudioDeviceSelectTrigger aria-label="Microphone device">
          <AudioDeviceSelectValue />
        </AudioDeviceSelectTrigger>
        <AudioDeviceSelectContent />
      </AudioDeviceSelect>
      <button
        onClick={() =>
          setDevices((items) => items.filter((item) => item.id !== "studio"))
        }
      >
        Disconnect studio
      </button>
      <output data-testid="selected-device">{selected() ?? "none"}</output>
    </main>
  );
};
