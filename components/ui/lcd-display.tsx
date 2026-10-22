import * as SelectPrimitive from "@kobalte/core/select";
import type { SelectItemOptions, SelectRootProps } from "@kobalte/core/select";
import { cva } from "class-variance-authority";
import {
  Show,
  createContext,
  createSignal,
  createUniqueId,
  useContext,
} from "solid-js";

import { SelectContent } from "@/components/ui/select";
import type { SelectContentProps } from "@/components/ui/select";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  JSXElement,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

export type LcdDisplayVariant = "primary" | "amber" | "green" | "cyan" | "red";

export type LcdDisplaySize = "sm" | "default" | "lg";

export type LcdDisplayAppearance = "auto" | "light" | "dark";

const LIGHT_SCREEN =
  "[--lcd-display-bezel-edge:oklch(0.85_0.004_250)] [--lcd-display-bezel-ring:rgb(0_0_0/0.14)] [--lcd-display-bezel-shadow:inset_0_1px_0_rgb(255_255_255/0.8),0_1px_3px_rgb(0_0_0/0.18)] [--lcd-display-bezel:oklch(0.95_0.003_250)] [--lcd-display-glass:oklch(from_var(--lcd-display-ink)_0.93_calc(c*0.35)_h)] [--lcd-display-glow:color-mix(in_oklab,var(--lcd-display-lit)_22%,transparent)] [--lcd-display-lit:color-mix(in_oklab,var(--lcd-display-ink),black_62%)] [--lcd-display-recess:inset_0_1px_4px_rgb(0_0_0/0.28),inset_0_0_0_1px_rgb(0_0_0/0.2)] [--lcd-display-scanline:rgb(0_0_0/0.04)] [--lcd-display-sheen:rgb(255_255_255/0.35)]";

const DARK_SCREEN =
  "[--lcd-display-bezel-edge:oklch(0.24_0.004_250)] [--lcd-display-bezel-ring:rgb(0_0_0/0.7)] [--lcd-display-bezel-shadow:inset_0_1px_0_rgb(255_255_255/0.06),0_2px_6px_rgb(0_0_0/0.5)] [--lcd-display-bezel:oklch(0.33_0.004_250)] [--lcd-display-glass:oklch(0.15_0.004_200)] [--lcd-display-glow:color-mix(in_oklab,var(--lcd-display-lit)_60%,transparent)] [--lcd-display-lit:var(--lcd-display-ink)] [--lcd-display-recess:inset_0_2px_10px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(0_0_0/0.8)] [--lcd-display-scanline:rgb(0_0_0/0.22)] [--lcd-display-sheen:rgb(255_255_255/0.05)]";

const DARK_SCREEN_IN_DARK_THEME =
  "dark:[--lcd-display-bezel-edge:oklch(0.24_0.004_250)] dark:[--lcd-display-bezel-ring:rgb(0_0_0/0.7)] dark:[--lcd-display-bezel-shadow:inset_0_1px_0_rgb(255_255_255/0.06),0_2px_6px_rgb(0_0_0/0.5)] dark:[--lcd-display-bezel:oklch(0.33_0.004_250)] dark:[--lcd-display-glass:oklch(0.15_0.004_200)] dark:[--lcd-display-glow:color-mix(in_oklab,var(--lcd-display-lit)_60%,transparent)] dark:[--lcd-display-lit:var(--lcd-display-ink)] dark:[--lcd-display-recess:inset_0_2px_10px_rgb(0_0_0/0.9),inset_0_0_0_1px_rgb(0_0_0/0.8)] dark:[--lcd-display-scanline:rgb(0_0_0/0.22)] dark:[--lcd-display-sheen:rgb(255_255_255/0.05)]";

