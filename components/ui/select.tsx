import * as SelectPrimitive from "@kobalte/core/select";
import type {
  SelectContentCommonProps,
  SelectContentOptions,
  SelectTriggerCommonProps,
} from "@kobalte/core/select";
import { children, createSignal, onCleanup } from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";
import type { ButtonDOMProps, DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;

export const SelectItem = SelectPrimitive.Item;

export const SelectGroup = SelectPrimitive.Section;

export const SelectValue = SelectPrimitive.Value;

export const SelectLabel = (
  props: Parameters<typeof SelectPrimitive.Section>[0] & { className?: string }
) => (
  <SelectPrimitive.Section
    data-slot="select-label"
    class={cn(
      "text-muted-foreground px-2 py-1 text-xs",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const SelectSeparator = (
  props: DivDOMProps & { className?: string }
) => (
  <div
    role="separator"
    data-slot="select-separator"
    class={cn(
      "bg-border pointer-events-none -mx-1 my-1 h-px",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

type SelectScrollButtonProps = Omit<
  DivDOMProps,
  | "ref"
  | "style"
  | "onPointerEnter"
  | "onPointerLeave"
  | "onPointerDown"
  | "onPointerUp"
  | "onPointerCancel"
> & {
  className?: string;
  ref?: RefTarget<HTMLDivElement>;
  style?: StyleValue;
};

// Kobalte scrolls its listbox rather than the popup and has no arrow primitive.
const SelectScrollButton = (
  props: SelectScrollButtonProps & { direction: "up" | "down" }
) => {
  const select = SelectPrimitive.useSelectContext();
  const [element, setElement] = createSignal<HTMLDivElement>();
  const [visible, setVisible] = createSignal(false);
  let listbox: HTMLElement | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const stop = () => clearInterval(timer);

  const scroll = () =>
    listbox?.scrollBy(0, props.direction === "up" ? -24 : 24);

  const start = () => {
    stop();
    scroll();
    timer = setInterval(scroll, 50);
  };

  onCleanup(stop);

  createCompatEffect(
    () => ({ element: element(), open: select.isOpen() }),
    ({ element, open }) => {
      if (!element || !open) return;
      listbox =
        element.parentElement?.querySelector<HTMLElement>('[role="listbox"]') ??
        undefined;

      if (!listbox) return;
      const target = listbox;

      const update = () => {
        const remaining =
          target.scrollHeight - target.clientHeight - target.scrollTop;

        setVisible(
          props.direction === "up" ? target.scrollTop > 1 : remaining > 1
        );
      };

      const observer = new ResizeObserver(update);
      observer.observe(target);
      target.addEventListener("scroll", update);
      update();

      return () => {
        stop();
        observer.disconnect();
        target.removeEventListener("scroll", update);
        listbox = undefined;
      };
    }
  );

  return (
    <div
      aria-hidden="true"
      data-slot={`select-scroll-${props.direction}-button`}
      hidden={!visible()}
      class={cn(
        "bg-popover absolute z-10 w-full cursor-default items-center justify-center py-1 [&_svg]:size-4",
        props.direction === "up" ? "top-0" : "bottom-0",
        props.class,
        props.className
      )}
      style={mergeStyleVars(props.style, {
        display: visible() ? "flex" : "none",
      })}
      ref={(node) => {
        setElement(node);
        setRefValue(props.ref, node);
      }}
      onPointerEnter={start}
      onPointerLeave={stop}
      onPointerDown={(event: PointerEvent) => {
        event.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      {...omitProps(props, [
        "class",
        "className",
        "children",
        "direction",
        "ref",
        "style",
      ])}
    >
      <svg fill="currentColor" viewBox="0 0 256 256">
        {/* Regular Phosphor Carets, MIT © Phosphor Icons. */}
        <path
          d={
            props.direction === "up"
              ? "M213.66,165.66a8,8,0,0,1-11.32,0L128,91.31,53.66,165.66a8,8,0,0,1-11.32-11.32l80-80a8,8,0,0,1,11.32,0l80,80A8,8,0,0,1,213.66,165.66Z"
              : "M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"
          }
        />
      </svg>
    </div>
  );
};

export const SelectScrollUpButton = (props: SelectScrollButtonProps) => (
  <SelectScrollButton {...props} direction="up" />
);

export const SelectScrollDownButton = (props: SelectScrollButtonProps) => (
  <SelectScrollButton {...props} direction="down" />
);

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
          fill="currentColor"
          viewBox="0 0 256 256"
        >
          {/* Regular Phosphor CaretDown, MIT © Phosphor Icons. */}
          <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
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
  const rest = omitProps(props, ["class", "className", "ref"]);
  const [content, setContent] = createSignal<HTMLDivElement>();
  const select = SelectPrimitive.useSelectContext();

  createCompatEffect(
    () => (select.isOpen() ? content() : undefined),
    (element) => {
      if (!element) return;

      // Floating UI constrains the popup after Kobalte's initial option focus.
      // Once that size settles, reveal the focused option in the listbox again.
      const observer = new ResizeObserver(() => {
        const focused = element.querySelector<HTMLElement>(
          '[role="option"][data-highlighted]'
        );

        if (focused) {
          const listbox = focused.closest<HTMLElement>('[role="listbox"]');

          if (!listbox) return;
          const itemRect = focused.getBoundingClientRect();
          const listRect = listbox.getBoundingClientRect();

          if (itemRect.top < listRect.top) {
            listbox.scrollTop += itemRect.top - listRect.top;
          } else if (itemRect.bottom > listRect.bottom) {
            listbox.scrollTop += itemRect.bottom - listRect.bottom;
          }
        }
      });

      observer.observe(element);

      return () => observer.disconnect();
    }
  );

  return (
    <SelectPrimitive.Portal>
      {/* Keep even the initially unpositioned popper out of document scrolling.
          Kobalte still owns option focus and scrolls the bounded content. */}
      <div
        style={{
          position: "fixed",
          inset: "0",
          "pointer-events": "none",
          "z-index": "50",
        }}
      >
        <SelectPrimitive.Content
          class={cn(
            "bg-popover/70 text-popover-foreground ring-foreground/5 dark:ring-foreground/10 pointer-events-auto relative isolate z-50 min-w-(--kb-popper-anchor-width) overflow-hidden rounded-2xl p-1 shadow-lg ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 [&_[role=listbox]]:max-h-[calc(var(--kb-popper-content-available-height)-0.5rem)] [&_[role=listbox]]:overflow-y-auto",
            props.class,
            props.className
          )}
          ref={(element: HTMLDivElement) => {
            setContent(element);

            // Preserve the public JSX ref union: Solid compiles writable node
            // refs into callbacks, while direct runtime callers can pass a node.
            // oxlint-disable-next-line anti-slop/no-runtime-typeof
            if (typeof props.ref === "function") props.ref(element);
          }}
          data-slot="select-content"
          {...rest}
        />
      </div>
    </SelectPrimitive.Portal>
  );
};
