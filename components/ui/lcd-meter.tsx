import { For, Show, createContext, useContext } from "solid-js";
import type { Accessor } from "solid-js";

import { DbScale } from "@/components/ui/db-scale";
import { useLcdDisplay } from "@/components/ui/lcd-display";
import {
  LevelMeter,
  LevelMeterChannel,
  LevelMeterClip,
  LevelMeterValue,
  useLevelMeter,
} from "@/components/ui/level-meter";
import type {
  LevelMeterChannelProps,
  LevelMeterClipProps,
  LevelMeterProps,
  LevelMeterValueProps,
} from "@/components/ui/level-meter";
import { formatDb } from "@/lib/audio/decibels";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type { DivDOMProps, SpanDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

const ChannelContext = createContext<Accessor<number> | null>(null);

const PERIOD =
  "[--lcd-meter-period:calc(var(--lcd-meter-segment)_+_var(--lcd-meter-gap))]";

const ON_GRID =
  "ml-(--lcd-meter-nudge-x) w-[calc(round(down,_100%_-_var(--lcd-meter-nudge-x)_+_var(--lcd-meter-gap),_var(--lcd-meter-period))_-_var(--lcd-meter-gap))]";

const channelLabel = (index: number, count: number) =>
  count === 2
    ? index === 0
      ? "L"
      : "R"
    : count > 2
      ? String(index + 1)
      : null;

const lcdMeterSize = {
  default: "[--lcd-meter-thickness:calc(var(--lcd-display-pitch)*7)]",
  lg: "[--lcd-meter-thickness:calc(var(--lcd-display-pitch)*10)]",
  sm: "[--lcd-meter-thickness:calc(var(--lcd-display-pitch)*5)]",
} as const;

export type LcdMeterChannelProps = LevelMeterChannelProps;

export const LcdMeterChannel = (props: LcdMeterChannelProps) =>
  provideContext(
    ChannelContext,
    () => props.index ?? 0,
    () => (
      <LevelMeterChannel
        {...props}
        class={cn(
          "col-span-full grid grid-cols-subgrid items-center",
          props.class,
          props.className
        )}
        data-slot="lcd-meter-channel"
      />
    )
  );

export const LcdMeterLabel = (props: SpanDOMProps & { className?: string }) => (
  <span
    {...props}
    class={cn(
      "col-start-1 min-w-[round(up,_1.5em,_var(--lcd-display-pitch))] text-(--lcd-display-ink-dim)",
      props.class,
      props.className
    )}
    data-slot="lcd-meter-label"
  />
);

export const LcdMeterTrack = (props: DivDOMProps & { className?: string }) => {
  const display = useLcdDisplay();

  return (
    <div
      {...props}
      class={cn(
        "relative col-start-2 h-(--lcd-meter-thickness)",
        PERIOD,
        ON_GRID,
        !display?.matrix() &&
          "mask-[radial-gradient(circle,#000_58%,transparent_64%)] mask-size-[var(--lcd-display-pitch)_var(--lcd-display-pitch)]",
        props.class,
        props.className
      )}
      data-slot="lcd-meter-track"
    >
      <div
        class="absolute inset-0 bg-(--lcd-meter-unlit) mask-[repeating-linear-gradient(to_right,#000_0_var(--lcd-meter-segment),transparent_var(--lcd-meter-segment)_var(--lcd-meter-period))]"
        data-slot="lcd-meter-segments"
      >
        {props.children}
      </div>
    </div>
  );
};

export interface LcdMeterBarProps extends DivDOMProps {
  measure?: "peak" | "rms";
  className?: string;
}

export const LcdMeterBar = (props: LcdMeterBarProps) => (
  <div
    {...omitProps(props, ["measure", "class", "className"])}
    aria-hidden="true"
    class={cn(
      "absolute inset-0 bg-(--lcd-display-lit) [clip-path:inset(0_calc(100%_-_round(up,_var(--meter-level)_*_100%,_var(--lcd-meter-period)))_0_0)]",
      props.measure === "rms" && "[--meter-level:var(--meter-rms)]",
      props.class,
      props.className
    )}
    data-slot="lcd-meter-bar"
    data-measure={props.measure ?? "peak"}
  />
);

export const LcdMeterHold = (props: DivDOMProps & { className?: string }) => (
  <div
    {...omitProps(props, ["class", "className"])}
    aria-hidden="true"
    class={cn(
      "absolute inset-y-0 left-[calc(round(up,_var(--meter-hold)_*_100%,_var(--lcd-meter-period))_-_var(--lcd-meter-period))] w-(--lcd-meter-segment) bg-(--lcd-display-lit) opacity-[calc(var(--meter-hold)_*_1000)]",
      props.class,
      props.className
    )}
    data-slot="lcd-meter-hold"
  />
);

export type LcdMeterValueProps = LevelMeterValueProps;

export const LcdMeterValue = (props: LcdMeterValueProps) => {
  const channel = useContext(ChannelContext);

  return (
    <LevelMeterValue
      {...props}
      channel={props.channel ?? channel?.() ?? "max"}
      class={cn(
        "col-start-3 min-w-[calc(var(--db-readout-width)*1.2)] font-(family-name:--lcd-display-font) text-(--lcd-display-lit)",
        props.class,
        props.className
      )}
      unit={props.unit ?? false}
      data-slot="lcd-meter-value"
    />
  );
};

export interface LcdMeterScaleProps extends DivDOMProps {
  ticks?: number[];
  format?: (db: number) => string;
  bracket?: boolean;
  className?: string;
}

export const LcdMeterScale = (props: LcdMeterScaleProps) => {
  const { maxDb, minDb, taper, zones } = useLevelMeter("LcdMeterScale");

  const clipFromDb = () =>
    Math.min(
      ...zones()
        .filter((zone) => zone.zone === "clip")
        .map((zone) => zone.fromDb)
    );

  return (
    <div
      {...omitProps(props, [
        "ticks",
        "format",
        "bracket",
        "class",
        "className",
      ])}
      class={cn(
        "col-start-2 flex flex-col gap-(--lcd-display-pitch)",
        PERIOD,
        ON_GRID,
        props.class,
        props.className
      )}
      data-slot="lcd-meter-scale"
    >
      <Show when={props.bracket !== false && clipFromDb() < maxDb()}>
        <div
          aria-hidden="true"
          class="relative h-[calc(var(--lcd-display-pitch)*2)]"
          data-slot="lcd-meter-bracket"
          style={{
            "--lcd-meter-bracket-start": taper()
              .toPosition(clipFromDb())
              .toFixed(4),
          }}
        >
          <div class="absolute inset-y-0 right-0 left-[round(down,_var(--lcd-meter-bracket-start)_*_100%,_var(--lcd-meter-period))] border-x-(length:--lcd-display-pitch) border-t-(length:--lcd-display-pitch) border-(--lcd-display-ink-dim)" />
        </div>
      </Show>
      <DbScale
        class="h-4 text-[0.75em] text-(--lcd-display-ink-dim) [&_[data-slot=db-scale-mark]]:hidden"
        format={
          props.format ??
          ((db) =>
            formatDb(db, {
              decimals: 0,
              sign: db > 0 ? "auto" : "never",
              unit: false,
            }))
        }
        maxDb={maxDb()}
        minDb={minDb()}
        orientation="horizontal"
        taper={taper()}
        ticks={
          props.ticks ??
          [6, 3, 0, -3, -6, -12, -24, -48].filter(
            (tick) => tick >= minDb() && tick <= maxDb()
          )
        }
      />
    </div>
  );
};

export type LcdMeterClipProps = LevelMeterClipProps;

export const LcdMeterClip = (props: LcdMeterClipProps) => (
  <LevelMeterClip
    {...props}
    class={cn(
      "col-start-3 h-auto self-end justify-self-end rounded-sm px-1 py-0.5 text-[0.75em] font-normal text-(--lcd-meter-unlit) uppercase transition-none hover:bg-transparent focus-visible:ring-1 focus-visible:ring-(--lcd-display-lit) data-clipping:bg-(--lcd-display-lit) data-clipping:text-(--lcd-display-glass)",
      props.class,
      props.className
    )}
    data-slot="lcd-meter-clip"
  >
    {props.children ?? "CLIP"}
  </LevelMeterClip>
);

export type LcdMeterProps = Omit<
  LevelMeterProps,
  "orientation" | "segments" | "size" | "variant"
>;

const LcdMeterRows = () => {
  const { channelCount } = useLevelMeter("LcdMeter");

  return (
    <>
      <For each={Array.from({ length: channelCount() }, (_, index) => index)}>
        {(index) => {
          const label = () => channelLabel(index, channelCount());

          return (
            <LcdMeterChannel index={index}>
              <Show when={label()}>
                <LcdMeterLabel>{label()}</LcdMeterLabel>
              </Show>
              <LcdMeterTrack>
                <LcdMeterBar />
                <LcdMeterHold />
              </LcdMeterTrack>
              <LcdMeterValue />
            </LcdMeterChannel>
          );
        }}
      </For>
      <LcdMeterScale />
      <LcdMeterClip />
    </>
  );
};

export const LcdMeter = (props: LcdMeterProps) => {
  const display = useLcdDisplay();
  let root: HTMLDivElement | null = null;

  createCompatEffect(
    () => true,
    () => {
      const content = root?.closest<HTMLElement>(
        "[data-slot=lcd-display-content]"
      );

      if (!root || !content) return;
      const element = root;
      let nudgeX = 0;
      let nudgeY = 0;

      const toNextDot = (distance: number, pitch: number) => {
        const past = ((distance % pitch) + pitch) % pitch;

        return past < 0.01 || pitch - past < 0.01 ? 0 : pitch - past;
      };

      const align = () => {
        const track = element.querySelector<HTMLElement>(
          "[data-slot=lcd-meter-track]"
        );

        const width = getComputedStyle(content).maskSize.split(" ")[0] ?? "";
        const pitch = width.endsWith("px") ? Number.parseFloat(width) : 0;
        let x = 0;
        let y = 0;

        if (track && pitch > 0) {
          const origin = content.getBoundingClientRect();
          const rect = track.getBoundingClientRect();
          x = toNextDot(rect.left - nudgeX - origin.left, pitch);
          y = toNextDot(rect.top - nudgeY - origin.top, pitch);
        }

        if (x !== nudgeX) {
          nudgeX = x;
          element.style.setProperty("--lcd-meter-nudge-x", `${x}px`);
        }

        if (y !== nudgeY) {
          nudgeY = y;
          element.style.setProperty("--lcd-meter-nudge-y", `${y}px`);
        }
      };

      const resize =
        typeof ResizeObserver === "undefined"
          ? undefined
          : new ResizeObserver(align);

      const observe = () => {
        resize?.disconnect();
        resize?.observe(content);

        for (const label of element.querySelectorAll(
          "[data-slot=lcd-meter-label]"
        ))
          resize?.observe(label);
        align();
      };

      const mutation = new MutationObserver(observe);
      mutation.observe(element, {
        childList: true,
        characterData: true,
        subtree: true,
      });
      observe();

      return () => {
        resize?.disconnect();
        mutation.disconnect();
      };
    }
  );

  if (!display) throw new Error("LcdMeter must be used inside LcdDisplay.");

  return (
    <LevelMeter
      {...props}
      ref={(element) => {
        root = element;
        setRefValue(props.ref, element);
      }}
      class={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[calc(var(--lcd-display-pitch)*4)] gap-y-[calc(var(--lcd-display-pitch)*2)] pt-[calc(0.75rem_+_var(--lcd-meter-nudge-y))] pb-3 has-[[data-slot=db-scale]]:pb-3",
        "[--lcd-meter-gap:var(--lcd-display-pitch)] [--lcd-meter-nudge-x:0px] [--lcd-meter-nudge-y:0px] [--lcd-meter-segment:calc(var(--lcd-display-pitch)*3)] [--lcd-meter-unlit:color-mix(in_oklab,var(--lcd-display-lit)_14%,transparent)]",
        lcdMeterSize[display.size()],
        props.class,
        props.className
      )}
      data-slot="lcd-meter"
      orientation="horizontal"
      size={display.size()}
      taper={props.taper ?? "audio"}
    >
      {props.children ?? <LcdMeterRows />}
    </LevelMeter>
  );
};
