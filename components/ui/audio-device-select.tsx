import * as SelectPrimitive from "@kobalte/core/select";
import type { SelectItemOptions } from "@kobalte/core/select";
import {
  Show,
  createContext,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import type {
  SelectContentProps,
  SelectTriggerProps,
} from "@/components/ui/select";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  JSXElement,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const NONE_VALUE = "__none__";

const EMPTY_COLLECTION_VALUE = "__empty_collection__";

export type AudioDeviceStatus =
  | "available"
  | "unavailable"
  | "permission-required";

export interface AudioDevice {
  id: string;
  label: string;
  isDefault?: boolean;
  status?: AudioDeviceStatus;
  description?: string;
}

interface DeviceItem {
  value: string;
  label: string;
  device?: AudioDevice;
  missing?: boolean;
  none?: boolean;
  emptyCollection?: boolean;
}

interface DeviceContextValue {
  readonly selected: DeviceItem | null;
  readonly items: DeviceItem[];
  readonly loading: boolean;
  readonly permission: "granted" | "prompt" | "denied";
  readonly missing: boolean;
  readonly onRequestPermission?: () => void;
}

const DeviceContext = createContext<DeviceContextValue>();

const useDeviceSelect = (part: string) => {
  const context = useContext(DeviceContext);

  if (!context)
    throw new Error(`${part} must be used inside AudioDeviceSelect.`);

  return context;
};

export const AudioDeviceSelectTrigger = (props: SelectTriggerProps) => {
  const settings = useDeviceSelect("AudioDeviceSelectTrigger");
  const rest = omitProps(props, ["class", "className"]);

  return (
    <SelectTrigger
      class={cn("w-full min-w-0", props.class, props.className)}
      data-loading={settings.loading ? "" : undefined}
      data-missing={settings.missing ? "" : undefined}
      data-permission={settings.permission}
      data-slot="audio-device-select-trigger"
      {...rest}
    />
  );
};

export interface AudioDeviceSelectValueProps extends Omit<
  SpanDOMProps,
  "children" | "id"
> {
  id?: string;
  placeholder?: string;
  className?: string;
}

export const AudioDeviceSelectValue = (props: AudioDeviceSelectValueProps) => {
  const settings = useDeviceSelect("AudioDeviceSelectValue");
  const select = SelectPrimitive.useSelectContext();
  const id = () => props.id ?? select.generateId("value");
  createCompatEffect(id, select.registerValueId);
  const rest = omitProps(props, ["class", "className", "placeholder", "id"]);

  return (
    <span
      id={id()}
      data-placeholder-shown={settings.selected ? undefined : ""}
      class={cn("truncate", props.class, props.className)}
      data-slot="audio-device-select-value"
      {...rest}
    >
      {settings.selected?.label ??
        (settings.loading
          ? "Finding devices…"
          : (props.placeholder ?? "Select a device"))}
    </span>
  );
};

type NativeItemProps = Parameters<typeof SelectPrimitive.Item>[0];

export interface AudioDeviceSelectItemProps
  extends NativeItemProps, SelectItemOptions {
  device?: AudioDevice;
  className?: string;
}

export const AudioDeviceSelectItem = (props: AudioDeviceSelectItemProps) => {
  const rest = omitProps(props, [
    "class",
    "className",
    "device",
    "children",
    "item",
  ]);

  return (
    <SelectPrimitive.Item
      item={props.item}
      class={cn(
        "data-highlighted:bg-accent data-highlighted:text-accent-foreground relative flex cursor-default items-start rounded-lg px-2 py-1.5 text-sm outline-none data-disabled:opacity-50",
        props.class,
        props.className
      )}
      data-slot="audio-device-select-item"
      {...rest}
    >
      <SelectPrimitive.ItemLabel>
        {props.children ?? (
          <span class="flex min-w-0 flex-col">
            <span class="flex items-center gap-2">
              <span class="truncate">{props.device?.label}</span>
              <Show
                when={
                  props.device?.isDefault &&
                  !props.device.label.startsWith("Default")
                }
              >
                <span class="text-muted-foreground text-xs">Default</span>
              </Show>
            </span>
            <Show when={props.device?.description}>
              <span class="text-muted-foreground text-xs">
                {props.device?.description}
              </span>
            </Show>
          </span>
        )}
      </SelectPrimitive.ItemLabel>
      <SelectPrimitive.ItemIndicator class="ml-auto pl-2">
        ✓
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
};

export interface AudioDeviceSelectPermissionProps extends DivDOMProps {
  message?: string;
  actionLabel?: string;
  className?: string;
}

export const AudioDeviceSelectPermission = (
  props: AudioDeviceSelectPermissionProps
) => {
  const settings = useDeviceSelect("AudioDeviceSelectPermission");

  const rest = omitProps(props, [
    "class",
    "className",
    "message",
    "actionLabel",
  ]);

  return (
    <div
      class={cn(
        "text-muted-foreground flex flex-col items-start gap-2 p-2 text-xs",
        props.class,
        props.className
      )}
      data-slot="audio-device-select-permission"
      {...rest}
    >
      <p>
        {props.message ??
          (settings.permission === "denied"
            ? "Microphone access is blocked. Allow it in your browser's site settings."
            : "Allow microphone access to see your devices.")}
      </p>
      <Show
        when={settings.permission !== "denied" && settings.onRequestPermission}
      >
        <Button
          onClick={() => settings.onRequestPermission?.()}
          size="xs"
          variant="outline"
        >
          {props.actionLabel ?? "Allow access"}
        </Button>
      </Show>
    </div>
  );
};

export const AudioDeviceSelectContent = (props: SelectContentProps) => {
  const settings = useDeviceSelect("AudioDeviceSelectContent");
  const rest = omitProps(props, ["children"]);

  return (
    <SelectContent data-slot="audio-device-select-content" {...rest}>
      {props.children ?? (
        <>
          <Show when={settings.permission !== "granted"}>
            <AudioDeviceSelectPermission />
          </Show>
          <Show when={settings.loading}>
            <p class="text-muted-foreground p-2 text-xs">Finding devices…</p>
          </Show>
          <SelectPrimitive.Listbox />
          <Show
            when={
              !settings.loading &&
              !settings.items.length &&
              settings.permission === "granted"
            }
          >
            <p class="text-muted-foreground p-2 text-xs">No devices found.</p>
          </Show>
        </>
      )}
    </SelectContent>
  );
};

export const AudioDeviceSelectPreview = (
  props: DivDOMProps & { className?: string }
) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <div
      class={cn(
        "bg-muted/20 overflow-hidden rounded-lg border px-2",
        props.class,
        props.className
      )}
      data-slot="audio-device-select-preview"
      {...rest}
    />
  );
};

