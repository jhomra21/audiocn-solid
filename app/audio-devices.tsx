import * as SelectPrimitive from "@kobalte/core/select";
import { createSignal } from "solid-js";

import {
  AudioDeviceSelect,
  AudioDeviceSelectContent,
  AudioDeviceSelectTrigger,
  AudioDeviceSelectValue,
} from "@/components/ui/audio-device-select";
import type { AudioDevice } from "@/components/ui/audio-device-select";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <AudioDeviceSelect
        devices={[
          {
            id: "default",
            label: "Default - MacBook Pro Microphone",
            isDefault: true,
          },
          {
            id: "generic-default",
            label: "MacBook Pro Microphone",
            isDefault: true,
          },
        ]}
      >
        <AudioDeviceSelectTrigger aria-label="Default device labels">
          <AudioDeviceSelectValue />
        </AudioDeviceSelectTrigger>
        <AudioDeviceSelectContent />
      </AudioDeviceSelect>
      <section aria-label="Long device collection">
        <AudioDeviceSelect
          defaultValue="device-70"
          devices={Array.from({ length: 80 }, (_, index) => ({
            id: `device-${index}`,
            label: `Device${String(index).padStart(2, "0")}`,
          }))}
        >
          <AudioDeviceSelectTrigger aria-label="Long device collection">
            <AudioDeviceSelectValue />
          </AudioDeviceSelectTrigger>
          <AudioDeviceSelectContent />
        </AudioDeviceSelect>
      </section>
      <Popover modal>
        <PopoverTrigger>Open settings</PopoverTrigger>
        <PopoverContent aria-label="Select settings">
          <PopoverTitle>Select settings</PopoverTitle>
          <Select
            modal
            defaultValue="Option70"
            options={Array.from(
              { length: 80 },
              (_, index) => `Option${String(index).padStart(2, "0")}`
            )}
            optionDisabled={(option) => option === "Option71"}
            itemComponent={(props) => (
              <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
            )}
          >
            <SelectTrigger aria-label="Generic collection">
              <SelectValue<string>>
                {(state) => state.selectedOption()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectPrimitive.Listbox />
            </SelectContent>
          </Select>
        </PopoverContent>
      </Popover>
    </main>
  );
};
