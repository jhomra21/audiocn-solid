import { createContext, useContext } from "solid-js";

import type { BallisticsInput } from "@/lib/audio/ballistics";
import type { MeterZone, Orientation } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid-context";

export type AudioSize = "sm" | "default" | "lg";

export interface AudioConfig {
  orientation?: Orientation;
  size?: AudioSize;
  disabled?: boolean;
  /** Muted or silenced by another channel's solo: meters render dimmed. */
  dimmed?: boolean;
  minDb?: number;
  maxDb?: number;
  zones?: MeterZone[];
  ballistics?: BallisticsInput;
}

const AudioConfigContext = createContext<AudioConfig>({});

export interface AudioConfigProviderProps {
  value: AudioConfig;
  children?: any;
}

/**
 * Merges `value` over the nearest parent. Getters keep every field reactive
 * without replacing the context object.
 */
export const AudioConfigProvider = (props: AudioConfigProviderProps) => {
  const parent = useContext(AudioConfigContext);

  const merged: AudioConfig = {
    get ballistics() {
      return props.value.ballistics ?? parent.ballistics;
    },
    get dimmed() {
      return (props.value.dimmed ?? false) || (parent.dimmed ?? false);
    },
    get disabled() {
      return (props.value.disabled ?? false) || (parent.disabled ?? false);
    },
    get maxDb() {
      return props.value.maxDb ?? parent.maxDb;
    },
    get minDb() {
      return props.value.minDb ?? parent.minDb;
    },
    get orientation() {
      return props.value.orientation ?? parent.orientation;
    },
    get size() {
      return props.value.size ?? parent.size;
    },
    get zones() {
      return props.value.zones ?? parent.zones;
    },
  };

  return provideContext(AudioConfigContext, merged, () => props.children);
};

export const useAudioConfig = (): AudioConfig => useContext(AudioConfigContext);
