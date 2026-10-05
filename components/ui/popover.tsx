import * as PopoverPrimitive from "@kobalte/core/popover";
import type {
  PopoverContentOptions,
  PopoverContentCommonProps,
  PopoverRootProps,
} from "@kobalte/core/popover";

import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  HeadingDOMProps,
  ParagraphDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

/** Kobalte owns placement on the root: use `placement`, `gutter`, and `shift`. */
export const Popover = (props: PopoverRootProps) => (
  <PopoverPrimitive.Root {...props} />
);

export const PopoverTrigger = (props: ButtonProps) => (
  <PopoverPrimitive.Trigger
    as={Button}
    data-slot="popover-trigger"
    {...props}
  />
);

export interface PopoverContentProps
  extends Omit<DivDOMProps, "id" | "style">, PopoverContentOptions {
  id?: string;
  style?: PopoverContentCommonProps["style"];
  className?: string;
}

export const PopoverContent = (props: PopoverContentProps) => {
  const context = PopoverPrimitive.usePopoverContext();
  const rest = omitProps(props, ["class", "className", "onEscapeKeyDown"]);
  let restoreAfterEscape = false;

  createCompatEffect(
    () => context.isOpen(),
    (open) => {
      if (open || !restoreAfterEscape) return;
      restoreAfterEscape = false;
      const trigger = context.triggerRef();
      queueMicrotask(() => {
        if (!context.isOpen()) trigger?.focus({ preventScroll: true });
      });
    }
  );

  const escape = (event: KeyboardEvent) => {
    props.onEscapeKeyDown?.(event);

    if (event.defaultPrevented) return;
    // Kobalte 2 alpha restores focus only for modal traps. Use its public
    // trigger accessor after Escape dismissal without replacing any callbacks.
    restoreAfterEscape = true;
  };

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        class={cn(
          "bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 flex w-72 origin-(--kb-popover-content-transform-origin) flex-col gap-4 rounded-3xl p-4 text-sm shadow-lg ring-1 outline-hidden duration-100",
          props.class,
          props.className
        )}
        {...rest}
        onEscapeKeyDown={escape}
      />
    </PopoverPrimitive.Portal>
  );
};

export const PopoverHeader = (props: DivDOMProps & { className?: string }) => (
  <div
    data-slot="popover-header"
    {...omitProps(props, ["class", "className"])}
    class={cn("flex flex-col gap-1 text-sm", props.class, props.className)}
  />
);

export const PopoverTitle = (
  props: Omit<HeadingDOMProps, "id"> & { id?: string; className?: string }
) => (
  <PopoverPrimitive.Title
    data-slot="popover-title"
    {...omitProps(props, ["class", "className"])}
    class={cn("text-base font-medium", props.class, props.className)}
  />
);

export const PopoverDescription = (
  props: Omit<ParagraphDOMProps, "id"> & { id?: string; className?: string }
) => (
  <PopoverPrimitive.Description
    data-slot="popover-description"
    {...omitProps(props, ["class", "className"])}
    class={cn("text-muted-foreground", props.class, props.className)}
  />
);
