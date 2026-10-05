import type { KbdDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

interface KbdProps extends KbdDOMProps {
  className?: string;
}

export const Kbd = (props: KbdProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <kbd
      data-slot="kbd"
      class={cn(
        "bg-muted text-muted-foreground in-data-[slot=input-group]:bg-input in-data-[slot=tooltip-content]:bg-background/20 in-data-[slot=tooltip-content]:text-background dark:in-data-[slot=tooltip-content]:bg-background/10 pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-lg px-1 font-sans text-xs font-medium select-none [&_svg:not([class*='size-'])]:size-3",
        props.class,
        props.className
      )}
      {...rest}
    />
  );
};

export const KbdGroup = (props: KbdProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <kbd
      data-slot="kbd-group"
      class={cn("inline-flex items-center gap-1", props.class, props.className)}
      {...rest}
    />
  );
};
