import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import type { SpanDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "group/badge focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-2xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
      },
    },
  }
);

export interface BadgeProps
  extends
    Omit<SpanDOMProps, "children" | "class" | "className">,
    VariantProps<typeof badgeVariants> {
  children?: SpanDOMProps["children"];
  class?: string;
  className?: string;
}

const BADGE_OWN = ["children", "class", "className", "variant"] as const;

export const Badge = (props: BadgeProps) => {
  const rest = omitProps(props, BADGE_OWN);

  return (
    <span
      class={cn(
        badgeVariants({
          variant: props.variant ?? "default",
        }),
        props.class,
        props.className
      )}
      data-slot="badge"
      {...rest}
    >
      {props.children}
    </span>
  );
};

export { badgeVariants };
