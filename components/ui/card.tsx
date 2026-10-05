import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

type CardPartProps = DivDOMProps & { className?: string };

export const Card = (props: CardPartProps & { size?: "default" | "sm" }) => (
  <div
    data-slot="card"
    data-size={props.size ?? "default"}
    class={cn(
      "group/card bg-card text-card-foreground ring-foreground/5 dark:ring-foreground/10 flex flex-col gap-(--card-spacing) overflow-hidden rounded-[min(var(--radius-4xl),24px)] py-(--card-spacing) text-sm shadow-sm ring-1 [--card-spacing:--spacing(5)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-[min(var(--radius-4xl),24px)] *:[img:last-child]:rounded-b-[min(var(--radius-4xl),24px)]",
      props.class,
      props.className
    )}
    {...omitProps(props, ["size", "class", "className"])}
  />
);

export const CardHeader = (props: CardPartProps) => (
  <div
    data-slot="card-header"
    class={cn(
      "group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-[min(var(--radius-4xl),24px)] px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const CardTitle = (props: CardPartProps) => (
  <div
    data-slot="card-title"
    class={cn(
      "font-heading text-base font-medium",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const CardDescription = (props: CardPartProps) => (
  <div
    data-slot="card-description"
    class={cn("text-muted-foreground text-sm", props.class, props.className)}
    {...omitProps(props, ["class", "className"])}
  />
);

export const CardAction = (props: CardPartProps) => (
  <div
    data-slot="card-action"
    class={cn(
      "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const CardContent = (props: CardPartProps) => (
  <div
    data-slot="card-content"
    class={cn("px-(--card-spacing)", props.class, props.className)}
    {...omitProps(props, ["class", "className"])}
  />
);

export const CardFooter = (props: CardPartProps) => (
  <div
    data-slot="card-footer"
    class={cn(
      "flex items-center rounded-b-[min(var(--radius-4xl),24px)] px-(--card-spacing) [.border-t]:pt-(--card-spacing)",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);
