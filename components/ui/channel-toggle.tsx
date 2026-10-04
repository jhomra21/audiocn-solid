import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { createSignal } from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import type { ButtonDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const channelToggleVariants = cva(
  "group/channel-toggle focus-visible:ring-ring/30 inline-flex shrink-0 items-center justify-center gap-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    defaultVariants: {
      size: "default",
      tone: "neutral",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-7 min-w-7 px-1.5",
        icon: "size-7",
        lg: "h-8 min-w-8 px-2",
        sm: "h-6 min-w-6 px-1",
      },
      tone: {
        monitor:
          "data-pressed:border-channel-monitor/40 data-pressed:bg-channel-monitor/15 data-pressed:text-channel-monitor-foreground",
        mute: "data-pressed:border-channel-mute/40 data-pressed:bg-channel-mute/15 data-pressed:text-channel-mute-foreground",
        neutral: "data-pressed:bg-foreground data-pressed:text-background",
        solo: "data-pressed:border-channel-solo/50 data-pressed:bg-channel-solo/20 data-pressed:text-channel-solo-foreground",
      },
      variant: {
        default: "bg-muted text-muted-foreground hover:text-foreground",
        ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
        outline:
          "border-border text-muted-foreground hover:bg-muted hover:text-foreground border bg-transparent",
      },
    },
  }
);

type ToggleVariants = VariantProps<typeof channelToggleVariants>;

export interface ChannelToggleProps
  extends
    Omit<
      ButtonDOMProps,
      "children" | "class" | "className" | "disabled" | "onClick" | "type"
    >,
    ToggleVariants {
  children?: ButtonDOMProps["children"];
  class?: string;
  className?: string;
  defaultPressed?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  onPressedChange?: (pressed: boolean, event: MouseEvent) => void;
  pressed?: boolean;
  type?: "button" | "submit" | "reset";
}

const CHANNEL_TOGGLE_OWN = [
  "children",
  "class",
  "className",
  "defaultPressed",
  "disabled",
  "onClick",
  "onPressedChange",
  "pressed",
  "size",
  "tone",
  "type",
  "variant",
] as const;

export const ChannelToggle = (props: ChannelToggleProps) => {
  const rest = omitProps(props, CHANNEL_TOGGLE_OWN);

  const config = useAudioConfig();

  const [uncontrolled, setUncontrolled] = createSignal(
    props.defaultPressed ?? false
  );

  const pressed = () => props.pressed ?? uncontrolled();

  const disabled = () => props.disabled ?? config.disabled ?? false;

  const tone = () => props.tone ?? "neutral";

  const size = () => props.size ?? "default";

  const variant = () => props.variant ?? "default";

  return (
    <button
      aria-pressed={pressed() ? "true" : "false"}
      class={cn(
        channelToggleVariants({
          size: size(),
          tone: tone(),
          variant: variant(),
        }),
        props.class,
        props.className
      )}
      data-pressed={pressed() ? "" : undefined}
      data-slot="channel-toggle"
      data-tone={tone()}
      disabled={disabled()}
      onClick={(event) => {
        props.onClick?.(event);

        if (event.defaultPrevented || disabled()) {
          return;
        }

        const next = !pressed();

        if (props.pressed === undefined) {
          setUncontrolled(next);
        }

        props.onPressedChange?.(next, event);
      }}
      type={props.type ?? "button"}
      {...rest}
    >
      {props.children}
    </button>
  );
};

export type ChannelTogglePresetProps = Omit<ChannelToggleProps, "tone">;

export const MuteToggle = (props: ChannelTogglePresetProps) => (
  <ChannelToggle
    aria-label="Mute"
    data-slot="mute-toggle"
    tone="mute"
    {...props}
  />
);

export const SoloToggle = (props: ChannelTogglePresetProps) => (
  <ChannelToggle
    aria-label="Solo"
    data-slot="solo-toggle"
    tone="solo"
    {...props}
  />
);

export const MonitorToggle = (props: ChannelTogglePresetProps) => (
  <ChannelToggle
    aria-label="Monitor"
    data-slot="monitor-toggle"
    tone="monitor"
    {...props}
  />
);

export { channelToggleVariants };