export const lcdDisplayVariants = cva(
  "[--lcd-display-font:var(--font-mono)] [--lcd-display-ink-dim:color-mix(in_oklab,var(--lcd-display-lit)_40%,transparent)] [--lcd-display-ink-unlit:color-mix(in_oklab,var(--lcd-display-lit)_7%,transparent)] [--lcd-display-pitch:2px]",
  {
    defaultVariants: {
      appearance: "auto",
      size: "default",
      variant: "primary",
    },
    variants: {
      appearance: {
        auto: `${LIGHT_SCREEN} ${DARK_SCREEN_IN_DARK_THEME}`,
        dark: DARK_SCREEN,
        light: LIGHT_SCREEN,
      },
      size: { default: "text-lg", lg: "text-2xl", sm: "text-sm" },
      variant: {
        amber: "[--lcd-display-ink:oklch(0.76_0.13_52)]",
        cyan: "[--lcd-display-ink:oklch(0.84_0.12_205)]",
        green: "[--lcd-display-ink:oklch(0.85_0.19_142)]",
        primary: "[--lcd-display-ink:var(--primary)]",
        red: "[--lcd-display-ink:oklch(0.68_0.2_27)]",
      },
    },
  }
);

// The popup is portalled out of the display, so it copies these variables instead of inheriting them.
const SHARED_VARIABLES = [
  "--lcd-display-bezel",
  "--lcd-display-bezel-edge",
  "--lcd-display-font",
  "--lcd-display-glass",
  "--lcd-display-glow",
  "--lcd-display-ink",
  "--lcd-display-ink-dim",
  "--lcd-display-ink-unlit",
  "--lcd-display-lit",
  "--lcd-display-pitch",
] as const;

interface DisplayContext {
  appearance: () => LcdDisplayAppearance;
  variant: () => LcdDisplayVariant;
  size: () => LcdDisplaySize;
  matrix: () => boolean;
  scanlines: () => boolean;
  root: () => HTMLDivElement | undefined;
}

const DEFAULT_DISPLAY_CONTEXT: DisplayContext = {
  appearance: (): LcdDisplayAppearance => "auto",
  matrix: () => true,
  root: () => undefined,
  scanlines: () => true,
  size: (): LcdDisplaySize => "default",
  variant: (): LcdDisplayVariant => "primary",
};

const DisplayContext = createContext(DEFAULT_DISPLAY_CONTEXT);

const RowContext = createContext<{
  labelId: () => string;
  setCustomId: (id: string | undefined) => void;
}>();

const LcdScreen = (props: {
  matrix: boolean;
  scanlines: boolean;
  class?: string;
  contentClass?: string;
  children?: JSXElement;
}) => (
  <div
    class={cn(
      "relative isolate overflow-hidden rounded-md bg-(--lcd-display-glass) shadow-(--lcd-display-recess)",
      props.matrix &&
        "before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle,var(--lcd-display-ink-unlit)_45%,transparent_55%)] before:bg-size-[var(--lcd-display-pitch)_var(--lcd-display-pitch)]",
      "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(to_bottom,var(--lcd-display-sheen),transparent_45%)]",
      props.scanlines &&
        "after:bg-[linear-gradient(to_bottom,var(--lcd-display-sheen),transparent_45%),repeating-linear-gradient(to_bottom,transparent_0_2px,var(--lcd-display-scanline)_2px_3px)]",
      props.class
    )}
    data-slot="lcd-display-screen"
  >
    <div class="drop-shadow-[0_0_3px_var(--lcd-display-glow)]">
      <div
        class={cn(
          "relative",
          props.matrix &&
            "mask-[radial-gradient(circle,#000_58%,transparent_64%)] mask-size-[var(--lcd-display-pitch)_var(--lcd-display-pitch)]",
          props.contentClass
        )}
        data-slot="lcd-display-content"
      >
        {props.children}
      </div>
    </div>
  </div>
);

export interface LcdDisplayProps extends Omit<DivDOMProps, "ref"> {
  variant?: LcdDisplayVariant;
  appearance?: LcdDisplayAppearance;
  size?: LcdDisplaySize;
  matrix?: boolean;
  scanlines?: boolean;
  className?: string;
  ref?: RefTarget<HTMLDivElement>;
}

