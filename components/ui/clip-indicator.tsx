import { createMemo, untrack } from "solid-js";

import { useClipHold } from "@/hooks/use-clip-hold";
import { useFrameSource } from "@/hooks/use-frame-source";
import { SILENCE_DB } from "@/lib/audio/decibels";
import { omitProps } from "@/lib/props";
import { setRefValue } from "@/lib/ref";
import type { RefTarget } from "@/lib/ref";
import { createCompatEffect } from "@/lib/solid-effect";
import type { FrameSource, MeterFrame } from "@/lib/audio/types";
import { CLIP_HOLD_MS, CLIP_THRESHOLD_DB } from "@/lib/audio/zones";
import { cn } from "@/lib/utils";

export interface ClipIndicatorActions {
  report: (db: number) => void;
  reset: () => void;
}

export interface ClipIndicatorState {
  readonly clipping: boolean;
  readonly slot: "clip-indicator";
}

export interface ClipIndicatorClickEvent extends MouseEvent {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean;
}

type ClipIndicatorRender = (
  props: Record<string, unknown>,
  state: ClipIndicatorState
) => any;

interface ButtonProps {
  class?: string;
  className?: string;
  children?: any;
  ref?: RefTarget<HTMLButtonElement>;
  onClick?: (event: ClipIndicatorClickEvent) => void;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
  render?: ClipIndicatorRender;
  [key: string]: unknown;
}

export interface ClipIndicatorProps extends ButtonProps {
  clipping?: boolean;
  source?: FrameSource<MeterFrame> | null;
  thresholdDb?: number;
  holdMs?: number;
  onClippingChange?: (clipping: boolean) => void;
  showCount?: boolean;
  actionsRef?: RefTarget<ClipIndicatorActions>;
}

const OWN_PROPS = [
  "clipping",
  "source",
  "thresholdDb",
  "holdMs",
  "onClippingChange",
  "showCount",
  "actionsRef",
  "class",
  "className",
  "children",
  "ref",
  "onClick",
  "type",
  "aria-label",
  "render",
] as const;

const loudestPeak = (frame: MeterFrame) => {
  let loudest = SILENCE_DB;

  for (const level of frame.channels) {
    loudest = Math.max(loudest, level.peakDb);
  }

  return loudest;
};

export const ClipIndicator = (props: ClipIndicatorProps) => {
  const rest = omitProps(props, OWN_PROPS);

  const hold = useClipHold({
    get holdMs() {
      return props.holdMs ?? CLIP_HOLD_MS;
    },
    get onClippingChange() {
      return props.onClippingChange;
    },
    get thresholdDb() {
      return props.thresholdDb ?? CLIP_THRESHOLD_DB;
    },
  });

  const clipping = createMemo(() => props.clipping ?? hold.clipping);

  useFrameSource(
    () => props.source,
    (frame) => hold.report(loudestPeak(frame))
  );

  const actions: ClipIndicatorActions = {
    report: hold.report,
    reset: hold.reset,
  };

  createCompatEffect(
    () => props.actionsRef,
    (ref) => {
      setRefValue(ref, actions);

      return () => setRefValue(ref, null);
    }
  );

  const onClick = (event: MouseEvent) => {
    let prevented = false;
    const baseEvent = event as ClipIndicatorClickEvent;

    Object.defineProperties(baseEvent, {
      baseUIHandlerPrevented: {
        configurable: true,
        get: () => prevented,
      },
      preventBaseUIHandler: {
        configurable: true,
        value: () => {
          prevented = true;
        },
      },
    });

    untrack(() => props.onClick)?.(baseEvent);

    if (!prevented) {
      hold.reset();
    }
  };

  const content = () => (
    <>
      {props.children ?? (
        <span
          class="bg-muted-foreground/30 group-data-clipping/clip-indicator:bg-meter-clip size-2 shrink-0 rounded-full transition-colors"
          data-slot="clip-indicator-light"
        />
      )}
      {(props.showCount ?? false) ? (
        <span class="tabular-nums" data-slot="clip-indicator-count">
          {hold.count}
        </span>
      ) : null}
      <span aria-live="polite" class="sr-only">
        {clipping() ? "Clipping" : ""}
      </span>
    </>
  );

  const renderProps: Record<string, unknown> = {
    get "aria-label"() {
      return (
        props["aria-label"] ??
        (clipping() ? "Clipping. Reset clip indicator" : "Clip indicator")
      );
    },
    get class() {
      return cn(
        "group/clip-indicator text-muted-foreground hover:bg-muted focus-visible:ring-ring/30 data-clipping:text-meter-clip-foreground relative inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-full px-1 text-xs font-medium transition-colors outline-none after:absolute after:-inset-1 focus-visible:ring-3 pointer-coarse:after:-inset-2.5",
        props.class,
        props.className
      );
    },
    get "data-clipping"() {
      return clipping() ? "" : undefined;
    },
    "data-slot": "clip-indicator",
    get children() {
      return content();
    },
    onClick,
    get type() {
      return props.type ?? "button";
    },
  };

  for (const key of Object.keys(rest)) {
    Object.defineProperty(renderProps, key, {
      configurable: true,
      enumerable: true,
      get: () => Reflect.get(rest, key),
    });
  }

  const state: ClipIndicatorState = {
    get clipping() {
      return clipping();
    },
    slot: "clip-indicator",
  };

  const customRender = untrack(() => props.render);

  if (customRender) {
    const rendered = createMemo(() => customRender(renderProps, state));

    return rendered as unknown as any;
  }

  return (
    <button
      aria-label={
        props["aria-label"] ??
        (clipping() ? "Clipping. Reset clip indicator" : "Clip indicator")
      }
      class={cn(
        "group/clip-indicator text-muted-foreground hover:bg-muted focus-visible:ring-ring/30 data-clipping:text-meter-clip-foreground relative inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-full px-1 text-xs font-medium transition-colors outline-none after:absolute after:-inset-1 focus-visible:ring-3 pointer-coarse:after:-inset-2.5",
        props.class,
        props.className
      )}
      data-clipping={clipping() ? "" : undefined}
      data-slot="clip-indicator"
      onClick={onClick}
      ref={(node) => setRefValue(props.ref, node)}
      type={props.type ?? "button"}
      {...rest}
    >
      {content()}
    </button>
  );
};
