import { Show, createContext, createSignal, useContext } from "solid-js";

import { useFrameSource } from "@/hooks/use-frame-source";
import { useVisibility } from "@/hooks/use-visibility";
import { resampleLevels } from "@/lib/audio/bands";
import { clamp } from "@/lib/audio/decibels";
import { subscribeFrame } from "@/lib/audio/frame-loop";
import { formatTime } from "@/lib/audio/time";
import type { FrameSource } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type { CanvasDOMProps, DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

interface WaveformContextValue {
  readonly peaks: ArrayLike<number> | null;
  readonly duration: number;
  readonly variant: "bars" | "line" | "mirror";
  readonly barWidth: number;
  readonly barGap: number;
  readonly barRadius: number;
  readonly loading: boolean;
  readonly progress: number;
  readonly hover: number | null;
  readonly interactive: boolean;
  timeToPosition: (time: number) => number;
}

const WaveformContext = createContext<WaveformContextValue>();

const useWaveform = (part: string) => {
  const context = useContext(WaveformContext);

  if (!context) throw new Error(`${part} must be used inside Waveform.`);

  return context;
};

interface WaveformCanvasProps extends Omit<CanvasDOMProps, "ref"> {
  className?: string;
  ref?: RefTarget<HTMLCanvasElement>;
}

export const WaveformCanvas = (props: WaveformCanvasProps) => {
  const settings = useWaveform("WaveformCanvas");
  let canvas: HTMLCanvasElement | undefined;
  const visible = useVisibility(() => canvas ?? null);
  createCompatEffect(
    () => ({
      barGap: settings.barGap,
      barRadius: settings.barRadius,
      barWidth: settings.barWidth,
      loading: settings.loading,
      peaks: settings.peaks,
      variant: settings.variant,
    }),
    (options) => {
      const element = canvas;
      const context = element?.getContext("2d");

      if (!(element && context)) return;
      const size = { width: 0, height: 0 };
      let ratio = 1;
      let levels = new Float32Array(0);
      let lastProgress = -1;
      let colors = { played: "", unplayed: "" };
      let sinceColor = 30;

      const resize = () => {
        const rect = element.getBoundingClientRect();
        size.width = rect.width;
        size.height = rect.height;
        ratio = window.devicePixelRatio || 1;
        element.width = Math.max(1, Math.round(size.width * ratio));
        element.height = Math.max(1, Math.round(size.height * ratio));

        const count = Math.max(
          1,
          Math.floor(
            (size.width + options.barGap) / (options.barWidth + options.barGap)
          )
        );

        levels = new Float32Array(count);

        if (options.peaks?.length)
          resampleLevels(options.peaks, 0, options.peaks.length, levels);
        lastProgress = -1;
      };

      const drawPass = (color: string, width: number) => {
        context.save();
        context.beginPath();
        context.rect(0, 0, width, size.height);
        context.clip();
        context.fillStyle = color;
        context.strokeStyle = color;
        const pitch = options.barWidth + options.barGap;
        const middle = size.height / 2;

        if (options.variant === "line") {
          context.beginPath();

          for (let index = 0; index < levels.length; index++) {
            const x = index * pitch + options.barWidth / 2;
            const y = middle - (levels[index] ?? 0) * (middle - 1);

            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
          }

          for (let index = levels.length - 1; index >= 0; index--) {
            context.lineTo(
              index * pitch + options.barWidth / 2,
              middle + (levels[index] ?? 0) * (middle - 1)
            );
          }

          context.closePath();
          context.fill();
        } else {
          for (let index = 0; index < levels.length; index++) {
            const height = Math.max(2, (levels[index] ?? 0) * size.height);

            const y =
              options.variant === "mirror"
                ? middle - height / 2
                : size.height - height;

            context.beginPath();
            context.roundRect(
              index * pitch,
              y,
              options.barWidth,
              height,
              Math.min(options.barRadius, options.barWidth / 2, height / 2)
            );
            context.fill();
          }
        }

        context.restore();
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(element);

      const unsubscribe = subscribeFrame(() => {
        if (++sinceColor >= 30) {
          sinceColor = 0;
          const style = getComputedStyle(element);

          const next = {
            played:
              style.getPropertyValue("--waveform-progress").trim() ||
              style.color,
            unplayed:
              style.getPropertyValue("--waveform").trim() || style.color,
          };

          if (
            next.played !== colors.played ||
            next.unplayed !== colors.unplayed
          ) {
            colors = next;
            lastProgress = -1;
          }
        }

        const progress = settings.progress;

        if (progress === lastProgress || !size.width || !visible.current)
          return;
        lastProgress = progress;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, size.width, size.height);

        if (options.loading || !options.peaks) return;
        drawPass(colors.unplayed, size.width);
        drawPass(colors.played, progress * size.width);
      });

      return () => {
        unsubscribe();
        observer.disconnect();
      };
    }
  );
  const rest = omitProps(props, ["class", "className", "ref"]);

  return (
    <>
      <Show when={settings.loading}>
        <div
          aria-hidden="true"
          class="bg-muted absolute inset-0 animate-pulse rounded-lg motion-reduce:animate-none"
          data-slot="waveform-skeleton"
        />
      </Show>
      <canvas
        aria-hidden="true"
        class={cn("absolute inset-0 size-full", props.class, props.className)}
        data-slot="waveform-canvas"
        {...rest}
        ref={(node: HTMLCanvasElement) => {
          canvas = node;
          setRefValue(props.ref, node);
        }}
      />
    </>
  );
};

interface WaveformPartProps extends Omit<DivDOMProps, "style"> {
  className?: string;
  style?: StyleValue;
}

export const WaveformCursor = (props: WaveformPartProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <div
      aria-hidden="true"
      class={cn(
        "pointer-events-none absolute inset-y-0 left-[calc(var(--waveform-position)*100%)] w-0.5 -translate-x-1/2 rounded-full bg-(--waveform-cursor) group-data-loading/waveform:hidden",
        props.class,
        props.className
      )}
      data-slot="waveform-cursor"
      {...rest}
    />
  );
};

