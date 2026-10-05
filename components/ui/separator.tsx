import type { DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export const Separator = (
  props: DivDOMProps & {
    className?: string;
    orientation?: "horizontal" | "vertical";
    decorative?: boolean;
  }
) => (
  <div
    data-slot="separator"
    role={props.decorative === false ? "separator" : "none"}
    aria-orientation={
      props.decorative === false
        ? (props.orientation ?? "horizontal")
        : undefined
    }
    data-horizontal={props.orientation !== "vertical" ? "" : undefined}
    data-vertical={props.orientation === "vertical" ? "" : undefined}
    class={cn(
      "bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "orientation", "decorative"])}
  />
);
