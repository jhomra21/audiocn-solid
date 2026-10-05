import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

type EmptyPartProps = DivDOMProps & { className?: string };

export const Empty = (props: EmptyPartProps) => (
  <div
    data-slot="empty"
    class={cn(
      "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-dashed p-12 text-center text-balance",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const EmptyHeader = (props: EmptyPartProps) => (
  <div
    data-slot="empty-header"
    class={cn(
      "flex max-w-sm flex-col items-center gap-2",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const EmptyMedia = (
  props: EmptyPartProps & { variant?: "default" | "icon" }
) => (
  <div
    data-slot="empty-icon"
    data-variant={props.variant ?? "default"}
    class={cn(
      "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
      props.variant === "icon"
        ? "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg:not([class*='size-'])]:size-5"
        : "bg-transparent",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "variant"])}
  />
);

export const EmptyTitle = (props: EmptyPartProps) => (
  <div
    data-slot="empty-title"
    class={cn(
      "font-heading text-lg font-medium tracking-tight",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const EmptyDescription = (props: EmptyPartProps) => (
  <div
    data-slot="empty-description"
    class={cn(
      "text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const EmptyContent = (props: EmptyPartProps) => (
  <div
    data-slot="empty-content"
    class={cn(
      "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);
