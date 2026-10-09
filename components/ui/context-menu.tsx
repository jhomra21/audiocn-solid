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
import { createContext, useContext } from "solid-js";

import { provideContext } from "@/lib/solid/context";
import type {
  DivDOMProps,
  JSXElement,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { KobalteDomCollectionScope } from "@/lib/solid/kobalte-dom-collection";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

interface TriggerContextValue {
  element?: HTMLElement;
}

const TriggerContext = createContext<TriggerContextValue>();

export const ContextMenu = (props: ContextMenuRootProps) => {
  const trigger: TriggerContextValue = {};

  return (
    <MenuPrimitive.Root {...omitProps(props, ["children"])}>
      {provideContext(TriggerContext, trigger, () => (
        <KobalteDomCollectionScope>{props.children}</KobalteDomCollectionScope>
      ))}
    </MenuPrimitive.Root>
  );
};

export const ContextMenuTrigger: typeof MenuPrimitive.Trigger = (props) => {
  const trigger = useContext(TriggerContext);

  return (
    <MenuPrimitive.Trigger
      {...omitProps(props, ["ref"])}
      ref={(element: HTMLElement) => {
        if (trigger) trigger.element = element;

        // Solid compiles writable node refs into callbacks; preserve the
        // native JSX node union for direct runtime callers.
        // oxlint-disable-next-line anti-slop/no-runtime-typeof
        if (typeof props.ref === "function") {
          // SAFETY: Kobalte supplies the same concrete node selected by `as`;
          // this callback is the callable branch of that polymorphic ref.
          const ref = props.ref as (node: HTMLElement) => void;
          ref(element);
        }
      }}
    />
  );
};

export const ContextMenuGroup = MenuPrimitive.Group;

export const ContextMenuPortal = MenuPrimitive.Portal;

export const ContextMenuSeparator = (
  props: Parameters<typeof MenuPrimitive.Separator>[0] & { className?: string }
) => (
  <MenuPrimitive.Separator
    data-slot="context-menu-separator"
    class={cn("bg-border/50 -mx-1 my-1 h-px", props.class, props.className)}
    {...omitProps(props, ["class", "className"])}
  />
);

export interface ContextMenuContentProps
  extends
    Omit<DivDOMProps, keyof ContextMenuContentCommonProps>,
    Partial<ContextMenuContentCommonProps>,
    ContextMenuContentOptions {
  className?: string;
}

export const ContextMenuContent = (props: ContextMenuContentProps) => {
  const trigger = useContext(TriggerContext);

  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        data-slot="context-menu-content"
        class={cn(
          "text-popover-foreground ring-foreground/5 dark:ring-foreground/10 bg-popover/70 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground! relative z-50 max-h-(--kb-popper-content-available-height) min-w-36 origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-2xl p-1 shadow-lg ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150",
          props.class,
          props.className
        )}
        onCloseAutoFocus={(event: Event) => {
          props.onCloseAutoFocus?.(event);

          // Secondary clicks do not focus buttons in WebKit. Kobalte's
          // prevention still protects an outside control that took focus.
          if (!event.defaultPrevented) {
            event.preventDefault();
            trigger?.element?.focus({ preventScroll: true });
          }
        }}
        {...omitProps(props, ["class", "className", "onCloseAutoFocus"])}
      />
    </MenuPrimitive.Portal>
  );
};

export const ContextMenuLabel = (
  props: Parameters<typeof MenuPrimitive.GroupLabel>[0] & {
    inset?: boolean;
    className?: string;
  }
) => (
  <MenuPrimitive.GroupLabel
    data-slot="context-menu-label"
    data-inset={props.inset ? "" : undefined}
    class={cn(
      "text-muted-foreground px-2 py-1 text-xs data-inset:pl-7",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "inset"])}
  />
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
  inset?: boolean;
  className?: string;
}