export const LcdDisplay = (props: LcdDisplayProps) => {
  const [root, setRoot] = createSignal<HTMLDivElement>();

  const context: DisplayContext = {
    appearance: () => props.appearance ?? "auto",
    matrix: () => props.matrix ?? true,
    root,
    scanlines: () => props.scanlines ?? true,
    size: () => props.size ?? "default",
    variant: () => props.variant ?? "primary",
  };

  const rest = omitProps(props, [
    "appearance",
    "class",
    "className",
    "children",
    "matrix",
    "ref",
    "scanlines",
    "size",
    "variant",
  ]);

  return provideContext(DisplayContext, context, () => (
    <div
      class={cn(
        lcdDisplayVariants({
          appearance: context.appearance(),
          size: context.size(),
          variant: context.variant(),
        }),
        "rounded-lg bg-linear-to-b from-(--lcd-display-bezel) to-(--lcd-display-bezel-edge) p-1.5 font-(family-name:--lcd-display-font) leading-none tracking-[0.12em] uppercase shadow-(--lcd-display-bezel-shadow) ring-1 ring-(--lcd-display-bezel-ring)",
        props.class,
        props.className
      )}
      data-appearance={context.appearance()}
      data-matrix={context.matrix() ? "" : undefined}
      data-slot="lcd-display"
      data-size={context.size()}
      data-variant={context.variant()}
      ref={(node) => {
        setRoot(node);
        setRefValue(props.ref, node);
      }}
      role="group"
      {...rest}
    >
      <LcdScreen
        contentClass="flex flex-col px-4 py-2"
        matrix={context.matrix()}
        scanlines={context.scanlines()}
      >
        {props.children}
      </LcdScreen>
    </div>
  ));
};

export const LcdDisplayRow = (props: DivDOMProps & { className?: string }) => {
  const generatedId = createUniqueId();
  const [customId, setCustomId] = createSignal<string>();
  const row = { labelId: () => customId() ?? generatedId, setCustomId };

  return provideContext(RowContext, row, () => (
    <div
      class={cn(
        "flex items-center justify-between gap-8 py-3",
        props.class,
        props.className
      )}
      data-slot="lcd-display-row"
      {...omitProps(props, ["class", "className", "children"])}
    >
      {props.children}
    </div>
  ));
};

export const LcdDisplayLabel = (
  props: SpanDOMProps & { className?: string }
) => {
  const row = useContext(RowContext);
  const id = () => props.id || undefined;
  createCompatEffect(id, (id) => {
    row?.setCustomId(id);

    return () => row?.setCustomId(undefined);
  });

  return (
    <span
      class={cn("text-(--lcd-display-ink-dim)", props.class, props.className)}
      data-slot="lcd-display-label"
      id={id() ?? row?.labelId()}
      {...omitProps(props, ["class", "className", "children", "id"])}
    >
      {props.children}
    </span>
  );
};

const useFlicker = (getElement: () => HTMLElement | undefined) =>
  createCompatEffect(getElement, (element) => {
    if (!element) return;
    let text = element.textContent;
    let frame = 0;

    const observer = new MutationObserver(() => {
      if (element.textContent === text) return;
      text = element.textContent;
      cancelAnimationFrame(frame);
      element.dataset.changed = "";
      // Two frames: one to paint dimmed, one to start the fade back.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => delete element.dataset.changed);
      });
    });

    observer.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      delete element.dataset.changed;
    };
  });

const FLICKER =
  "transition-opacity duration-150 data-changed:opacity-35 data-changed:duration-0 motion-reduce:transition-none motion-reduce:data-changed:opacity-100";

export interface LcdDisplayValueProps extends Omit<SpanDOMProps, "ref"> {
  live?: boolean;
  className?: string;
  ref?: RefTarget<HTMLSpanElement>;
}

export const LcdDisplayValue = (props: LcdDisplayValueProps) => {
  const [element, setElement] = createSignal<HTMLSpanElement>();
  useFlicker(element);

  return (
    <span
      aria-live={props.live ? "polite" : undefined}
      class={cn(
        "text-(--lcd-display-lit) tabular-nums",
        FLICKER,
        props.class,
        props.className
      )}
      data-slot="lcd-display-value"
      ref={(node) => {
        setElement(node);
        setRefValue(props.ref, node);
      }}
      {...omitProps(props, ["class", "className", "children", "live", "ref"])}
    >
      {props.children}
    </span>
  );
};

