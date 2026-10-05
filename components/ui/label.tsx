import type { LabelDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export interface LabelProps extends Omit<LabelDOMProps, "for"> {
  for?: string;
  className?: string;
}

export const Label = (props: LabelProps) => (
  <label
    data-slot="label"
    class={cn(
      "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);