export const ContextMenuItem = (props: ContextMenuItemProps) => (
  <MenuPrimitive.Item
    data-slot="context-menu-item"
    data-variant={props.variant ?? "default"}
    data-inset={props.inset ? "" : undefined}
    class={cn(
      "group/context-menu-item focus:bg-accent focus:text-accent-foreground data-highlighted:bg-foreground/10 data-[variant=destructive]:text-destructive relative flex min-h-7 cursor-default items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "variant", "inset"])}
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
  inset?: boolean;
  className?: string;
}

export const ContextMenuRadioItem = (props: ContextMenuRadioItemProps) => (
  <MenuPrimitive.RadioItem
    data-slot="context-menu-radio-item"
    data-inset={props.inset ? "" : undefined}
    class={cn(
      "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-foreground/10 relative flex min-h-7 cursor-default items-center gap-2 rounded-xl py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "children", "inset"])}
  >
    <span aria-hidden="true" class="pointer-events-none absolute right-2">
      <MenuPrimitive.ItemIndicator>
        <MenuCheck />
      </MenuPrimitive.ItemIndicator>
    </span>
    {props.children}
  </MenuPrimitive.RadioItem>
);

const MenuCheck = () => (
  <svg
    aria-hidden="true"
    fill="currentColor"
    height="1em"
    width="1em"
    viewBox="0 0 256 256"
  >
    {/* Regular Phosphor Check, MIT © Phosphor Icons. */}
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z" />
  </svg>
);

export const ContextMenuCheckboxItem = (
  props: Parameters<typeof MenuPrimitive.CheckboxItem>[0] & {
    inset?: boolean;
    className?: string;
  }
) => (
  <MenuPrimitive.CheckboxItem
    data-slot="context-menu-checkbox-item"
    data-inset={props.inset ? "" : undefined}
    class={cn(
      "focus:bg-accent focus:text-accent-foreground data-highlighted:bg-foreground/10 relative flex min-h-7 cursor-default items-center gap-2 rounded-xl py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "children", "inset"])}
  >
    <span class="pointer-events-none absolute right-2">
      <MenuPrimitive.ItemIndicator>
        <MenuCheck />
      </MenuPrimitive.ItemIndicator>
    </span>
    {props.children}
  </MenuPrimitive.CheckboxItem>
);

export const ContextMenuShortcut = (
  props: SpanDOMProps & { className?: string }
) => (
  <span
    data-slot="context-menu-shortcut"
    class={cn(
      "text-muted-foreground group-focus/context-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const ContextMenuSub = (
  props: Parameters<typeof MenuPrimitive.Sub>[0]
) => (
  <MenuPrimitive.Sub {...omitProps(props, ["children"])}>
    <KobalteDomCollectionScope>{props.children}</KobalteDomCollectionScope>
  </MenuPrimitive.Sub>
);

export const ContextMenuSubTrigger = (
  props: Parameters<typeof MenuPrimitive.SubTrigger>[0] & {
    inset?: boolean;
    className?: string;
  }
) => (
  <MenuPrimitive.SubTrigger
    data-slot="context-menu-sub-trigger"
    data-inset={props.inset ? "" : undefined}
    class={cn(
      "focus:bg-foreground/10 data-highlighted:bg-foreground/10 aria-expanded:bg-foreground/10 flex min-h-7 cursor-default items-center rounded-xl px-2 py-1.5 text-sm outline-hidden select-none data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "children", "inset"])}
  >
    {props.children}
    <svg
      aria-hidden="true"
      class="ml-auto"
      fill="currentColor"
      height="1em"
      width="1em"
      viewBox="0 0 256 256"
    >
      {/* Regular Phosphor CaretRight, MIT © Phosphor Icons. */}
      <path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z" />
    </svg>
  </MenuPrimitive.SubTrigger>
);

export const ContextMenuSubContent = (
  props: Parameters<typeof MenuPrimitive.SubContent>[0] & { className?: string }
) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.SubContent
      data-slot="context-menu-sub-content"
      class={cn(
        "text-popover-foreground ring-foreground/5 dark:ring-foreground/10 bg-popover/70 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground! relative z-50 max-h-(--kb-popper-content-available-height) min-w-36 overflow-x-hidden overflow-y-auto rounded-2xl p-1 shadow-lg ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150",
        props.class,
        props.className
      )}
      {...omitProps(props, ["class", "className"])}
    />
  </MenuPrimitive.Portal>
);
