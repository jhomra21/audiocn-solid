import { cva } from "class-variance-authority";
import {
  createContext,
  createSignal,
  createUniqueId,
  useContext,
} from "solid-js";
import type { VariantProps } from "class-variance-authority";

import { Badge } from "@/components/ui/badge";
import type { BadgeProps } from "@/components/ui/badge";
import {
  AudioConfigProvider,
  useAudioConfig,
} from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import type { Orientation } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

interface ChannelStripContextValue {
  readonly dimmed: boolean;
  readonly muted: boolean;
  readonly orientation: Orientation;
  readonly solo: boolean;
  readonly titleId: string;
}

const ChannelStripContext =
  createContext<ChannelStripContextValue | null>(null);

const useChannelStripContext = (
  part: string
): ChannelStripContextValue => {
  const context =
    useContext(ChannelStripContext);

  if (!context) {
    throw new Error(
      `${part} must be used inside ChannelStrip.`
    );
  }

  return context;
};

/** The state of the surrounding channel strip, for custom parts. */
export const useChannelStrip =
  (): ChannelStripContextValue =>
    useChannelStripContext(
      "useChannelStrip"
    );

const channelStripVariants = cva(
  "group/channel-strip data-selected:ring-ring/40 relative min-w-0 transition-[opacity,box-shadow] outline-none data-disabled:opacity-60 data-selected:ring-2",
  {
    defaultVariants: {
      orientation: "horizontal",
      variant: "default",
    },
    variants: {
      orientation: {
        horizontal:
          "@container/channel-strip w-full",
        vertical:
          "flex h-full min-h-72 w-[var(--channel-strip-width,6.5rem)] shrink-0 flex-col",
      },
      variant: {
        card:
          "bg-card text-card-foreground rounded-xl border p-3 shadow-xs",
        default:
          "bg-muted/40 rounded-xl p-3",
        ghost: "p-2",
        master:
          "bg-muted/60 ring-primary/10 rounded-xl border p-3 ring-1",
      },
    },
  }
);

const channelStripLayoutVariants = cva(
  "grid gap-x-3 gap-y-1.5",
  {
    defaultVariants: {
      orientation:
        "horizontal",
    },
    variants: {
      orientation: {
        horizontal: [
          "w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center [grid-template-areas:'header_header_header'_'meter_value_controls']",
          "has-[>[data-slot=channel-strip-notice]]:[grid-template-areas:'header_header_header'_'meter_value_controls'_'notice_notice_notice']",
          "has-[>[data-slot=channel-strip-fader]]:[grid-template-areas:'header_header_header'_'meter_value_controls'_'fader_value_controls']",
          "has-[>[data-slot=channel-strip-fader]]:has-[>[data-slot=channel-strip-notice]]:[grid-template-areas:'header_header_header'_'meter_value_controls'_'fader_value_controls'_'notice_notice_notice']",
          "@xl/channel-strip:grid-cols-[minmax(0,var(--channel-strip-header-width,12rem))_minmax(0,1fr)_auto_auto] @xl/channel-strip:[grid-template-areas:'header_meter_value_controls']",
          "@xl/channel-strip:has-[>[data-slot=channel-strip-notice]]:[grid-template-areas:'header_meter_value_controls'_'notice_notice_notice_notice']",
          "@xl/channel-strip:has-[>[data-slot=channel-strip-fader]]:[grid-template-areas:'header_meter_value_controls'_'header_fader_value_controls']",
          "@xl/channel-strip:has-[>[data-slot=channel-strip-fader]]:has-[>[data-slot=channel-strip-notice]]:[grid-template-areas:'header_meter_value_controls'_'header_fader_value_controls'_'notice_notice_notice_notice']",
        ],
        vertical:
          "flex-1 grid-cols-[1fr_auto_auto_1fr] grid-rows-[auto_minmax(0,1fr)_auto_auto_auto] justify-items-center [grid-template-areas:'header_header_header_header'_'._meter_fader_.'_'value_value_value_value'_'controls_controls_controls_controls'_'notice_notice_notice_notice']",
      },
    },
  }
);

export interface ChannelStripProps
  extends Omit<
      DivDOMProps,
      | "children"
      | "class"
      | "className"
      | "ref"
      | "style"
    >,
    Omit<
      VariantProps<
        typeof channelStripVariants
      >,
      "orientation"
    > {
  accent?: string;
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
  dimmed?: boolean;
  disabled?: boolean;
  muted?: boolean;
  orientation?: Orientation;
  ref?: RefTarget<HTMLDivElement>;
  selected?: boolean;
  size?: AudioSize;
  solo?: boolean;
  style?: StyleValue;
}

const STRIP_OWN = [
  "accent",
  "children",
  "class",
  "className",
  "dimmed",
  "disabled",
  "muted",
  "orientation",
  "ref",
  "selected",
  "size",
  "solo",
  "style",
  "variant",
] as const;

