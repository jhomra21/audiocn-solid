import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import { Show, createContext, createMemo, untrack, useContext } from "solid-js";

import { provideContext } from "@/lib/solid/context";
import type {
  DivDOMProps,
  ImageDOMProps,
  ListDOMProps,
  ListItemDOMProps,
  SpanDOMProps,
  JSXElement,
} from "@/lib/solid/jsx-types";
import { forwardProps, omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const ITEM_SELECTOR = "[data-slot='track-list-item']:not([data-disabled])";

const TrackListItemContext = createContext({ active: false, playing: false });

export const trackListVariants = cva("group/track-list flex w-full flex-col", {
  defaultVariants: { size: "default", variant: "default" },
  variants: {
    size: {
      default: "gap-0.5 [--track-row-height:3rem]",
      lg: "gap-1 [--track-row-height:3.5rem]",
      sm: "gap-0 [--track-row-height:2.25rem]",
    },
    variant: { default: "", outline: "rounded-xl border p-1" },
  },
});

export interface TrackListProps
  extends
    Omit<ListDOMProps, "onKeyDown">,
    VariantProps<typeof trackListVariants> {
  className?: string;
  onKeyDown?: (event: KeyboardEvent) => void;
}

const moveFocus = (event: KeyboardEvent) => {
  const root = event.currentTarget;
  const target = event.target;

  if (
    !(root instanceof HTMLElement && target instanceof HTMLElement) ||
    !target.matches(ITEM_SELECTOR)
  )
    return;
  const items = [...root.querySelectorAll<HTMLElement>(ITEM_SELECTOR)];
  const index = items.indexOf(target);

  const targets = {
    ArrowDown: index + 1,
    ArrowUp: index - 1,
    Home: 0,
    End: items.length - 1,
  };

  if (!Object.hasOwn(targets, event.key)) return;
  // SAFETY: The own-property check proves this is a navigation key.
  const next = items[targets[event.key as keyof typeof targets]];

  if (next) {
    event.preventDefault();
    next.focus();
  }
};

export const TrackList = (props: TrackListProps) => {
  const rest = omitProps(props, [
    "class",
    "className",
    "size",
    "variant",
    "onKeyDown",
  ]);

  return (
    <ul
      class={cn(
        trackListVariants({ size: props.size, variant: props.variant }),
        props.class,
        props.className
      )}
      data-size={props.size ?? "default"}
      data-slot="track-list"
      onKeyDown={(event: KeyboardEvent) => {
        props.onKeyDown?.(event);

        if (!event.defaultPrevented) moveFocus(event);
      }}
      {...rest}
    />
  );
};

export type TrackListItemRenderProps = Omit<
  ListItemDOMProps,
  "onClick" | "onKeyDown"
> & {
  "data-slot": "track-list-item";
  "data-active"?: string;
  "data-playing"?: string;
  "data-disabled"?: string;
  onClick: (event: MouseEvent) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

export interface TrackListItemProps extends Omit<
  ListItemDOMProps,
  "onClick" | "onKeyDown"
> {
  className?: string;
  active?: boolean;
  playing?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  render?: (
    props: TrackListItemRenderProps,
    state: { readonly active: boolean; readonly playing: boolean }
  ) => JSXElement;
}

export const TrackListItem = (props: TrackListItemProps) => {
  const rest = omitProps(props, [
    "class",
    "className",
    "children",
    "active",
    "playing",
    "disabled",
    "onSelect",
    "onClick",
    "onKeyDown",
    "render",
  ]);

  const settings = {
    get active() {
      return props.active ?? false;
    },
    get playing() {
      return props.playing ?? false;
    },
  };

  const renderProps: TrackListItemRenderProps = {
    get "aria-current"() {
      return props.active ? "true" : undefined;
    },
    get "aria-disabled"() {
      return props.disabled ? "true" : undefined;
    },
    get class() {
      return cn(
        "group/track-list-item hover:bg-muted/60 focus-visible:ring-ring/30 data-active:bg-muted relative flex min-h-(--track-row-height) cursor-default items-center gap-3 rounded-lg px-2 text-sm transition-colors outline-none focus-visible:ring-3 data-disabled:opacity-50",
        props.class,
        props.className
      );
    },
    "data-slot": "track-list-item",
    get "data-active"() {
      return props.active ? "" : undefined;
    },
    get "data-playing"() {
      return props.playing ? "" : undefined;
    },
    get "data-disabled"() {
      return props.disabled ? "" : undefined;
    },
    get tabindex() {
      return props.disabled ? -1 : 0;
    },
    onClick: (event: MouseEvent) => {
      props.onClick?.(event);

      if (event.defaultPrevented || props.disabled) return;
      const target = event.target;

      const interactive =
        target instanceof HTMLElement
          ? target.closest(
              "button, a, input, select, textarea, [contenteditable=true]"
            )
          : null;

      if (!interactive || interactive === event.currentTarget)
        props.onSelect?.();
    },
    onKeyDown: (event: KeyboardEvent) => {
      props.onKeyDown?.(event);

      if (
        event.defaultPrevented ||
        props.disabled ||
        event.target !== event.currentTarget
      )
        return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        props.onSelect?.();
      }
    },
    get children() {
      return props.children;
    },
  };

  forwardProps(renderProps, rest);

  return provideContext(TrackListItemContext, settings, () => {
    const customRender = untrack(() => props.render);

    if (customRender) {
      const rendered = createMemo(() => customRender(renderProps, settings));

      return <>{rendered()}</>;
    }

    return <li {...renderProps} />;
  });
};

interface SpanProps extends SpanDOMProps {
  className?: string;
}

interface DivProps extends DivDOMProps {
  className?: string;
}

interface ImageProps extends ImageDOMProps {
  className?: string;
}

export const TrackListItemIndex = (props: SpanProps) => {
  const settings = useContext(TrackListItemContext);
  const rest = omitProps(props, ["class", "className", "children"]);

  return (
    <span
      class={cn(
        "text-muted-foreground group-data-active/track-list-item:text-primary flex w-5 shrink-0 items-center justify-center font-mono text-xs tabular-nums",
        props.class,
        props.className
      )}
      data-slot="track-list-item-index"
      {...rest}
    >
      <Show when={settings.playing} fallback={props.children}>
        <span aria-label="Playing" role="img" class="flex h-3 items-end gap-px">
          <span class="h-3 w-0.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
          <span class="h-2 w-0.5 animate-pulse rounded-full bg-current [animation-delay:200ms] motion-reduce:animate-none" />
          <span class="h-2.5 w-0.5 animate-pulse rounded-full bg-current [animation-delay:400ms] motion-reduce:animate-none" />
        </span>
      </Show>
    </span>
  );
};

export const TrackListItemArtwork = (props: ImageProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <img
      alt=""
      class={cn(
        "bg-muted size-9 shrink-0 rounded-md object-cover",
        props.class,
        props.className
      )}
      data-slot="track-list-item-artwork"
      {...rest}
    />
  );
};

export const TrackListItemContent = (props: DivProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <div
      class={cn("flex min-w-0 flex-1 flex-col", props.class, props.className)}
      data-slot="track-list-item-content"
      {...rest}
    />
  );
};

export const TrackListItemTitle = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn(
        "group-data-active/track-list-item:text-primary truncate font-medium",
        props.class,
        props.className
      )}
      data-slot="track-list-item-title"
      {...rest}
    />
  );
};

export const TrackListItemDescription = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn(
        "text-muted-foreground truncate text-xs",
        props.class,
        props.className
      )}
      data-slot="track-list-item-description"
      {...rest}
    />
  );
};

export const TrackListItemDuration = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn(
        "text-muted-foreground shrink-0 font-mono text-xs tabular-nums",
        props.class,
        props.className
      )}
      data-slot="track-list-item-duration"
      {...rest}
    />
  );
};

export const TrackListItemActions = (props: DivProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <div
      class={cn(
        "flex shrink-0 items-center gap-1",
        props.class,
        props.className
      )}
      data-slot="track-list-item-actions"
      {...rest}
    />
  );
};
