import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

type AlertPartProps = DivDOMProps & { className?: string };

export const Alert = (
  props: AlertPartProps & { variant?: "default" | "destructive" }
) => (
  <div
    data-slot="alert"
    role="alert"
    class={cn(
      "group/alert relative grid w-full gap-0.5 rounded-2xl border px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
      props.variant === "destructive"
        ? "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current"
        : "bg-card text-card-foreground",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "variant"])}
  />
);

export const AlertTitle = (props: AlertPartProps) => (
  <div
    data-slot="alert-title"
    class={cn(
      "[&_a]:hover:text-foreground font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const AlertDescription = (props: AlertPartProps) => (
  <div
    data-slot="alert-description"
    class={cn(
      "text-muted-foreground [&_a]:hover:text-foreground text-sm text-balance md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const AlertAction = (props: AlertPartProps) => (
  <div
    data-slot="alert-action"
    class={cn("absolute top-2.5 right-3", props.class, props.className)}
    {...omitProps(props, ["class", "className"])}
  />
);
