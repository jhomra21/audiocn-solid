import * as SelectPrimitive from "@kobalte/core/select";
import type {
  SelectContentCommonProps,
  SelectContentOptions,
  SelectTriggerCommonProps,
} from "@kobalte/core/select";
import { children } from "solid-js";

import type { ButtonDOMProps, DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;

export const SelectItem = SelectPrimitive.Item;

export const SelectGroup = SelectPrimitive.Section;

export const SelectValue = SelectPrimitive.Value;

export interface SelectTriggerProps
  extends
    Omit<ButtonDOMProps, keyof SelectTriggerCommonProps | "style">,
    Partial<SelectTriggerCommonProps<HTMLButtonElement>> {
  style?: SelectContentCommonProps["style"];
  className?: string;
}

export const SelectTrigger = (props: SelectTriggerProps) => {
  const rest = omitProps(props, ["class", "className", "children"]);
  // Own the content before Kobalte's polymorphic button so SSR and hydration
  // evaluate it under the same owner, rather than different internal branches.
  const content = children(() => props.children);

  return (
    <SelectPrimitive.Trigger
      class={cn(
        "border-input bg-background focus-visible:ring-ring/30 flex h-8 items-center justify-between gap-2 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
        props.class,
        props.className
      )}
      data-slot="select-trigger"
      {...rest}
    >
      {content()}
    </SelectPrimitive.Trigger>
  );
};

export interface SelectContentProps
  extends Omit<DivDOMProps, "id" | "style">, SelectContentOptions {
  id?: string;
  style?: SelectContentCommonProps["style"];
  className?: string;
}

export const SelectContent = (props: SelectContentProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        class={cn(
          "bg-popover text-popover-foreground ring-foreground/5 z-50 min-w-(--kb-popper-anchor-width) overflow-hidden rounded-xl p-1 shadow-lg ring-1 outline-none",
          props.class,
          props.className
        )}
        data-slot="select-content"
        {...rest}
      />
    </SelectPrimitive.Portal>
  );
};