export const ChannelStrip = (
  props: ChannelStripProps
) => {
  const rest = omitProps(
    props,
    STRIP_OWN
  );

  const config =
    useAudioConfig();

  const orientation = () =>
    props.orientation ??
    config.orientation ??
    "horizontal";

  const size = () =>
    props.size ??
    config.size ??
    "default";

  const disabled = () =>
    props.disabled ??
    config.disabled ??
    false;

  const muted = () =>
    props.muted ?? false;

  const solo = () =>
    props.solo ?? false;

  const dimmed = () =>
    props.dimmed ?? false;

  const selected = () =>
    props.selected ?? false;

  const variant = () =>
    props.variant ?? "default";

  const titleId =
    `channel-strip-${createUniqueId()}-title`;

  const [
    rootElement,
    setRootElement,
  ] = createSignal<
    HTMLDivElement | null
  >(null);

  createCompatEffect(
    rootElement,
    (root) => {
      if (
        !root ||
        typeof MutationObserver ===
          "undefined"
      ) {
        return;
      }

      const update = () => {
        const clipping =
          root.querySelector(
            "[data-slot='level-meter'][data-clipping]"
          ) !== null;

        root.toggleAttribute(
          "data-clipping",
          clipping
        );
      };

      const observer =
        new MutationObserver(
          update
        );

      observer.observe(
        root,
        {
          attributeFilter: [
            "data-clipping",
          ],
          attributes: true,
          childList: true,
          subtree: true,
        }
      );

      update();

      return () => {
        observer.disconnect();
      };
    }
  );

  const context: ChannelStripContextValue = {
    get dimmed() {
      return dimmed();
    },
    get muted() {
      return muted();
    },
    get orientation() {
      return orientation();
    },
    get solo() {
      return solo();
    },
    titleId,
  };

  const childConfig = {
    get dimmed() {
      return (
        muted() ||
        dimmed()
      );
    },
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
    get size() {
      return size();
    },
  };

  return provideContext(
    ChannelStripContext,
    context,
    () => (
      <div
        aria-labelledby={
          titleId
        }
        class={cn(
          channelStripVariants({
            orientation:
              orientation(),
            variant:
              variant(),
          }),
          props.accent
            ? orientation() ===
              "horizontal"
              ? "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-(--channel-accent)"
              : "before:absolute before:inset-x-3 before:top-0 before:h-0.5 before:rounded-full before:bg-(--channel-accent)"
            : undefined,
          props.class,
          props.className
        )}
        data-dimmed={
          dimmed()
            ? ""
            : undefined
        }
        data-disabled={
          disabled()
            ? ""
            : undefined
        }
        data-muted={
          muted()
            ? ""
            : undefined
        }
        data-orientation={
          orientation()
        }
        data-selected={
          selected()
            ? ""
            : undefined
        }
        data-size={size()}
        data-slot="channel-strip"
        data-solo={
          solo()
            ? ""
            : undefined
        }
        data-variant={variant()}
        ref={(node) => {
          setRootElement(
            node
          );
          setRefValue(
            props.ref,
            node
          );
        }}
        role="group"
        style={mergeStyleVars(
          props.style,
          props.accent
            ? {
                "--channel-accent":
                  props.accent,
              }
            : {}
        )}
        {...rest}
      >
        <AudioConfigProvider
          value={childConfig}
        >
          <div
            class={channelStripLayoutVariants({
              orientation:
                orientation(),
            })}
            data-slot="channel-strip-layout"
          >
            {props.children}
          </div>
        </AudioConfigProvider>
      </div>
    )
  );
};

type DivPartProps = Omit<
  DivDOMProps,
  "class" | "className"
> & {
  class?: string;
  className?: string;
};

type SpanPartProps = Omit<
  SpanDOMProps,
  "class" | "className"
> & {
  class?: string;
  className?: string;
};

const CLASS_OWN = [
  "class",
  "className",
] as const;

export const ChannelStripHeader = (
  props: DivPartProps
) => {
  const context =
    useChannelStripContext(
      "ChannelStripHeader"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-w-0 items-center gap-2 [grid-area:header]",
        context.orientation ===
          "vertical"
          ? "w-full flex-col text-center *:max-w-full"
          : "flex-wrap",
        props.class,
        props.className
      )}
      data-slot="channel-strip-header"
      {...rest}
    />
  );
};

export const ChannelStripIcon = (
  props: SpanPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <span
      aria-hidden="true"
      class={cn(
        "bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs [&_svg:not([class*='size-'])]:size-4",
        props.class,
        props.className
      )}
      data-slot="channel-strip-icon"
      {...rest}
    />
  );
};

export const ChannelStripTitle = (
  props: SpanPartProps
) => {
  const context =
    useChannelStripContext(
      "ChannelStripTitle"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <span
      class={cn(
        "truncate text-sm leading-tight font-medium",
        props.class,
        props.className
      )}
      data-slot="channel-strip-title"
      id={context.titleId}
      {...rest}
    />
  );
};

