import { createSignal, onCleanup } from "solid-js";

import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export type AudioDeviceKind = "audioinput" | "audiooutput";

export type AudioPermission = "granted" | "prompt" | "denied" | "unsupported";

export interface AudioDeviceInfo {
  id: string;
  label: string;
  kind: AudioDeviceKind;
  groupId: string;
  isDefault: boolean;
}

export interface UseAudioDevicesOptions {
  kind?: AudioDeviceKind;
}

export interface UseAudioDevicesResult {
  readonly devices: AudioDeviceInfo[];
  readonly permission: AudioPermission;
  readonly isLoading: boolean;
  readonly error: Error | null;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

const supported = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.enumerateDevices);

/** Lists devices, observes permission/device changes, and ignores obsolete requests. */
export const useAudioDevices = (
  options: MaybeAccessor<UseAudioDevicesOptions> = {}
): UseAudioDevicesResult => {
  const [devices, setDevices] = createSignal<AudioDeviceInfo[]>([]);
  const [permission, setPermission] = createSignal<AudioPermission>("prompt");
  const [loaded, setLoaded] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);
  let generation = 0;
  let disposed = false;

  onCleanup(() => {
    disposed = true;
    generation++;
  });

  const refresh = async () => {
    if (!supported() || disposed) return;
    const current = ++generation;
    const kind = readMaybeAccessor(options).kind ?? "audioinput";

    try {
      const all = await navigator.mediaDevices.enumerateDevices();

      if (disposed || current !== generation) return;
      const matching: AudioDeviceInfo[] = [];
      let labelled = false;

      for (const device of all) {
        if (device.kind !== kind) continue;
        labelled ||= Boolean(device.label);
        matching.push({
          id: device.deviceId,
          label:
            device.label ||
            `${kind === "audioinput" ? "Microphone" : "Speaker"} ${matching.length + 1}`,
          kind,
          groupId: device.groupId,
          isDefault: device.deviceId === "default",
        });
      }

      if (labelled) setPermission("granted");
      setDevices(matching);
      setError(null);
    } catch (caught) {
      if (disposed || current !== generation) return;
      setError(caught instanceof Error ? caught : new Error(String(caught)));
    }

    setLoaded(true);
  };

  const requestPermission = async () => {
    if (!supported() || disposed) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      for (const track of stream.getTracks()) track.stop();

      if (disposed) return false;
      setPermission("granted");
      await refresh();

      return true;
    } catch (caught) {
      if (disposed) return false;
      setPermission(
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "denied"
          : "prompt"
      );
      setError(caught instanceof Error ? caught : new Error(String(caught)));

      return false;
    }
  };

  createCompatEffect(
    () => readMaybeAccessor(options).kind ?? "audioinput",
    () => {
      if (!supported()) return;
      let cancelled = false;
      const listeners = new AbortController();
      setLoaded(false);
      void refresh();
      navigator.mediaDevices.addEventListener(
        "devicechange",
        () => void refresh(),
        { signal: listeners.signal }
      );

      void (async () => {
        try {
          // SAFETY: microphone is a browser permission name missing from TypeScript's union;
          // unsupported browsers reject this query and use the label fallback.
          const status = await navigator.permissions?.query({
            name: "microphone" as PermissionName,
          });

          if (!status || cancelled) return;
          setPermission(status.state);
          status.addEventListener(
            "change",
            () => {
              setPermission(status.state);
              void refresh();
            },
            { signal: listeners.signal }
          );
        } catch {
          // Browsers without permission queries fall back to device labels.
        }
      })();

      return () => {
        cancelled = true;
        generation++;
        listeners.abort();
      };
    }
  );

  return {
    get devices() {
      return devices();
    },
    get permission() {
      return supported() ? permission() : "unsupported";
    },
    get isLoading() {
      return supported() && !loaded();
    },
    get error() {
      return error();
    },
    refresh,
    requestPermission,
  };
};
