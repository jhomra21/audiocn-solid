import { For, createMemo } from "solid-js";
import type { ComponentProps } from "solid-js";

import { useFrameSource } from "@/hooks/use-frame-source";
import { formatDb, SILENCE_DB } from "@/lib/audio/decibels";
import type { FrameSource, MeterFrame, MeterZone } from "@/lib/audio/types";
import { omitProps } from "@/lib/props";
import { setRefValue } from "@/lib/ref";
import type { RefTarget } from "@/lib/ref";
import { createCompatEffect } from "@/lib/solid-effect";
import { mergeStyleVars } from "@/lib/style";
import type { StyleValue } from "@/lib/style";
import { DEFAULT_ZONES, zoneForDb } from "@/lib/audio/zones";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_MS = 250;

const DEFAULT_FLOOR_DB = -60;

const WIDEST_MAGNITUDE_DB = 88.8;

type SpanElementProps = Omit<
  ComponentProps<"span">,
  "class" | "className" | "ref" | "style"
>;

type SpanProps = SpanElementProps & {
  class?: string;
  className?: string;
  style?: StyleValue;
  ref?: RefTarget<HTMLSpanElement>;
};

const OWN_PROPS = [
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
] as const;

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
  /** A level in dB, for declarative use. */
  value?: number;
  /** A meter source; the readout updates itself without rerendering Solid. */
  source?: FrameSource<MeterFrame> | null;
  /** Which measurement to show. Default `peak`. */
  measure?: "peak" | "rms";
  /** A channel index, or `max` for the loudest channel. Default `max`. */
  channel?: number | "max";
  /** How often the text changes. Default 250 ms. */
  intervalMs?: number;
  /** Show the highest value seen within this window. Default 0. */
  holdMs?: number;
  /** Digits after the decimal point. Default 1. */
  decimals?: number;
  /** Append " dB". Default true. */
  unit?: boolean;
  /** At or below this level, show "−∞". Default −60. */
  floorDb?: number;
  /** Zones used for `data-zone`. */
  zones?: MeterZone[];
  /** Replaces all formatting. */
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
  const rest = omitProps(props, OWN_PROPS);
  const measure = () => props.measure ?? "peak";
  const channel = () => props.channel ?? "max";
  const intervalMs = () => props.intervalMs ?? DEFAULT_INTERVAL_MS;
  const holdMs = () => props.holdMs ?? 0;
  const decimals = () => props.decimals ?? 1;
  const unit = () => props.unit ?? true;
  const floorDb = () => props.floorDb ?? DEFAULT_FLOOR_DB;
  const zones = () => props.zones ?? DEFAULT_ZONES;

  let element: HTMLSpanElement | undefined;
  let peak = SILENCE_DB;
  let peakAt = 0;
  let shown: string | null = null;
  let fresh = false;
  let wake = noop;

  const renderDb = (db: number) =>
    props.format
      ? props.format(db)
      : formatDb(db, {
          decimals: decimals(),
          floorDb: floorDb(),
          unit: unit(),
        });

  const initialDb = createMemo(() => props.value ?? SILENCE_DB);

  const widest = createMemo(() => {
    const floor = floorDb();
    const precision = decimals();

    const justAboveFloor = Number.isFinite(floor)
      ? floor + 10 ** -precision
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

      element.dataset.zone = zoneForDb(db, zones());
      element.toggleAttribute("data-silent", db <= floorDb());
    }

    return changed;
  };

  useFrameSource(
    () => props.source,
    (frame) => {
      const db = readChannel(frame, measure(), channel());
      const now = performance.now();

      if (db >= peak || now - peakAt > holdMs()) {
        peak = db;
        peakAt = now;
      }

      fresh = true;
      wake();
    }
  );

  createCompatEffect(
    () => ({
      source: props.source,
      cadence: intervalMs(),
    }),
    ({ source, cadence }) => {
      if (!source) {
        return;
      }

      shown = null;
      peak = SILENCE_DB;
      peakAt = 0;
      fresh = false;
      write(initialDb());

      const ticker = createTicker(() => {
        const changed = write(peak);

        if (holdMs() === 0) {
          peak = SILENCE_DB;
        }

        const hadFreshFrame = fresh;
        fresh = false;

        return changed || hadFreshFrame;
      }, cadence);

      wake = ticker.wake;
      ticker.wake();

      return () => {
        wake = noop;
        ticker.stop();
      };
    }
  );


  const style = createMemo<StyleValue>(() =>
    mergeStyleVars(props.style, {
      "--db-readout-width": `${widest()}ch`,
    })
  );

  const setRef = (node: HTMLSpanElement) => {
    element = node;
    setRefValue(props.ref, node);
  };

  const span = () => (
    <span
      class={cn(
        "inline-block min-w-(--db-readout-width) text-end font-mono tabular-nums",
        props.class,
        props.className
      )}
      data-silent={initialDb() <= floorDb() ? "" : undefined}
      data-slot="db-readout"
      data-zone={zoneForDb(initialDb(), zones())}
      ref={setRef}
      style={style()}
      {...rest}
    >
      {renderDb(initialDb())}
    </span>
  );

  return <For each={[Boolean(props.source)]}>{() => span()}</For>;
};