export const ChannelStripDescription = (
  props: SpanPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <span
      class={cn(
        "text-muted-foreground truncate text-xs leading-tight",
        props.class,
        props.className
      )}
      data-slot="channel-strip-description"
      {...rest}
    />
  );
};

export const ChannelStripText = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 group-data-[orientation=horizontal]/channel-strip:min-w-20",
        props.class,
        props.className
      )}
      data-slot="channel-strip-text"
      {...rest}
    />
  );
};

const STATUS_CLASS = {
  default: "",
  error: "",
  live:
    "bg-meter-ok/15 text-meter-ok-foreground",
  muted:
    "bg-channel-mute/15 text-channel-mute-foreground",
  warning:
    "bg-meter-warn/20 text-foreground",
} as const;

export interface ChannelStripStatusProps
  extends BadgeProps {
  tone?:
    | "default"
    | "live"
    | "muted"
    | "warning"
    | "error";
}

const STATUS_OWN = [
  "tone",
] as const;

export const ChannelStripStatus = (
  props: ChannelStripStatusProps
) => {
  const rest = omitProps(
    props,
    STATUS_OWN
  );

  const tone = () =>
    props.tone ??
    "default";

  const badgeVariant = () => {
    if (
      tone() === "error"
    ) {
      return "destructive" as const;
    }

    if (
      tone() === "default"
    ) {
      return "secondary" as const;
    }

    return "outline" as const;
  };

  return (
    <Badge
      {...rest}
      class={cn(
        "shrink-0",
        STATUS_CLASS[
          tone()
        ],
        props.class,
        props.className
      )}
      data-slot="channel-strip-status"
      data-tone={tone()}
      variant={
        badgeVariant()
      }
    />
  );
};

export const ChannelStripActions = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "ml-auto flex shrink-0 items-center gap-1",
        props.class,
        props.className
      )}
      data-slot="channel-strip-actions"
      {...rest}
    />
  );
};

export const ChannelStripMeter = (
  props: DivPartProps
) => {
  const context =
    useChannelStripContext(
      "ChannelStripMeter"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 [grid-area:meter]",
        context.orientation ===
          "horizontal"
          ? "w-full items-center"
          : "h-full justify-center",
        props.class,
        props.className
      )}
      data-slot="channel-strip-meter"
      {...rest}
    />
  );
};

export const ChannelStripFader = (
  props: DivPartProps
) => {
  const context =
    useChannelStripContext(
      "ChannelStripFader"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 [grid-area:fader] [&_[data-slot=fader-control]]:p-0 [&_[data-slot=fader-scale]]:p-0",
        context.orientation ===
          "horizontal"
          ? "w-full items-center [&_[data-slot=fader-control]:only-child]:my-[calc((var(--fader-track-size)-var(--fader-thumb-size))/2)]"
          : "h-full justify-center [&_[data-slot=fader-control]:only-child]:mx-[calc((var(--fader-track-size)-var(--fader-thumb-size))/2)]",
        props.class,
        props.className
      )}
      data-slot="channel-strip-fader"
      {...rest}
    />
  );
};

export const ChannelStripValue = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "text-muted-foreground flex min-w-[8ch] items-center justify-end font-mono text-xs whitespace-nowrap tabular-nums [grid-area:value] group-data-[orientation=vertical]/channel-strip:justify-center",
        props.class,
        props.className
      )}
      data-slot="channel-strip-value"
      {...rest}
    />
  );
};

export const ChannelStripControls = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex items-center justify-center gap-1 [grid-area:controls]",
        props.class,
        props.className
      )}
      data-slot="channel-strip-controls"
      {...rest}
    />
  );
};

const noticeVariants = cva(
  "flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs [grid-area:notice] [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "bg-muted text-muted-foreground",
        destructive:
          "bg-destructive/10 text-destructive",
        warning:
          "bg-meter-warn/15 text-foreground",
      },
    },
  }
);

export interface ChannelStripNoticeProps
  extends DivPartProps,
    VariantProps<
      typeof noticeVariants
    > {}

const NOTICE_OWN = [
  "class",
  "className",
  "variant",
] as const;

export const ChannelStripNotice = (
  props: ChannelStripNoticeProps
) => {
  const rest = omitProps(
    props,
    NOTICE_OWN
  );

  const variant = () =>
    props.variant ??
    "default";

  return (
    <div
      class={cn(
        noticeVariants({
          variant:
            variant(),
        }),
        "w-full",
        props.class,
        props.className
      )}
      data-slot="channel-strip-notice"
      data-variant={variant()}
      role={
        variant() ===
        "destructive"
          ? "alert"
          : "status"
      }
      {...rest}
    />
  );
};

export {
  channelStripLayoutVariants,
  channelStripVariants,
};