export const LcdDisplaySeparator = (
  props: DivDOMProps & { className?: string }
) => (
  <div
    class={cn(
      "h-(--lcd-display-pitch) shrink-0 bg-[radial-gradient(circle,var(--lcd-display-ink-dim)_45%,transparent_55%)] bg-size-[calc(var(--lcd-display-pitch)*2)_var(--lcd-display-pitch)]",
      props.class,
      props.className
    )}
    data-slot="lcd-display-separator"
    role="separator"
    {...omitProps(props, ["class", "className"])}
  />
);

export interface LcdDisplayStatusProps extends SpanDOMProps {
  state?: "idle" | "busy" | "off";
  className?: string;
}

export const LcdDisplayStatus = (props: LcdDisplayStatusProps) => (
  <span
    aria-hidden="true"
    class={cn(
      "absolute right-2 bottom-2 size-1.5 animate-pulse bg-(--lcd-display-lit) data-[state=busy]:[animation-duration:0.6s] data-[state=off]:animate-none data-[state=off]:bg-(--lcd-display-ink-unlit) motion-reduce:animate-none",
      props.class,
      props.className
    )}
    data-slot="lcd-display-status"
    data-state={props.state ?? "idle"}
    {...omitProps(props, ["class", "className", "state"])}
  />
);

export interface LcdDisplayOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface LcdDisplaySelectProps {
  items: LcdDisplayOption[];
  value?: string | null;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placement?: SelectRootProps<LcdDisplayOption>["placement"];
  gutter?: number;
  children?: JSXElement;
}

export const LcdDisplaySelect = (props: LcdDisplaySelectProps) => {
  const [uncontrolled, setUncontrolled] = createSignal(props.defaultValue);

  const current = () =>
    props.value !== undefined ? props.value : uncontrolled();

  return (
    <SelectPrimitive.Root<LcdDisplayOption>
      options={props.items}
      optionValue="value"
      optionTextValue="label"
      optionDisabled={(item) => item.disabled === true}
      placement={props.placement ?? "bottom-end"}
      gutter={props.gutter ?? 8}
      disallowEmptySelection
      value={props.items.find((item) => item.value === current()) ?? null}
      disabled={props.disabled}
      onChange={(item) => {
        if (!item) return;

        if (props.value === undefined) setUncontrolled(item.value);
        props.onValueChange?.(item.value);
      }}
      itemComponent={(itemProps) => (
        <LcdDisplaySelectItem item={itemProps.item}>
          {itemProps.item.rawValue.label}
        </LcdDisplaySelectItem>
      )}
    >
      {props.children}
    </SelectPrimitive.Root>
  );
};

export interface LcdDisplaySelectTriggerProps extends Omit<
  Parameters<typeof SelectPrimitive.Trigger>[0],
  "ref"
> {
  placeholder?: string;
  className?: string;
  ref?: RefTarget<HTMLButtonElement>;
}

