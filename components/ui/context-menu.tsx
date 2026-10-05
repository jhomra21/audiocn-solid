import * as MenuPrimitive from "@kobalte/core/context-menu";
import type {
  ContextMenuContentCommonProps,
  ContextMenuContentOptions,
  ContextMenuItemCommonProps,
  ContextMenuItemOptions,
  ContextMenuRadioItemCommonProps,
  ContextMenuRadioItemOptions,
  ContextMenuRadioGroupOptions,
  ContextMenuRootProps,
} from "@kobalte/core/context-menu";

import type { DivDOMProps, JSXElement } from "@/lib/solid/jsx-types";
import { KobalteDomCollectionScope } from "@/lib/solid/kobalte-dom-collection";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export const ContextMenu = (props: ContextMenuRootProps) => (
  <MenuPrimitive.Root {...omitProps(props, ["children"])}>
    <KobalteDomCollectionScope>{props.children}</KobalteDomCollectionScope>
  </MenuPrimitive.Root>
);

export const ContextMenuTrigger = MenuPrimitive.Trigger;

export const ContextMenuGroup = MenuPrimitive.Group;

export const ContextMenuSeparator = () => (
  <MenuPrimitive.Separator
    data-slot="context-menu-separator"
    class="bg-border -mx-1 my-1 h-px"
  />
);

export interface ContextMenuContentProps
  extends
    Omit<DivDOMProps, keyof ContextMenuContentCommonProps>,
    Partial<ContextMenuContentCommonProps>,
    ContextMenuContentOptions {
  className?: string;
}

export const ContextMenuContent = (props: ContextMenuContentProps) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Content
      data-slot="context-menu-content"
      class={cn(
        "text-popover-foreground ring-foreground/5 dark:ring-foreground/10 bg-popover/70 relative z-50 max-h-(--kb-popper-content-available-height) min-w-36 origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl p-1 shadow-lg ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150",
        props.class,
        props.className
      )}
      {...omitProps(props, ["class", "className"])}
    />
  </MenuPrimitive.Portal>
);

export const ContextMenuLabel = (props: { children?: JSXElement }) => (
  <MenuPrimitive.GroupLabel
    data-slot="context-menu-label"
    class="text-muted-foreground px-2 py-1 text-xs"
  >
    {props.children}
  </MenuPrimitive.GroupLabel>
);

export interface ContextMenuItemProps
  extends
    Omit<
      DivDOMProps,
      keyof ContextMenuItemCommonProps | keyof ContextMenuItemOptions
    >,
    Partial<ContextMenuItemCommonProps>,
    ContextMenuItemOptions {
  variant?: "default" | "destructive";
  className?: string;
}

export const ContextMenuItem = (props: ContextMenuItemProps) => (
  <MenuPrimitive.Item
    data-slot="context-menu-item"
    data-variant={props.variant ?? "default"}
    class={cn(
      "group/context-menu-item focus:bg-accent focus:text-accent-foreground data-highlighted:bg-foreground/10 data-[variant=destructive]:text-destructive relative flex min-h-7 cursor-default items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "variant"])}
  />
);

export const ContextMenuRadioGroup = (
  props: ContextMenuRadioGroupOptions & {
    children?: JSXElement;
    onValueChange?: (value: string) => void;
  }
) => (
  <MenuPrimitive.RadioGroup
    data-slot="context-menu-radio-group"
    {...omitProps(props, ["onValueChange"])}
    onChange={(value) => {
      props.onChange?.(value);
      props.onValueChange?.(value);
    }}
  />
);

export interface ContextMenuRadioItemProps
  extends
    Omit<
      DivDOMProps,
      keyof ContextMenuRadioItemCommonProps | keyof ContextMenuRadioItemOptions
    >,
    Partial<ContextMenuRadioItemCommonProps>,
    ContextMenuRadioItemOptions {
  className?: string;
}

export const ContextMenuRadioItem = (props: ContextMenuRadioItemProps) => (
  <MenuPrimitive.RadioItem
    data-slot="context-menu-radio-item"
    class={cn(
      "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-foreground/10 relative flex min-h-7 cursor-default items-center gap-2 rounded-xl py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "children"])}
  >
    <span aria-hidden="true" class="pointer-events-none absolute right-2">
      <MenuPrimitive.ItemIndicator>✓</MenuPrimitive.ItemIndicator>
    </span>
    {props.children}
  </MenuPrimitive.RadioItem>
);
