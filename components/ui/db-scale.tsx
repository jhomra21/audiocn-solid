import {
  For,
  createContext,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import { DEFAULT_MAX_DB, DEFAULT_MIN_DB, formatDb } from "@/lib/audio/decibels";
import { resolveTaper } from "@/lib/audio/taper";
import type { TaperInput } from "@/lib/audio/taper";
import type { Orientation, Taper } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

const DEFAULT_TICKS = [12, 6, 0, -6, -12, -18, -24, -36, -48, -60, -72, -90];

const EDGE = 0.02;

const LABEL_GAP = 3;

const MAJOR_STEP = 12;

export const thinDbScaleLabels = (scale: HTMLElement) => {
  const horizontal = scale.dataset.orientation !== "vertical";
  const entries: { label: HTMLElement; rank: number; value: number }[] = [];

  for (const tick of scale.querySelectorAll<HTMLElement>(
    "[data-slot=db-scale-tick]"
  )) {
    const label = tick.querySelector<HTMLElement>("[data-slot=db-scale-label]");

    if (label) {
      delete label.dataset.hidden;
      entries.push({ label, rank: 3, value: Number(tick.dataset.value) });
    }
  }

  const values = entries.map((entry) => entry.value);
  const top = Math.max(...values);
  const bottom = Math.min(...values);

  for (const entry of entries) {
    if (entry.value === 0) {
      entry.rank = 0;
    } else if (entry.value === top || entry.value === bottom) {
      entry.rank = 1;
    } else if (entry.value % MAJOR_STEP === 0) {
      entry.rank = 2;
    }
  }

  entries.sort((a, b) => a.rank - b.rank || b.value - a.value);

  const kept: [number, number][] = [];

  for (const { label } of entries) {
    const rect = label.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) {
      continue;
    }

    const start = horizontal ? rect.left : rect.top;
    const end = horizontal ? rect.right : rect.bottom;

    const collides = kept.some(
      ([keptStart, keptEnd]) =>
        start < keptEnd + LABEL_GAP && end > keptStart - LABEL_GAP
    );

    if (collides) {
      label.dataset.hidden = "";
    } else {
      kept.push([start, end]);
    }
  }
};

const defaultFormat = (db: number) =>
  formatDb(db, { decimals: 0, unit: false });

interface DbScaleContextValue {
  orientation: () => Orientation;
  side: () => "start" | "end";
  labels: () => boolean;
  taper: () => Taper;
  format: () => (db: number) => string;
}

const DbScaleContext = createContext<DbScaleContextValue | null>(null);

const useDbScale = () => {
  const context = useContext(DbScaleContext);

  if (!context) {
    throw new Error("DbScaleTick must be used inside DbScale.");
  }

  return context;
};

const alignClass = (orientation: Orientation, position: number) => {
  if (orientation === "vertical") {
    if (position < EDGE) {
      return "translate-y-0";
    }

    return position > 1 - EDGE ? "translate-y-full" : "translate-y-1/2";
  }

  if (position < EDGE) {
    return "translate-x-0";
  }

  return position > 1 - EDGE ? "-translate-x-full" : "-translate-x-1/2";
};

const markClass = (horizontal: boolean, major: boolean) => {
  if (horizontal) {
    return major ? "h-1.5 w-px" : "h-1 w-px";
  }

  return major ? "h-px w-1.5" : "h-px w-1";
};

type DivProps = Omit<
  DivDOMProps,
  "children" | "class" | "className" | "ref" | "style"
> & {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
  style?: StyleValue;
  ref?: RefTarget<HTMLDivElement>;
};

export interface DbScaleTickProps extends DivProps {
  value: number;
  /** Major ticks are longer. Default true. */
  major?: boolean;
}

const TICK_OWN_PROPS = [
  "value",
  "major",
  "class",
  "className",
  "children",
  "style",
  "ref",
] as const;

