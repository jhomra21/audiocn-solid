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
  size?: "default" | "sm";
}

export const SelectTrigger = (props: SelectTriggerProps) => {
  const rest = omitProps(props, ["class", "className", "children", "size"]);

  // Own the content before Kobalte's polymorphic button so SSR and hydration
  // evaluate it under the same owner, rather than different internal branches.
  const content = children(() => (
    <>
      {props.children}
      <SelectPrimitive.Icon aria-hidden="true">
        <svg
          class="text-muted-foreground size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            d="m6 9 6 6 6-6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </SelectPrimitive.Icon>
    </>
  ));

  return (
    <SelectPrimitive.Trigger
      role="combobox"
      data-size={props.size ?? "default"}
      class={cn(
        "bg-input/50 focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex items-center justify-between gap-1.5 rounded-2xl border border-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] duration-200 outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 data-[size=default]:h-8 data-[size=sm]:h-7 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
