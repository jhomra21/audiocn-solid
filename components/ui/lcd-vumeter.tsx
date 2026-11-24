import { For, createContext, useContext } from "solid-js";
import type { Accessor } from "solid-js";

import { useLcdDisplayRowLabelId } from "@/components/ui/lcd-display";
import {
  LevelMeter,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterClip,
  LevelMeterScale,
  LevelMeterValue,
  useLevelMeterLayout,
} from "@/components/ui/level-meter";
import type {
  LevelMeterBarProps,
  LevelMeterChannelProps,
  LevelMeterClipProps,
  LevelMeterProps,
  LevelMeterScaleProps,
  LevelMeterValueProps,
} from "@/components/ui/level-meter";
import { useAudioConfig } from "@/hooks/use-audio-config";
import type { Orientation } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

/** The Level Meter's segment count, so the two meters match by default. */
const DEFAULT_SEGMENTS = 24;

const MIN_SEGMENTS = 2;

/** `bar` lights every segment up to the level; `dot` lights only the top one. */
export type LcdVuMeterMode = "bar" | "dot";

const LcdVuMeterContext = createContext<Accessor<LcdVuMeterMode> | null>(null);

/**
 * One mask of evenly spaced segments along the track, with a gap of
 * `--lcd-vumeter-gap` between them. The lit, unlit and hold layers all share it,
 * so their segments line up.
 */
const buildSegmentMask = (orientation: Orientation, segments: number) => {
  const direction = orientation === "horizontal" ? "to right" : "to top";
  const size = `calc(100% / ${segments})`;
  const end = `calc(${size} - var(--lcd-vumeter-gap))`;

  return `repeating-linear-gradient(${direction}, #000 0 ${end}, transparent ${end} ${size})`;
};

/**
 * The inks, mixed from the LCD Display's lit pixels, with `currentColor` as the
 * fallback outside a display.
 */
const LCD_VUMETER_INKS =
  "[--lcd-vumeter-dim:color-mix(in_oklab,var(--lcd-vumeter-ink)_40%,transparent)] [--lcd-vumeter-gap:var(--lcd-display-pitch,2px)] [--lcd-vumeter-ink:var(--lcd-display-lit,currentColor)] [--lcd-vumeter-unlit:color-mix(in_oklab,var(--lcd-vumeter-ink)_14%,transparent)]";

/**
 * The peak level, the RMS level and the hold, snapped down to whole segments,
 * so a segment is either lit or not, like the hardware. Written on the
 * channel, where the meter paints `--meter-level`, `--meter-rms` and
 * `--meter-hold`.
 */
const SNAPPED_LEVELS =
  "[--lcd-vumeter-hold:calc(round(down,var(--meter-hold)*var(--lcd-vumeter-segments),1)/var(--lcd-vumeter-segments))] [--lcd-vumeter-lit:calc(round(down,var(--meter-level)*var(--lcd-vumeter-segments),1)/var(--lcd-vumeter-segments))] [--lcd-vumeter-rms:calc(round(down,var(--meter-rms)*var(--lcd-vumeter-segments),1)/var(--lcd-vumeter-segments))] [--lcd-vumeter-step:calc(1/var(--lcd-vumeter-segments))]";

/** Clips a segment layer to `--lcd-vumeter-from`..`--lcd-vumeter-to` (0..1). */
const SPAN_CLIP: Record<Orientation, string> = {
  horizontal:
    "[clip-path:inset(0_calc((1_-_var(--lcd-vumeter-to))*100%)_0_calc(var(--lcd-vumeter-from)*100%))]",
  vertical:
    "[clip-path:inset(calc((1_-_var(--lcd-vumeter-to))*100%)_0_calc(var(--lcd-vumeter-from)*100%)_0)]",
};

const SEGMENT_LAYER =
  "pointer-events-none absolute inset-0 mask-(--lcd-vumeter-mask)";

type DivProps = DivDOMProps & { className?: string };

