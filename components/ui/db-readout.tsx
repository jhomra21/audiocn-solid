import { createEffect, createMemo, mergeProps, onCleanup, splitProps } from "solid-js";
import type { JSX } from "solid-js";

import { useFrameSource } from "@/hooks/use-frame-source";
import { formatDb, SILENCE_DB } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame, MeterZone } from "@/lib/audio/types";
import { DEFAULT_ZONES, zoneForDb } from "@/lib/audio/zones";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_MS = 250;
const DEFAULT_FLOOR_DB = -60;
const WIDEST_MAGNITUDE_DB = 88.8;

type Ref<T> = T | ((element: T) => void) | undefined;
type SpanProps = Omit<JSX.HTMLAttributes<HTMLSpanElement>, "children" | "ref">;

const noop = () => {};

const createTicker = (step: () => boolean, intervalMs: number) => {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };

  const wake = () => {
    if (timer === null) {
      timer = setInterval(() => {
        if (!step()) {
          stop();
        }
      }, intervalMs);
    }
  };

  return { stop, wake };
};

export interface DbReadoutProps extends SpanProps {
  ref?: Ref<HTMLSpanElement>;
  className?: string;
  value?: number;
  source?: FrameSource<MeterFrame> | null;
  measure?: "peak" | "rms";
  channel?: number | "max";
  intervalMs?: number;
  holdMs?: number;
  decimals?: number;
  unit?: boolean;
  floorDb?: number;
  zones?: MeterZone[];
  format?: (db: number) => string;
}

export const readChannel = (
  frame: MeterFrame,
  measure: "peak" | "rms",
  channel: number | "max"
) => {
  const read = (index: number) => {
    const level = frame.channels[index];
    if (!level) {
      return SILENCE_DB;
    }
    return measure === "rms" ? (level.rmsDb ?? level.peakDb) : level.peakDb;
  };

  if (channel !== "max") {
    return read(channel);
  }

  let loudest = SILENCE_DB;
  for (let index = 0; index < frame.channels.length; index += 1) {
    loudest = Math.max(loudest, read(index));
  }
  return loudest;
};

export const DbReadout = (props: DbReadoutProps) => {
  const merged = mergeProps(
    {
      measure: "peak" as const,
      channel: "max" as const,
      intervalMs: DEFAULT_INTERVAL_MS,
      holdMs: 0,
      decimals: 1,
      unit: true,
      floorDb: DEFAULT_FLOOR_DB,
      zones: DEFAULT_ZONES,
    },
    props
  );

  const [local, rest] = splitProps(merged, [
    "ref",
    "class",
    "className",
    "style",
    "value",
    "source",
    "measure",
    "channel",
    "intervalMs",
    "holdMs",
    "decimals",
    "unit",
    "floorDb",
    "zones",
    "format",
  ]);

  let element: HTMLSpanElement | undefined;
  let peak = SILENCE_DB;
  let peakAt = 0;
  let shown: string | null = null;
  let fresh = false;
  let wake = noop;

  const renderDb = (db: number) =>
    local.format
      ? local.format(db)
      : formatDb(db, {
          decimals: local.decimals,
          floorDb: local.floorDb,
          unit: local.unit,
        });

  const initialDb = createMemo(() => local.value ?? SILENCE_DB);

  const widest = createMemo(() => {
    const justAboveFloor = Number.isFinite(local.floorDb)
      ? local.floorDb + 10 ** -local.decimals
      : -WIDEST_MAGNITUDE_DB;

    return Math.max(
      ...[
        SILENCE_DB,
        justAboveFloor,
        -WIDEST_MAGNITUDE_DB,
        WIDEST_MAGNITUDE_DB,
      ].map((db) => renderDb(db).length)
    );
  });

  const write = (db: number) => {
    if (!element) {
      return false;
    }

    const text = renderDb(db);
    const changed = text !== shown;

    if (changed) {
      shown = text;
      if (element.firstChild) {
        element.firstChild.nodeValue = text;
      } else {
        element.textContent = text;
      }
      element.dataset.zone = zoneForDb(db, local.zones);
      element.toggleAttribute("data-silent", db <= local.floorDb);
    }

    return changed;
  };

  useFrameSource(
    () => local.source,
    (frame) => {
      const db = readChannel(frame, local.measure, local.channel);
      const now = performance.now();

      if (db >= peak || now - peakAt > local.holdMs) {
        peak = db;
        peakAt = now;
      }

      fresh = true;
      wake();
    }
  );

  createEffect(() => {
    const source = local.source;
    const intervalMs = local.intervalMs;

    if (!source) {
      return;
    }

    shown = null;
    const ticker = createTicker(() => {
      const changed = write(peak);

      if (local.holdMs === 0) {
        peak = SILENCE_DB;
      }

      const hadFreshFrame = fresh;
      fresh = false;
      return changed || hadFreshFrame;
    }, intervalMs);

    wake = ticker.wake;
    ticker.wake();

    onCleanup(() => {
      wake = noop;
      ticker.stop();
    });
  });

  createEffect(() => {
    if (!local.source) {
      shown = null;
      write(initialDb());
    }
  });

  const style = createMemo<JSX.CSSProperties | string>(() => {
    const width = `${widest()}ch`;

    if (typeof local.style === "string") {
      return `--db-readout-width:${width};${local.style}`;
    }

    return {
      "--db-readout-width": width,
      ...(local.style ?? {}),
    } as JSX.CSSProperties;
  });

  const setRef = (node: HTMLSpanElement) => {
    element = node;
    if (typeof local.ref === "function") {
      local.ref(node);
    }
  };

  return (
    <span
      {...rest}
      class={cn(
        "inline-block min-w-(--db-readout-width) text-end font-mono tabular-nums",
        local.class,
        local.className
      )}
      data-silent={initialDb() <= local.floorDb ? "" : undefined}
      data-slot="db-readout"
      data-zone={zoneForDb(initialDb(), local.zones)}
      ref={setRef}
      style={style()}
    >
      {renderDb(initialDb())}
    </span>
  );
};