export interface WaveformHoverProps extends WaveformPartProps {
  format?: (time: number) => string;
}

export const WaveformHover = (props: WaveformHoverProps) => {
  const settings = useWaveform("WaveformHover");
  const rest = omitProps(props, ["class", "className", "format", "style"]);

  return (
    <Show when={settings.interactive && settings.hover !== null}>
      <div
        aria-hidden="true"
        class={cn(
          "bg-foreground/40 pointer-events-none absolute inset-y-0 left-(--waveform-hover) w-px",
          props.class,
          props.className
        )}
        data-slot="waveform-hover"
        style={mergeStyleVars(props.style, {
          "--waveform-hover": `${settings.timeToPosition(settings.hover ?? 0) * 100}%`,
        })}
        {...rest}
      >
        <span class="bg-foreground text-background absolute -top-6 left-1/2 -translate-x-1/2 rounded-md px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap tabular-nums">
          {(props.format ?? formatTime)(settings.hover ?? 0)}
        </span>
      </div>
    </Show>
  );
};

export interface WaveformRegionValue {
  start: number;
  end: number;
}

export interface WaveformRegionProps extends Omit<
  WaveformPartProps,
  "onChange" | "defaultValue" | "ref" | "draggable"
> {
  ref?: RefTarget<HTMLDivElement>;
  start: number;
  end: number;
  onValueChange?: (value: WaveformRegionValue) => void;
  resizable?: boolean;
  draggable?: boolean;
  minLength?: number;
}

interface RegionDrag {
  kind: "start" | "end" | "move";
  x: number;
  start: number;
  end: number;
}

const HANDLE_CLASS =
  "absolute inset-y-0 w-2 cursor-ew-resize rounded-sm bg-primary/60 after:absolute after:inset-y-0 after:-inset-x-1.5 pointer-coarse:after:-inset-x-3 outline-none focus-visible:bg-primary focus-visible:ring-3 focus-visible:ring-ring/30";