/** The track, like the Level Meter's: the unlit segments, with bars on top. */
export const LcdVuMeterTrack = (props: DivProps) => {
  const { orientation } = useLevelMeterLayout("LcdVuMeterTrack");
  const horizontal = () => orientation() === "horizontal";

  return (
    <div
      {...omitProps(props, ["class", "className", "children"])}
      class={cn(
        "relative shrink-0",
        horizontal()
          ? "h-(--meter-thickness) w-full"
          : "h-full w-(--meter-thickness)",
        props.class,
        props.className
      )}
      data-orientation={orientation()}
      data-slot="lcd-vumeter-track"
    >
      <div
        aria-hidden="true"
        class={cn(SEGMENT_LAYER, "bg-(--lcd-vumeter-unlit)")}
        data-slot="lcd-vumeter-unlit"
      />
      {props.children}
    </div>
  );
};

/**
 * The lit segments, like the Level Meter's bar: up to the level, or only the
 * top one in `dot` mode. Layer an `rms` bar over a dimmed `peak` bar for a
 * dual meter.
 */
export const LcdVuMeterBar = (props: LevelMeterBarProps) => {
  const { orientation } = useLevelMeterLayout("LcdVuMeterBar");
  const mode = useContext(LcdVuMeterContext);
  const measure = () => props.measure ?? "peak";

  return (
    <div
      {...omitProps(props, ["class", "className", "measure", "ref", "style"])}
      aria-hidden="true"
      class={cn(
        SEGMENT_LAYER,
        SPAN_CLIP[orientation()],
        "bg-(--lcd-vumeter-ink) [--lcd-vumeter-to:var(--lcd-vumeter-bar)]",
        measure() === "rms"
          ? "[--lcd-vumeter-bar:var(--lcd-vumeter-rms)]"
          : "[--lcd-vumeter-bar:var(--lcd-vumeter-lit)]",
        mode?.() === "dot"
          ? "[--lcd-vumeter-from:max(0,var(--lcd-vumeter-bar)_-_var(--lcd-vumeter-step))]"
          : "[--lcd-vumeter-from:0]",
        props.class,
        props.className
      )}
      data-measure={measure()}
      data-slot="lcd-vumeter-bar"
      ref={(node) => setRefValue(props.ref, node)}
      style={props.style}
    />
  );
};

/** The peak-hold segment, like the Level Meter's hold. */
export const LcdVuMeterHold = (props: DivProps) => {
  const { orientation } = useLevelMeterLayout("LcdVuMeterHold");

  return (
    <div
      {...omitProps(props, ["class", "className"])}
      aria-hidden="true"
      class={cn(
        SEGMENT_LAYER,
        SPAN_CLIP[orientation()],
        "bg-(--lcd-vumeter-ink) opacity-[min(1,var(--lcd-vumeter-hold)*var(--lcd-vumeter-segments))] [--lcd-vumeter-from:max(0,var(--lcd-vumeter-hold)_-_var(--lcd-vumeter-step))] [--lcd-vumeter-to:var(--lcd-vumeter-hold)]",
        props.class,
        props.className
      )}
      data-slot="lcd-vumeter-hold"
    />
  );
};

/**
 * One channel. With no children it renders the Level Meter's default track:
 * a peak bar and the hold, here as segments.
 */
export const LcdVuMeterChannel = (props: LevelMeterChannelProps) => (
  <LevelMeterChannel
    {...props}
    class={cn(SNAPPED_LEVELS, props.class, props.className)}
  >
    {props.children ?? (
      <LcdVuMeterTrack>
        <LcdVuMeterBar />
        <LcdVuMeterHold />
      </LcdVuMeterTrack>
    )}
  </LevelMeterChannel>
);

/**
 * The tracks. With no children it renders one `LcdVuMeterChannel` per channel,
 * following the meter's data, like the Level Meter's default anatomy.
 */
export const LcdVuMeterChannels = (
  props: Parameters<typeof LevelMeterChannels>[0]
) => {
  const { channelCount } = useLevelMeterLayout("LcdVuMeterChannels");

  return (
    <LevelMeterChannels {...props}>
      {props.children ?? (
        <For each={Array.from({ length: channelCount() }, (_, index) => index)}>
          {(index) => <LcdVuMeterChannel index={index} />}
        </For>
      )}
    </LevelMeterChannels>
  );
};

