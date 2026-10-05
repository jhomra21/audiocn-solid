import {
  Show,
  createContext,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
  useContext,
} from "solid-js";

import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type { ButtonDOMProps, DivDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  readonly value: string | undefined;
  readonly disabled: boolean;
  readonly orientation: "horizontal" | "vertical";
  readonly activationMode: "automatic" | "manual";
  /** The trigger that receives Tab focus, even when `value` matches no enabled trigger. */
  readonly focusValue: string | undefined;
  id: string;
  select: (value: string) => void;
  register: (trigger: TabsTriggerEntry) => () => void;
}

interface TabsTriggerEntry {
  value: string;
  disabled: () => boolean;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabs = () => {
  const context = useContext(TabsContext);

  if (!context) throw new Error("Tabs parts must be used inside Tabs.");

  return context;
};

export interface TabsProps extends Omit<DivDOMProps, "onChange" | "ref"> {
  ref?: RefTarget<HTMLDivElement>;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  orientation?: "horizontal" | "vertical";
  activationMode?: "automatic" | "manual";
  onChange?: (value: string) => void;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Tabs = (props: TabsProps) => {
  const rest = omitProps(props, [
    "class",
    "className",
    "onValueChange",
    "onChange",
    "children",
    "value",
    "defaultValue",
    "orientation",
    "activationMode",
    "disabled",
    "ref",
  ]);

  const [value, setValue] = createSignal(untrack(() => props.defaultValue));

  const refOptions = { ownedWrite: true, name: "Tabs.root" };

  const [element, setElement] = createSignal<HTMLDivElement | undefined>(
    undefined,
    refOptions
  );

  const id = createUniqueId();

  const [triggers, setTriggers] = createSignal<TabsTriggerEntry[]>(
    [],
    refOptions
  );

  // Published after mount: during SSR later triggers are not registered yet.
  const [focusValue, setFocusValue] = createSignal<string | undefined>(
    undefined,
    refOptions
  );

  const context: TabsContextValue = {
    id,
    get value() {
      return props.value ?? value();
    },
    get disabled() {
      return props.disabled ?? false;
    },
    get orientation() {
      return props.orientation ?? "horizontal";
    },
    get activationMode() {
      return props.activationMode ?? "automatic";
    },
    select(next) {
      if (context.disabled || next === context.value) return;

      if (props.value === undefined) setValue(next);
      props.onChange?.(next);
      props.onValueChange?.(next);
    },
    get focusValue() {
      return focusValue() ?? context.value;
    },
    register(trigger) {
      setTriggers((current) => [...current, trigger]);

      return () =>
        setTriggers((current) => current.filter((item) => item !== trigger));
    },
  };

  createCompatEffect(
    () => ({ element: element(), value: context.value }),
    ({ element, value }) => {
      if (value !== undefined) return;

      const first = element?.querySelector<HTMLElement>(
        '[role="tab"]:not(:disabled)'
      );

      if (first?.dataset.value) context.select(first.dataset.value);
    }
  );

  createCompatEffect(
    () => {
      const enabled = triggers().filter((trigger) => !trigger.disabled());

      return enabled.some((trigger) => trigger.value === context.value)
        ? context.value
        : enabled[0]?.value;
    },
    (next) => {
      setFocusValue(next);
    }
  );

  return provideContext(TabsContext, context, () => (
    <div
      data-slot="tabs"
      data-orientation={context.orientation}
      class={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        props.class,
        props.className
      )}
      ref={(node) => {
        setElement(node);
        setRefValue(props.ref, node);
      }}
      {...rest}
    >
      {props.children}
    </div>
  ));
};

export interface TabsListProps extends Omit<DivDOMProps, "onKeyDown"> {
  variant?: "default" | "line";
  className?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
}

export const TabsList = (props: TabsListProps) => {
  const context = useTabs();
  const variant = () => props.variant ?? "default";
  const rest = omitProps(props, ["class", "className", "variant", "onKeyDown"]);

  const navigate = (event: KeyboardEvent) => {
    props.onKeyDown?.(event);

    if (
      event.defaultPrevented ||
      context.disabled ||
      !(event.currentTarget instanceof HTMLElement)
    )
      return;
    const list = event.currentTarget;

    const tabs = [
      ...list.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)'
      ),
    ];

