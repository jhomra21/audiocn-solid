import { createSignal } from "solid-js";

import type { ButtonDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export interface ToggleProps extends Omit<
  ButtonDOMProps,
  "onClick" | "disabled"
> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
  className?: string;
}

const sizes = {
  default:
    "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
  lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
  sm: "h-7 min-w-7 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
};

export const Toggle = (props: ToggleProps) => {
  const [uncontrolled, setUncontrolled] = createSignal(
    props.defaultPressed ?? false
  );

  const pressed = () => props.pressed ?? uncontrolled();

  const rest = omitProps(props, [
    "class",
    "className",
    "pressed",
    "defaultPressed",
    "onPressedChange",
    "onClick",
    "size",
    "variant",
  ]);

  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={pressed() ? "true" : "false"}
      class={cn(
        "group/toggle hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted dark:aria-invalid:ring-destructive/40 inline-flex items-center justify-center gap-1 rounded-2xl text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        sizes[props.size ?? "default"],
        props.variant === "outline"
          ? "border-input hover:bg-muted border bg-transparent"
          : "bg-transparent",
        props.class,
        props.className
      )}
      {...rest}
      onClick={(event: MouseEvent) => {
        props.onClick?.(event);

        if (event.defaultPrevented || props.disabled) return;
        const next = !pressed();

        if (props.pressed === undefined) setUncontrolled(next);
        props.onPressedChange?.(next);
      }}
    />
  );
};