export const LcdDisplaySelectTrigger = (
  props: LcdDisplaySelectTriggerProps
) => {
  const row = useContext(RowContext);
  const selection = SelectPrimitive.useSelectContext();
  const [element, setElement] = createSignal<HTMLButtonElement>();
  useFlicker(element);
  const empty = () => selection.selectedOptions().length === 0;

  return (
    <SelectPrimitive.Trigger
      aria-labelledby={row?.labelId()}
      class={cn(
        "-mx-1 inline-flex cursor-pointer items-center gap-3 rounded-sm px-1 py-0.5 text-(--lcd-display-lit) uppercase tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-(--lcd-display-lit) disabled:cursor-default disabled:text-(--lcd-display-ink-dim) data-placeholder:text-(--lcd-display-ink-dim)",
        FLICKER,
        props.class,
        props.className
      )}
      data-slot="lcd-display-select-trigger"
      data-placeholder={empty() ? "" : undefined}
      ref={(node) => {
        setElement(node);
        setRefValue(props.ref, node);
      }}
      {...omitProps(props, [
        "class",
        "className",
        "children",
        "placeholder",
        "ref",
      ])}
    >
      {props.children ?? (
        <Show
          fallback={
            <SelectPrimitive.Value<LcdDisplayOption>>
              {(state) => state.selectedOption()?.label}
            </SelectPrimitive.Value>
          }
          when={empty()}
        >
          {props.placeholder}
        </Show>
      )}
      <SelectPrimitive.Icon
        aria-hidden="true"
        class="transition-transform duration-150 data-expanded:rotate-180 motion-reduce:transition-none"
      >
        <svg
          class="h-1.5 w-2.5 shrink-0 [shape-rendering:crispEdges]"
          fill="currentColor"
          viewBox="0 0 5 3"
        >
          <path d="M0 0h1v1H0zM4 0h1v1H4zM1 1h1v1H1zM3 1h1v1H3zM2 2h1v1H2z" />
        </svg>
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
};

export interface LcdDisplaySelectContentProps extends Omit<
  SelectContentProps,
  "children" | "ref"
> {
  ref?: RefTarget<HTMLDivElement>;
}

export const LcdDisplaySelectContent = (
  props: LcdDisplaySelectContentProps
) => {
  const context = useContext(DisplayContext) ?? DEFAULT_DISPLAY_CONTEXT;

  return (
    <SelectContent
      class={cn(
        lcdDisplayVariants({
          appearance: context.appearance(),
          size: context.size(),
          variant: context.variant(),
        }),
        "min-w-(--kb-popper-anchor-width) rounded-md bg-(--lcd-display-bezel-edge) p-1 font-(family-name:--lcd-display-font) leading-none tracking-[0.12em] text-(--lcd-display-ink-dim) uppercase shadow-xl ring-1 ring-(--lcd-display-bezel-ring) outline-none before:hidden dark:ring-(--lcd-display-bezel-ring) [&_[role=listbox]]:max-h-[calc(var(--kb-popper-content-available-height)-1rem)] [&_[role=listbox]]:overflow-y-auto",
        props.class,
        props.className
      )}
      data-appearance={context.appearance()}
      data-slot="lcd-display-select-content"
      data-variant={context.variant()}
      ref={(node) => {
        // The popup is portalled out of the display, so copy the shared variables it cannot inherit.
        const root = context.root();

        if (root) {
          const style = getComputedStyle(root);

          for (const name of SHARED_VARIABLES) {
            const value = style.getPropertyValue(name);

            if (value) node.style.setProperty(name, value);
          }
        }

        setRefValue(props.ref, node);
      }}
      {...omitProps(props, ["class", "className", "ref"])}
    >
      <LcdScreen
        contentClass="p-1"
        matrix={context.matrix()}
        scanlines={context.scanlines()}
      >
        <SelectPrimitive.Listbox />
      </LcdScreen>
    </SelectContent>
  );
};

const LcdDisplaySelectItem = (
  props: Parameters<typeof SelectPrimitive.Item>[0] &
    SelectItemOptions & { className?: string }
) => (
  <SelectPrimitive.Item
    item={props.item}
    class={cn(
      "flex cursor-default items-center gap-2 rounded-sm px-2 py-2 text-(--lcd-display-ink-dim) outline-none select-none data-disabled:opacity-40 data-highlighted:bg-(--lcd-display-lit) data-highlighted:text-(--lcd-display-glass) data-selected:text-(--lcd-display-lit) data-selected:data-highlighted:text-(--lcd-display-glass)",
      props.class,
      props.className
    )}
    data-slot="lcd-display-select-item"
    {...omitProps(props, ["class", "className", "children", "item"])}
  >
    <span class="size-1.5 shrink-0">
      <SelectPrimitive.ItemIndicator
        class="block size-full"
        data-slot="lcd-display-select-indicator"
      >
        <span class="block size-full bg-current" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemLabel>{props.children}</SelectPrimitive.ItemLabel>
  </SelectPrimitive.Item>
);
