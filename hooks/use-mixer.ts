import { createSignal } from "solid-js";

import { clamp } from "@/lib/audio/decibels";
import { createCompatEffect } from "@/lib/solid/effect";

export interface MixerChannelState {
  id: string;
  /** Channel gain in dB. */
  gainDb: number;
  muted: boolean;
  solo: boolean;
  /** −1 (left) to 1 (right). */
  pan: number;
  /** Send the channel to the speakers. */
  monitor: boolean;
}

export interface MixerMasterState {
  gainDb: number;
  muted: boolean;
}

export interface MixerState {
  channels: MixerChannelState[];
  master: MixerMasterState;
}

export type MixerChannelInit = Partial<MixerChannelState> & {
  id: string;
};

export interface UseMixerOptions {
  /** Initial channels. Missing fields get defaults. */
  channels?: MixerChannelInit[];
  /** Initial master settings. */
  master?: Partial<MixerMasterState>;
  /** Controlled state. */
  state?: MixerState;
  onStateChange?: (state: MixerState) => void;
  /** Save state to localStorage under this key. */
  persistKey?: string;
}

type MixerAction =
  | {
      type: "replace";
      state: MixerState;
    }
  | {
      type: "channel";
      id: string;
      patch: Partial<Omit<MixerChannelState, "id">>;
    }
  | {
      type: "solo";
      id: string;
      solo: boolean;
      exclusive: boolean;
    }
  | {
      type: "master";
      patch: Partial<MixerMasterState>;
    }
  | {
      type: "add";
      channel: MixerChannelInit;
    }
  | {
      type: "remove";
      id: string;
    };

const DEFAULT_MASTER: MixerMasterState = {
  gainDb: 0,
  muted: false,
};

const createChannel = (init: MixerChannelInit): MixerChannelState => ({
  gainDb: 0,
  monitor: false,
  muted: false,
  pan: 0,
  solo: false,
  ...init,
});

const createState = (
  channels: MixerChannelInit[] = [],
  master: Partial<MixerMasterState> = {}
): MixerState => ({
  channels: channels.map(createChannel),
  master: {
    ...DEFAULT_MASTER,
    ...master,
  },
});

/** The pure mixer reducer, exported for use outside Solid. */
export const mixerReducer = (
  state: MixerState,
  action: MixerAction
): MixerState => {
  switch (action.type) {
    case "replace": {
      return action.state;
    }

    case "channel": {
      return {
        ...state,
        channels: state.channels.map((channel) => {
          if (channel.id !== action.id) {
            return channel;
          }

          const next = {
            ...channel,
            ...action.patch,
          };

          return {
            ...next,
            pan: clamp(next.pan, -1, 1),
          };
        }),
      };
    }

    case "solo": {
      return {
        ...state,
        channels: state.channels.map((channel) => {
          if (channel.id === action.id) {
            return {
              ...channel,
              solo: action.solo,
            };
          }

          if (action.exclusive && action.solo) {
            return {
              ...channel,
              solo: false,
            };
          }

          return channel;
        }),
      };
    }

    case "master": {
      return {
        ...state,
        master: {
          ...state.master,
          ...action.patch,
        },
      };
    }

    case "add": {
      if (state.channels.some((channel) => channel.id === action.channel.id)) {
        return state;
      }

      return {
        ...state,
        channels: [...state.channels, createChannel(action.channel)],
      };
    }

    case "remove": {
      return {
        ...state,
        channels: state.channels.filter((channel) => channel.id !== action.id),
      };
    }

    default: {
      return state;
    }
  }
};

/** Whether a channel is heard: not muted, and soloed if anything is soloed. */
export const isChannelAudible = (state: MixerState, id: string): boolean => {
  const channel = state.channels.find((item) => item.id === id);

  if (!channel || channel.muted) {
    return false;
  }

  const anySolo = state.channels.some((item) => item.solo);

  return !anySolo || channel.solo;
};

const isMixerChannelState = (value: unknown): value is MixerChannelState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "gainDb" in value &&
    typeof value.gainDb === "number" &&
    "muted" in value &&
    typeof value.muted === "boolean" &&
    "solo" in value &&
    typeof value.solo === "boolean" &&
    "pan" in value &&
    typeof value.pan === "number" &&
    "monitor" in value &&
    typeof value.monitor === "boolean"
  );
};

const isMixerMasterState = (value: unknown): value is MixerMasterState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "gainDb" in value &&
    typeof value.gainDb === "number" &&
    "muted" in value &&
    typeof value.muted === "boolean"
  );
};