export interface AudioDeviceSelectProps {
  devices: AudioDevice[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (id: string | null) => void;
  allowNone?: boolean;
  noneLabel?: string;
  loading?: boolean;
  permission?: "granted" | "prompt" | "denied";
  onRequestPermission?: () => void;
  disabled?: boolean;
  children?: JSXElement;
}

export const AudioDeviceSelect = (props: AudioDeviceSelectProps) => {
  const [uncontrolled, setUncontrolled] = createSignal<string | null>(
    props.defaultValue ?? null
  );

  const value = () =>
    props.value === undefined ? uncontrolled() : props.value;

  const knownLabels = new Map<string, string>();
  createCompatEffect(
    () => props.devices.map((device) => [device.id, device.label] as const),
    (devices) => {
      for (const [id, label] of devices) knownLabels.set(id, label);
    }
  );

  const missing = () =>
    value() !== null &&
    !props.loading &&
    !props.devices.some((device) => device.id === value());

  const items = createMemo<DeviceItem[]>(() => {
    const list: DeviceItem[] = [];

    if (props.allowNone)
      list.push({
        value: NONE_VALUE,
        label: props.noneLabel ?? "None",
        none: true,
      });

    for (const device of props.devices)
      list.push({ value: device.id, label: device.label, device });
    const selected = value();

    if (missing() && selected !== null)
      list.push({
        value: selected,
        label: `${knownLabels.get(selected) ?? "Unknown device"} (disconnected)`,
        missing: true,
      });

    return list;
  });

  const selectOptions = createMemo<DeviceItem[]>(() =>
    items().length > 0
      ? items()
      : [
          {
            emptyCollection: true,
            label: "No selectable devices",
            value: EMPTY_COLLECTION_VALUE,
          },
        ]
  );

  const selected = () =>
    items().find(
      (item) =>
        item.value ===
        (value() === null && props.allowNone ? NONE_VALUE : value())
    ) ?? null;

  const settings: DeviceContextValue = {
    get selected() {
      return selected();
    },
    get items() {
      return items();
    },
    get loading() {
      return props.loading ?? false;
    },
    get permission() {
      return props.permission ?? "granted";
    },
    get missing() {
      return missing();
    },
    get onRequestPermission() {
      return props.onRequestPermission;
    },
  };

  return provideContext(DeviceContext, settings, () => (
    <Select<DeviceItem>
      options={selectOptions()}
      optionValue="value"
      optionTextValue="label"
      optionDisabled={(item) =>
        Boolean(item.emptyCollection) ||
        Boolean(item.missing) ||
        Boolean(item.device?.status && item.device.status !== "available")
      }
      value={selected()}
      disabled={props.disabled}
      placeholder={props.loading ? "Finding devices…" : "Select a device"}
      onChange={(next) => {
        if (next?.emptyCollection) return;

        const id = !next || next.value === NONE_VALUE ? null : next.value;

        if (props.value === undefined) setUncontrolled(id);
        props.onValueChange?.(id);
      }}
      itemComponent={(itemProps) => (
        <AudioDeviceSelectItem
          aria-hidden={itemProps.item.rawValue.emptyCollection ? "true" : undefined}
          class={itemProps.item.rawValue.emptyCollection ? "hidden" : undefined}
          item={itemProps.item}
          device={itemProps.item.rawValue.device}
        >
          {itemProps.item.rawValue.emptyCollection ||
          itemProps.item.rawValue.none ||
          itemProps.item.rawValue.missing
            ? itemProps.item.rawValue.label
            : undefined}
        </AudioDeviceSelectItem>
      )}
    >
      {props.children ?? (
        <>
          <AudioDeviceSelectTrigger>
            <AudioDeviceSelectValue />
          </AudioDeviceSelectTrigger>
          <AudioDeviceSelectContent />
        </>
      )}
    </Select>
  ));
};
