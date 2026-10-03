import { createMemo } from "solid-js";

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

interface ButtonProps {
  class?: string;
  className?: string;
  children?: any;
  ref?: RefTarget<HTMLButtonElement>;
  onClick?: (event: MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  "aria-label"?: string;
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

  return (
    <button
      {...rest}
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
      onClick={(event) => {
        hold.reset();
        props.onClick?.(event);
      }}
      ref={(node) => setRefValue(props.ref, node)}
      type={props.type ?? "button"}
    >
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
    </button>
  );
};