const isMixerState = (value: unknown): value is MixerState => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("channels" in value) ||
    !Array.isArray(value.channels) ||
    !("master" in value)
  ) {
    return false;
  }

  return (
    value.channels.every(isMixerChannelState) &&
    isMixerMasterState(value.master)
  );
};

const readPersisted = (key: string): MixerState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    return isMixerState(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writePersisted = (key: string, state: MixerState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked; the mixer keeps working without it.
  }
};

export interface Mixer {
  readonly state: MixerState;
  readonly channels: MixerChannelState[];
  readonly master: MixerMasterState;
  channel: (id: string) => MixerChannelState | undefined;
  setGain: (id: string, gainDb: number) => void;
  setMuted: (id: string, muted: boolean) => void;
  setSolo: (
    id: string,
    solo: boolean,
    options?: {
      exclusive?: boolean;
    }
  ) => void;
  setPan: (id: string, pan: number) => void;
  setMonitor: (id: string, monitor: boolean) => void;
  setMasterGain: (gainDb: number) => void;
  setMasterMuted: (muted: boolean) => void;
  /** False when muted, or when another channel is soloed. */
  isAudible: (id: string) => boolean;
  /** True when a channel is silenced only because another is soloed. */
  isDimmed: (id: string) => boolean;
  addChannel: (channel: MixerChannelInit) => void;
  removeChannel: (id: string) => void;
  reset: () => void;
}

/** State for a mixer: gain, mute, solo, pan and monitor per channel, plus a master. */
export const useMixer = (options: UseMixerOptions = {}): Mixer => {
  const initial = createState(options.channels, options.master);

  const [uncontrolled, setUncontrolled] = createSignal<MixerState>(initial);

  const state = () => options.state ?? uncontrolled();

  let latest = state();

  createCompatEffect(state, (next) => {
    latest = next;
  });

  createCompatEffect(
    () => ({
      controlled: options.state !== undefined,
      persistKey: options.persistKey,
    }),
    ({ controlled, persistKey }) => {
      if (controlled || !persistKey) {
        return;
      }

      const persisted = readPersisted(persistKey);

      if (!persisted) {
        return;
      }

      latest = persisted;

      setUncontrolled(persisted);
    }
  );

  const commit = (next: MixerState) => {
    if (next === latest) {
      return;
    }

    latest = next;

    if (options.state === undefined) {
      setUncontrolled(next);

      if (options.persistKey) {
        writePersisted(options.persistKey, next);
      }
    }

    options.onStateChange?.(next);
  };

  const dispatch = (action: MixerAction) => {
    commit(mixerReducer(latest, action));
  };

  const controller: Mixer = {
    addChannel(channel) {
      dispatch({
        channel,
        type: "add",
      });
    },

    channel(id) {
      return state().channels.find((channel) => channel.id === id);
    },

    get channels() {
      return state().channels;
    },

    isAudible(id) {
      return isChannelAudible(state(), id);
    },

    isDimmed(id) {
      const current = state();

      const channel = current.channels.find((item) => item.id === id);

      const anySolo = current.channels.some((item) => item.solo);

      return Boolean(channel && !channel.muted && anySolo && !channel.solo);
    },

    get master() {
      return state().master;
    },

    removeChannel(id) {
      dispatch({
        id,
        type: "remove",
      });
    },

    reset() {
      commit(initial);
    },

    setGain(id, gainDb) {
      dispatch({
        id,
        patch: {
          gainDb,
        },
        type: "channel",
      });
    },

    setMasterGain(gainDb) {
      dispatch({
        patch: {
          gainDb,
        },
        type: "master",
      });
    },

    setMasterMuted(muted) {
      dispatch({
        patch: {
          muted,
        },
        type: "master",
      });
    },

    setMonitor(id, monitor) {
      dispatch({
        id,
        patch: {
          monitor,
        },
        type: "channel",
      });
    },

    setMuted(id, muted) {
      dispatch({
        id,
        patch: {
          muted,
        },
        type: "channel",
      });
    },

    setPan(id, pan) {
      dispatch({
        id,
        patch: {
          pan,
        },
        type: "channel",
      });
    },

    setSolo(id, solo, soloOptions = {}) {
      dispatch({
        exclusive: soloOptions.exclusive ?? false,
        id,
        solo,
        type: "solo",
      });
    },

    get state() {
      return state();
    },
  };

  return controller;
};