export const DbScaleTick = (props: DbScaleTickProps) => {
  const context = useDbScale();
  const rest = omitProps(props, TICK_OWN_PROPS);
  const position = createMemo(() => context.taper().toPosition(props.value));
  const horizontal = () => context.orientation() === "horizontal";
  const major = () => props.major ?? true;
  const reversed = () => context.side() === "start";

  const style = createMemo(() =>
    mergeStyleVars(props.style, {
      "--tick-position": `${position() * 100}%`,
    })
  );

  return (
    <div
      class={cn(
        "absolute flex items-center gap-0.5",
        horizontal()
          ? "top-0 left-(--tick-position) h-full flex-col"
          : "bottom-(--tick-position) left-0 w-full flex-row",
        reversed() && (horizontal() ? "flex-col-reverse" : "flex-row-reverse"),
        alignClass(context.orientation(), position()),
        props.class,
        props.className
      )}
      data-major={major() ? "" : undefined}
      data-slot="db-scale-tick"
      data-value={props.value}
      ref={(node) => setRefValue(props.ref, node)}
      style={style()}
      {...rest}
    >
      <span
        class={cn("bg-border shrink-0", markClass(horizontal(), major()))}
        data-slot="db-scale-mark"
      />
      {context.labels() ? (
        <span
          class={cn(
            "data-hidden:invisible",
            !horizontal() && "flex-1 text-end"
          )}
          data-slot="db-scale-label"
        >
          {props.children ?? context.format()(props.value)}
        </span>
      ) : null}
    </div>
  );
};

export interface DbScaleProps extends DivProps {
  minDb?: number;
  maxDb?: number;
  ticks?: number[];
  taper?: TaperInput;
  orientation?: Orientation;
  side?: "start" | "end";
  labels?: boolean;
  format?: (db: number) => string;
}

const SCALE_OWN_PROPS = [
  "minDb",
  "maxDb",
  "ticks",
  "taper",
  "orientation",
  "side",
  "labels",
  "format",
  "class",
  "className",
  "children",
  "ref",
] as const;

export const DbScale = (props: DbScaleProps) => {
  const config = useAudioConfig();
  const rest = omitProps(props, SCALE_OWN_PROPS);
  const minDb = () => props.minDb ?? config.minDb ?? DEFAULT_MIN_DB;
  const maxDb = () => props.maxDb ?? config.maxDb ?? DEFAULT_MAX_DB;

  const orientation = () =>
    props.orientation ?? config.orientation ?? "horizontal";

  const side = () => props.side ?? "end";
  const labels = () => props.labels ?? true;
  const format = () => props.format ?? defaultFormat;

  const taper = createMemo(() =>
    resolveTaper(props.taper ?? "linear", minDb(), maxDb())
  );

  const values = createMemo(
    () =>
      props.ticks ??
      DEFAULT_TICKS.filter((tick) => tick >= minDb() && tick <= maxDb())
  );

  const [scale, setScale] = createSignal<HTMLDivElement | null>(null);

  const context: DbScaleContextValue = {
    format,
    labels,
    orientation,
    side,
    taper,
  };

  createCompatEffect(
    () => ({ element: scale(), labels: labels() }),
    ({ element, labels: showLabels }) => {
      if (!(element && showLabels)) {
        return;
      }

      let cancelled = false;
      const thin = () => thinDbScaleLabels(element);
      thin();

      const resize =
        typeof ResizeObserver === "undefined" ? null : new ResizeObserver(thin);

      resize?.observe(element);

      const ticksChanged =
        typeof MutationObserver === "undefined"
          ? null
          : new MutationObserver(thin);

      ticksChanged?.observe(element, {
        attributeFilter: ["style"],
        characterData: true,
        childList: true,
        subtree: true,
      });

      if (typeof document !== "undefined") {
        void document.fonts?.ready.then(() => {
          if (!cancelled) {
            thin();
          }
        });
      }

      return () => {
        cancelled = true;
        resize?.disconnect();
        ticksChanged?.disconnect();
      };
    }
  );

  const setScaleRef = (node: HTMLDivElement) => {
    setScale(node);
    setRefValue(props.ref, node);
  };

  return provideContext(DbScaleContext, context, () => (
    <div
      aria-hidden={"true"}
      class={cn(
        "text-muted-foreground relative shrink-0 text-[0.625rem] leading-none tabular-nums select-none",
        orientation() === "horizontal" ? "h-4 w-full" : "h-full w-7",
        props.class,
        props.className
      )}
      data-orientation={orientation()}
      data-side={side()}
      data-slot="db-scale"
      ref={setScaleRef}
      {...rest}
    >
      {props.children ?? (
        <For each={values()}>{(tick) => <DbScaleTick value={tick} />}</For>
      )}
    </div>
  ));
};