export const WaveformRegion = (props: WaveformRegionProps) => {
  const settings = useWaveform("WaveformRegion");
  let region: HTMLDivElement | undefined;
  let drag: RegionDrag | null = null;

  const begin = (kind: RegionDrag["kind"], event: PointerEvent) => {
    event.stopPropagation();
    const target = event.currentTarget;

    if (!(target instanceof HTMLElement) || event.button !== 0) return;
    target.setPointerCapture(event.pointerId);
    drag = { kind, x: event.clientX, start: props.start, end: props.end };
  };

  const move = (event: PointerEvent) => {
    if (!drag) return;
    event.stopPropagation();
    const width = region?.parentElement?.getBoundingClientRect().width ?? 1;
    const delta = ((event.clientX - drag.x) * settings.duration) / width;
    const min = props.minLength ?? 0.1;

    if (drag.kind === "move") {
      const length = drag.end - drag.start;
      const start = clamp(drag.start + delta, 0, settings.duration - length);
      props.onValueChange?.({ start, end: start + length });
    } else if (drag.kind === "start")
      props.onValueChange?.({
        start: clamp(drag.start + delta, 0, drag.end - min),
        end: drag.end,
      });
    else
      props.onValueChange?.({
        start: drag.start,
        end: clamp(drag.end + delta, drag.start + min, settings.duration),
      });
  };

  const finish = (event: PointerEvent) => {
    event.stopPropagation();
    drag = null;
  };

  const nudge = (edge: "start" | "end", event: KeyboardEvent) => {
    // Region keys must not bubble to the clip's seek handler.
    event.stopPropagation();
    const amount = event.shiftKey ? 1 : 0.1;

    const delta =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? amount
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? -amount
          : 0;

    if (!delta) return;
    event.preventDefault();
    const min = props.minLength ?? 0.1;
    props.onValueChange?.(
      edge === "start"
        ? {
            start: clamp(props.start + delta, 0, props.end - min),
            end: props.end,
          }
        : {
            start: props.start,
            end: clamp(props.end + delta, props.start + min, settings.duration),
          }
    );
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "children",
    "start",
    "end",
    "onValueChange",
    "resizable",
    "draggable",
    "minLength",
    "ref",
  ]);

  return (
    <div
      class={cn(
        "bg-primary/15 ring-primary/40 absolute inset-y-0 left-(--region-start) w-(--region-size) rounded-sm ring-1",
        (props.draggable ?? true) && "cursor-grab active:cursor-grabbing",
        props.class,
        props.className
      )}
      data-slot="waveform-region"
      onPointerDown={(event: PointerEvent) => {
        if (props.draggable ?? true) begin("move", event);
        else event.stopPropagation();
      }}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      style={mergeStyleVars(props.style, {
        "--region-start": `${settings.timeToPosition(props.start) * 100}%`,
        "--region-size": `${(settings.timeToPosition(props.end) - settings.timeToPosition(props.start)) * 100}%`,
      })}
      {...rest}
      ref={(node: HTMLDivElement) => {
        region = node;
        setRefValue(props.ref, node);
      }}
    >
      {props.children}
      <Show when={props.resizable ?? true}>
        <span
          aria-label="Region start"
          aria-valuemin={0}
          aria-valuemax={props.end}
          aria-valuenow={props.start}
          aria-valuetext={formatTime(props.start)}
          class={cn(HANDLE_CLASS, "-left-1")}
          data-slot="waveform-region-start"
          role="slider"
          tabindex={0}
          onPointerDown={(event: PointerEvent) => begin("start", event)}
          onKeyDown={(event: KeyboardEvent) => nudge("start", event)}
        />
        <span
          aria-label="Region end"
          aria-valuemin={props.start}
          aria-valuemax={settings.duration}
          aria-valuenow={props.end}
          aria-valuetext={formatTime(props.end)}
          class={cn(HANDLE_CLASS, "-right-1")}
          data-slot="waveform-region-end"
          role="slider"
          tabindex={0}
          onPointerDown={(event: PointerEvent) => begin("end", event)}
          onKeyDown={(event: KeyboardEvent) => nudge("end", event)}
        />
      </Show>
    </div>
  );
};

export interface WaveformMarkerProps extends WaveformPartProps {
  time: number;
}

export const WaveformMarker = (props: WaveformMarkerProps) => {
  const settings = useWaveform("WaveformMarker");

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "children",
    "time",
  ]);

  return (
    <div
      class={cn(
        "bg-meter-warn pointer-events-none absolute inset-y-0 left-(--marker-position) w-px",
        props.class,
        props.className
      )}
      data-slot="waveform-marker"
      style={mergeStyleVars(props.style, {
        "--marker-position": `${settings.timeToPosition(props.time) * 100}%`,
      })}
      {...rest}
    >
      <Show when={props.children}>
        <span class="bg-meter-warn/20 text-foreground absolute top-0 left-1 rounded-sm px-1 text-[0.625rem] font-medium whitespace-nowrap">
          {props.children}
        </span>
      </Show>
    </div>
  );
};

export interface WaveformProps extends Omit<
  WaveformPartProps,
  "onSeeked" | "defaultValue" | "ref"
> {
  peaks: ArrayLike<number> | null;
  duration: number;
  currentTime?: number;
  defaultCurrentTime?: number;
  time?: FrameSource<number> | null;
  onSeek?: (time: number) => void;
  onSeekCommitted?: (time: number) => void;
  step?: number;
  largeStep?: number;
  variant?: "bars" | "line" | "mirror";
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  interactive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  ref?: RefTarget<HTMLDivElement>;
}

