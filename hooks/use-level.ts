import { createMemo, createSignal } from "solid-js";

import { useFrameSource } from "@/hooks/use-frame-source";
import { SILENCE_DB } from "@/lib/audio/decibels";
import type {
  FrameSource,
  MeterFrame,
  MeterZone,
  MeterZoneName,
} from "@/lib/audio/types";
import { DEFAULT_ZONES, zoneForDb } from "@/lib/audio/zones";
import { readMaybeAccessor } from "@/lib/solid/accessor";
import type { MaybeAccessor } from "@/lib/solid/accessor";
import { createCompatEffect } from "@/lib/solid/effect";

export interface UseLevelOptions {
  /** Sampling interval, in milliseconds. Default 250. */
  intervalMs?: number;
  channel?: number | "max";
  zones?: MeterZone[];
  enabled?: boolean;
}

export interface LevelState {
  readonly peakDb: number;
  readonly rmsDb: number | undefined;
  readonly zone: MeterZoneName;
}

/** Samples a meter for readable labels. Drawing should subscribe directly. */
export const useLevel = (
  source: MaybeAccessor<FrameSource<MeterFrame> | null | undefined>,
  options: MaybeAccessor<UseLevelOptions> = {}
): LevelState => {
  let latest: MeterFrame | null = null;

  const [level, setLevel] = createSignal<Pick<LevelState, "peakDb" | "rmsDb">>({
    peakDb: SILENCE_DB,
    rmsDb: undefined,
  });

  // Memos pass on only a changed value, so an option that is re-read without
  // changing does not restart sampling.
  const enabledOption = createMemo(
    () => readMaybeAccessor(options).enabled ?? true
  );

  const intervalOption = createMemo(
    () => readMaybeAccessor(options).intervalMs ?? 250
  );

  useFrameSource(
    source,
    (frame) => {
      latest = frame;
    },
    () => ({ enabled: enabledOption() })
  );

  createCompatEffect(
    () => ({ enabled: enabledOption(), interval: intervalOption() }),
    ({ enabled, interval }) => {
      if (!enabled) return;

      const timer = setInterval(() => {
        if (!latest) return;
        const channel = readMaybeAccessor(options).channel ?? "max";

        let picked =
          channel === "max" ? latest.channels[0] : latest.channels[channel];

        if (channel === "max") {
          for (const candidate of latest.channels) {
            if (!picked || candidate.peakDb > picked.peakDb) picked = candidate;
          }
        }

        const peakDb = picked?.peakDb ?? SILENCE_DB;
        const rmsDb = picked?.rmsDb;
        setLevel((previous) =>
          previous.peakDb === peakDb && previous.rmsDb === rmsDb
            ? previous
            : { peakDb, rmsDb }
        );
      }, interval);

      return () => clearInterval(timer);
    }
  );

  return {
    get peakDb() {
      return level().peakDb;
    },
    get rmsDb() {
      return level().rmsDb;
    },
    get zone() {
      return zoneForDb(
        level().peakDb,
        readMaybeAccessor(options).zones ?? DEFAULT_ZONES
      );
    },
  };
};