    const current = tabs.findIndex((tab) => tab === event.target);

    if (current === -1) return;
    const rtl = getComputedStyle(list).direction === "rtl";

    const nextKey =
      context.orientation === "vertical"
        ? "ArrowDown"
        : rtl
          ? "ArrowLeft"
          : "ArrowRight";

    const previousKey =
      context.orientation === "vertical"
        ? "ArrowUp"
        : rtl
          ? "ArrowRight"
          : "ArrowLeft";

    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === nextKey
            ? (current + 1) % tabs.length
            : event.key === previousKey
              ? (current - 1 + tabs.length) % tabs.length
              : undefined;

    if (index === undefined) return;
    event.preventDefault();
    tabs[index]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-orientation={context.orientation}
      data-orientation={context.orientation}
      onKeyDown={navigate}
      data-slot="tabs-list"
      data-variant={variant()}
      class={cn(
        "group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center rounded-2xl p-[3px] group-data-[orientation=horizontal]/tabs:h-8 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:p-1 data-[variant=line]:rounded-none",
        props.variant === "line" ? "gap-1 bg-transparent" : "bg-muted",
        props.class,
        props.className
      )}
      {...rest}
    />
  );
};

export interface TabsTriggerProps extends Omit<
  ButtonDOMProps,
  "disabled" | "onClick" | "onFocus" | "type"
> {
  value: string;
  disabled?: boolean;
  onClick?: (event: MouseEvent) => void;
  onFocus?: (event: FocusEvent) => void;
  className?: string;
}

export const TabsTrigger = (props: TabsTriggerProps) => {
  const context = useTabs();
  const active = () => context.value === props.value;
  const disabled = () => context.disabled || props.disabled === true;

  const rest = omitProps(props, [
    "class",
    "className",
    "value",
    "disabled",
    "onClick",
    "onFocus",
    "id",
  ]);

  onCleanup(context.register({ value: props.value, disabled }));

  return (
    <button
      role="tab"
      type="button"
      id={`${context.id}-trigger-${props.value}`}
      aria-controls={`${context.id}-panel-${props.value}`}
      aria-selected={active() ? "true" : "false"}
      disabled={disabled()}
      data-value={props.value}
      data-orientation={context.orientation}
      tabindex={context.focusValue === props.value ? 0 : -1}
      onClick={(event) => {
        props.onClick?.(event);

        if (!event.defaultPrevented && !disabled()) context.select(props.value);
      }}
      onFocus={(event) => {
        props.onFocus?.(event);

        if (
          !event.defaultPrevented &&
          context.activationMode === "automatic" &&
          !disabled()
        )
          context.select(props.value);
      }}
      data-slot="tabs-trigger"
      data-active={active() ? "" : undefined}
      class={cn(
        "text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:text-muted-foreground dark:hover:text-foreground data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground after:bg-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-transparent! px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:px-3 group-data-[orientation=vertical]/tabs:py-0.5 group-data-[variant=line]/tabs-list:bg-transparent after:absolute after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 focus-visible:ring-3 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:after:opacity-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        props.class,
        props.className
      )}
      {...rest}
    />
  );
};

export interface TabsContentProps extends DivDOMProps {
  value: string;
  forceMount?: boolean;
  className?: string;
}

export const TabsContent = (props: TabsContentProps) => {
  const context = useTabs();

  const rest = omitProps(props, [
    "class",
    "className",
    "value",
    "forceMount",
    "id",
  ]);

  const selected = () => context.value === props.value;

  return (
    <Show when={props.forceMount || selected()}>
      <div
        role="tabpanel"
        id={`${context.id}-panel-${props.value}`}
        aria-labelledby={`${context.id}-trigger-${props.value}`}
        tabindex="0"
        hidden={!selected()}
        data-slot="tabs-content"
        class={cn("flex-1 text-sm outline-none", props.class, props.className)}
        {...rest}
      />
    </Show>
  );
};