export interface LcdVuMeterProps extends Omit<
  LevelMeterProps,
  "variant" | "segments"
> {
  /** Segments along the track. Default 24, like the Level Meter. */
  segments?: number;
  /** `bar` lights every segment up to the level, `dot` only the top one. Default `bar`. */
  mode?: LcdVuMeterMode;
}

/**
 * A dot-matrix bar-graph meter for the LCD Display. It is a Level Meter, so it
 * takes the same sources, values, ballistics, zones and ARIA; it draws the
 * level as whole segments in the display's ink. Inside an `LcdDisplayRow` it is
 * named by the row's label.
 */
export const LcdVuMeter = (props: LcdVuMeterProps) => {
  const config = useAudioConfig();
  const rowLabelId = useLcdDisplayRowLabelId();
  const mode = () => props.mode ?? "bar";

  // Resolved the way the Level Meter does, so the mask matches its axis.
  const orientation = () =>
    props.orientation ?? config.orientation ?? "horizontal";

  const count = () =>
    Math.max(MIN_SEGMENTS, Math.round(props.segments ?? DEFAULT_SEGMENTS));

  return provideContext(LcdVuMeterContext, mode, () => (
    <LevelMeter
      {...omitProps(props, [
        "aria-labelledby",
        "children",
        "class",
        "className",
        "mode",
        "orientation",
        "segments",
        "style",
      ])}
      aria-labelledby={
        props["aria-labelledby"] ??
        (props["aria-label"] ? undefined : rowLabelId?.())
      }
      class={cn(
        LCD_VUMETER_INKS,
        "min-w-0 [--meter-scale-size:1.25em] data-[orientation=horizontal]:flex-1",
        props.class,
        props.className
      )}
      data-lcd-mode={mode()}
      data-segments={count()}
      orientation={orientation()}
      style={mergeStyleVars(props.style, {
        "--lcd-vumeter-mask": buildSegmentMask(orientation(), count()),
        "--lcd-vumeter-segments": count(),
      })}
      variant="solid"
    >
      {props.children ?? <LcdVuMeterChannels />}
    </LevelMeter>
  ));
};

/** A dB scale in the display's dim ink. Inherits the meter's range and taper. */
export const LcdVuMeterScale = (props: LevelMeterScaleProps) => (
  <LevelMeterScale
    {...props}
    class={cn(
      "text-[0.625em] text-(color:--lcd-vumeter-dim) [&_[data-slot=db-scale-mark]]:bg-(--lcd-vumeter-dim)",
      props.class,
      props.className
    )}
  />
);

/**
 * The level as lit digits, updated at a readable rate. It takes the display's
 * letter spacing as `--db-readout-tracking`, so its reserved width includes the
 * spacing and the meter beside it keeps its width as the digits change.
 */
export const LcdVuMeterValue = (props: LevelMeterValueProps) => (
  <LevelMeterValue
    {...props}
    class={cn(
      "font-(family-name:--lcd-display-font,var(--font-mono)) text-[0.75em] text-(color:--lcd-vumeter-ink) [--db-readout-tracking:0.12em]",
      props.class,
      props.className
    )}
  />
);

/**
 * A clip light: a dot like the Level Meter's, unlit until the signal clips,
 * then lit for the hold time. It is the Level Meter's clip indicator, so a
 * click resets it and screen readers hear "Clipping". Children replace the dot.
 */
export const LcdVuMeterClip = (props: LevelMeterClipProps) => (
  <LevelMeterClip
    {...props}
    class={cn(
      "h-auto px-1 py-0.5 text-[0.75em] font-normal text-(color:--lcd-vumeter-unlit) uppercase hover:bg-transparent focus-visible:ring-1 focus-visible:ring-(--lcd-vumeter-ink) data-clipping:text-(color:--lcd-vumeter-ink)",
      props.class,
      props.className
    )}
  >
    {props.children ?? (
      <span
        class="size-[0.6em] shrink-0 rounded-full bg-(--lcd-vumeter-unlit) group-data-clipping/clip-indicator:bg-(--lcd-vumeter-ink)"
        data-slot="lcd-vumeter-clip-light"
      />
    )}
  </LevelMeterClip>
);