export const Waveform = (props: WaveformProps) => {
  const [internalTime, setInternalTime] = createSignal(
    props.defaultCurrentTime ?? 0
  );

  const [hover, setHover] = createSignal<number | null>(null);
  const [dragging, setDragging] = createSignal(false);
  let root: HTMLDivElement | undefined;
  let progress = 0;
  let latestTime = props.currentTime ?? props.defaultCurrentTime ?? 0;
  const shownTime = () => props.currentTime ?? internalTime();

  const position = (time: number) =>
    props.duration > 0 ? clamp(time / props.duration, 0, 1) : 0;

  const write = (time: number) => {
    latestTime = time;
    progress = position(time);
    root?.style.setProperty("--waveform-position", progress.toFixed(5));
  };

  createCompatEffect(
    () => ({ time: shownTime(), duration: props.duration }),
    ({ time }) => write(time)
  );
  useFrameSource(() => props.time, write);

  const active = () =>
    (props.interactive ?? true) &&
    !props.loading &&
    !props.disabled &&
    props.duration > 0;

  const seek = (time: number, commit: boolean) => {
    const next = clamp(time, 0, props.duration);
    write(next);

    if (props.currentTime === undefined) setInternalTime(next);
    props.onSeek?.(next);

    if (commit) props.onSeekCommitted?.(next);
  };

  const timeAtPointer = (event: PointerEvent) => {
    const rect = root!.getBoundingClientRect();

    return (
      clamp((event.clientX - rect.left) / rect.width, 0, 1) * props.duration
    );
  };

  const keyDown = (event: KeyboardEvent) => {
    if (!active() || event.target !== event.currentTarget) return;
    const amount = event.shiftKey ? (props.largeStep ?? 15) : (props.step ?? 5);

    const targets = {
      ArrowDown: latestTime - amount,
      ArrowLeft: latestTime - amount,
      ArrowRight: latestTime + amount,
      ArrowUp: latestTime + amount,
      Home: 0,
      End: props.duration,
    };

    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    // SAFETY: The membership check above proves the key names a seek target.
    seek(targets[event.key as keyof typeof targets], true);
  };

  const settings: WaveformContextValue = {
    get peaks() {
      return props.peaks;
    },
    get duration() {
      return props.duration;
    },
    get variant() {
      return props.variant ?? "bars";
    },
    get barWidth() {
      return props.barWidth ?? 2;
    },
    get barGap() {
      return props.barGap ?? 1;
    },
    get barRadius() {
      return props.barRadius ?? 1;
    },
    get loading() {
      return props.loading ?? false;
    },
    get progress() {
      return progress;
    },
    get hover() {
      return hover();
    },
    get interactive() {
      return active();
    },
    timeToPosition: position,
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "children",
    "ref",
    "peaks",
    "duration",
    "currentTime",
    "defaultCurrentTime",
    "time",
    "onSeek",
    "onSeekCommitted",
    "step",
    "largeStep",
    "variant",
    "barWidth",
    "barGap",
    "barRadius",
    "interactive",
    "loading",
    "disabled",
  ]);

  return provideContext(WaveformContext, settings, () => (
    <div
      class={cn(
        "group/waveform focus-visible:ring-ring/30 relative h-20 w-full touch-none rounded-lg outline-none select-none [--waveform-cursor:var(--foreground)] [--waveform-position:0] [--waveform-progress:var(--primary)] [--waveform:var(--muted-foreground)] focus-visible:ring-3 data-disabled:opacity-50",
        props.class,
        props.className
      )}
      data-slot="waveform"
      data-variant={settings.variant}
      data-disabled={props.disabled ? "" : undefined}
      data-loading={props.loading ? "" : undefined}
      data-dragging={dragging() ? "" : undefined}
      role={active() ? "slider" : undefined}
      tabindex={active() ? 0 : undefined}
      aria-valuemin={active() ? 0 : undefined}
      aria-valuemax={active() ? Math.round(props.duration) : undefined}
      aria-valuenow={active() ? Math.round(shownTime()) : undefined}
      aria-valuetext={
        active()
          ? `${formatTime(shownTime())} of ${formatTime(props.duration)}`
          : undefined
      }
      onKeyDown={keyDown}
      onPointerDown={(event: PointerEvent) => {
        if (!active() || event.button !== 0) return;
        root!.setPointerCapture(event.pointerId);
        setDragging(true);
        seek(timeAtPointer(event), false);
      }}
      onPointerMove={(event: PointerEvent) => {
        if (!active()) return;
        const time = timeAtPointer(event);
        setHover(time);

        if (dragging()) seek(time, false);
      }}
      onPointerLeave={() => setHover(null)}
      onPointerUp={(event: PointerEvent) => {
        if (!dragging()) return;
        setDragging(false);

        if (active()) seek(timeAtPointer(event), true);
      }}
      onPointerCancel={() => setDragging(false)}
      onLostPointerCapture={() => setDragging(false)}
      {...rest}
      ref={(node: HTMLDivElement) => {
        root = node;
        setRefValue(props.ref, node);
      }}
    >
      {props.children ?? (
        <>
          <WaveformCanvas />
          <WaveformCursor />
        </>
      )}
    </div>
  ));
};
