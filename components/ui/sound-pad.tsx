import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import {
  Show,
  createContext,
  createSignal,
  onCleanup,
  useContext,
} from "solid-js";

import { Kbd } from "@/components/ui/kbd";
import { useFrameSource } from "@/hooks/use-frame-source";
import { clamp } from "@/lib/audio/decibels";
import type { FrameSource } from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  KbdDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { mergeStyleVars } from "@/lib/solid/style";
import type { StyleValue } from "@/lib/solid/style";
import { cn } from "@/lib/utils";

export type SoundPadMode = "one-shot" | "toggle" | "hold" | "loop";

interface PadHandlers {
  press: () => void;
  release: () => void;
}

interface GridContextValue {
  readonly hotkeys: boolean;
  register: (hotkey: string, handlers: PadHandlers) => () => void;
}

const GridContext = createContext<GridContextValue | null>(null);

const PadContext = createContext<{ hotkey?: string; playing: boolean }>({
  playing: false,
});

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

const moveFocus = (event: KeyboardEvent) => {
  const root = event.currentTarget;

  if (!(root instanceof HTMLElement)) return;

  const pads = [
    ...root.querySelectorAll<HTMLButtonElement>(
      "[data-sound-pad]:not(:disabled)"
    ),
  ];

  const index = pads.findIndex((pad) => pad === event.target);

  if (index < 0) return;

  const perRow = Math.max(
    1,
    pads.filter((pad) => pad.offsetTop === pads[0]?.offsetTop).length
  );

  const moves = {
    ArrowDown: perRow,
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -perRow,
  };

  if (!Object.hasOwn(moves, event.key)) return;
  // SAFETY: The own-property check proves this is a grid navigation key.
  const offset = moves[event.key as keyof typeof moves];
  const next = pads[clamp(index + offset, 0, pads.length - 1)];

  if (next) {
    event.preventDefault();
    next.focus();
  }
};

export interface SoundPadGridProps extends Omit<
  DivDOMProps,
  "style" | "onKeyDown" | "onKeyUp"
> {
  className?: string;
  style?: StyleValue;
  columns?: number;
  hotkeys?: boolean;
  hotkeyScope?: "focus" | "global";
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
}

export const SoundPadGrid = (props: SoundPadGridProps) => {
  const pads = new Map<string, PadHandlers>();
  const held = new Set<string>();

  const releaseHeld = () => {
    for (const key of held) pads.get(key)?.release();
    held.clear();
  };

  const register = (key: string, handlers: PadHandlers) => {
    const normalized = key.toLowerCase();
    pads.set(normalized, handlers);

    return () => {
      if (pads.get(normalized) !== handlers) return;
      pads.delete(normalized);

      if (held.delete(normalized)) handlers.release();
    };
  };

  const down = (event: KeyboardEvent) => {
    if (
      !props.hotkeys ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isTyping(event.target)
    )
      return false;
    const key = event.key.toLowerCase();
    const pad = pads.get(key);

    if (!pad || held.has(key)) return false;
    held.add(key);
    pad.press();

    return true;
  };

  const up = (key: string) => {
    const normalized = key.toLowerCase();

    if (!held.delete(normalized)) return;
    pads.get(normalized)?.release();
  };

  createCompatEffect(
    () => ({ hotkeys: props.hotkeys, scope: props.hotkeyScope ?? "focus" }),
    ({ hotkeys, scope }) => {
      const keyDown = (event: KeyboardEvent) => {
        if (down(event)) event.preventDefault();
      };

      const keyUp = (event: KeyboardEvent) => up(event.key);

      if (hotkeys && scope === "global")
        document.addEventListener("keydown", keyDown);
      // A focus-scoped key can release outside the grid after focus moves.
      document.addEventListener("keyup", keyUp);
      window.addEventListener("blur", releaseHeld);

      return () => {
        document.removeEventListener("keydown", keyDown);
        document.removeEventListener("keyup", keyUp);
        window.removeEventListener("blur", releaseHeld);
        releaseHeld();
      };
    }
  );

  const settings: GridContextValue = {
    get hotkeys() {
      return props.hotkeys ?? false;
    },
    register,
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "children",
    "columns",
    "hotkeys",
    "hotkeyScope",
    "onKeyDown",
    "onKeyUp",
  ]);

  return provideContext(GridContext, settings, () => (
    <div
      class={cn(
        "grid grid-cols-(--pad-columns) gap-(--pad-gap) [--pad-gap:0.5rem]",
        props.class,
        props.className
      )}
      data-slot="sound-pad-grid"
      role="group"
      style={mergeStyleVars(props.style, {
        "--pad-columns": `repeat(auto-fill, minmax(max(var(--pad-min-width, 5.5rem), calc((100% - ${(props.columns ?? 4) - 1} * var(--pad-gap)) / ${props.columns ?? 4})), 1fr))`,
      })}
      onKeyDown={(event: KeyboardEvent) => {
        props.onKeyDown?.(event);

        if (event.defaultPrevented) return;

        if ((props.hotkeyScope ?? "focus") === "focus" && down(event)) {
          event.preventDefault();

          return;
        }

        moveFocus(event);
      }}
      onKeyUp={(event: KeyboardEvent) => {
        props.onKeyUp?.(event);
        up(event.key);
      }}
      {...rest}
    >
      {props.children}
    </div>
  ));
};

export const soundPadVariants = cva(
  "group/sound-pad focus-visible:ring-ring/40 relative flex flex-col items-start justify-between gap-2 overflow-hidden rounded-xl p-3 text-left transition-[background-color,box-shadow,transform] outline-none select-none [--pad-accent:var(--primary)] focus-visible:ring-3 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 data-loading:opacity-60 data-playing:ring-2 data-playing:ring-(--pad-accent)",
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      size: { default: "min-h-24", lg: "min-h-32 p-4", sm: "min-h-16 p-2" },
      variant: {
        default:
          "bg-[color-mix(in_oklch,var(--pad-accent)_14%,var(--muted))] hover:bg-[color-mix(in_oklch,var(--pad-accent)_22%,var(--muted))]",
        ghost: "hover:bg-muted",
        outline: "hover:bg-muted border bg-transparent",
      },
    },
  }
);

export interface SoundPadProps
  extends
    Omit<
      ButtonDOMProps,
      | "onToggle"
      | "onClick"
      | "onKeyDown"
      | "onKeyUp"
      | "onPointerDown"
      | "onPointerUp"
      | "onPointerLeave"
      | "style"
      | "disabled"
    >,
    VariantProps<typeof soundPadVariants> {
  className?: string;
  style?: StyleValue;
  disabled?: boolean;
  onTrigger?: () => void;
  onStop?: () => void;
  playing?: boolean;
  mode?: SoundPadMode;
  hotkey?: string;
  loading?: boolean;
  accent?: string;
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  onKeyUp?: (event: KeyboardEvent) => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerLeave?: (event: PointerEvent) => void;
}

export const SoundPad = (props: SoundPadProps) => {
  const grid = useContext(GridContext);
  const [pressed, setPressed] = createSignal(false);
  const inactive = () => props.disabled || props.loading;
  let held = false;

  const press = () => {
    if (inactive() || held) return;
    held = true;
    setPressed(true);

    if ((props.mode === "toggle" || props.mode === "loop") && props.playing)
      props.onStop?.();
    else props.onTrigger?.();
  };

  const release = () => {
    if (!held) return;
    held = false;
    setPressed(false);

    if (props.mode === "hold") props.onStop?.();
  };

  createCompatEffect(
    () => ({ hotkey: props.hotkey, inactive: inactive() }),
    ({ hotkey, inactive: disabled }) => {
      if (!(grid && hotkey) || disabled) return;

      return grid.register(hotkey, { press, release });
    }
  );
  createCompatEffect(inactive, (disabled) => {
    if (disabled) release();
  });
  createCompatEffect(
    () => true,
    () => {
      window.addEventListener("blur", release);

      return () => {
        window.removeEventListener("blur", release);
        release();
      };
    }
  );
  onCleanup(release);

  const settings = {
    get hotkey() {
      return props.hotkey;
    },
    get playing() {
      return props.playing ?? false;
    },
  };

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "children",
    "disabled",
    "onTrigger",
    "onStop",
    "playing",
    "mode",
    "hotkey",
    "loading",
    "accent",
    "variant",
    "size",
    "onClick",
    "onKeyDown",
    "onKeyUp",
    "onPointerDown",
    "onPointerUp",
    "onPointerLeave",
  ]);

  return provideContext(PadContext, settings, () => (
    <button
      aria-keyshortcuts={props.hotkey}
      aria-pressed={
        props.mode === "toggle" || props.mode === "loop"
          ? props.playing
            ? "true"
            : "false"
          : undefined
      }
      class={cn(
        soundPadVariants({ size: props.size, variant: props.variant }),
        props.class,
        props.className
      )}
      data-slot="sound-pad"
      data-sound-pad=""
      data-mode={props.mode ?? "one-shot"}
      data-pressed={pressed() ? "" : undefined}
      data-playing={props.playing ? "" : undefined}
      data-loading={props.loading ? "" : undefined}
      disabled={inactive()}
      style={mergeStyleVars(props.style, { "--pad-accent": props.accent })}
      type="button"
      onClick={(event: MouseEvent) => {
        props.onClick?.(event);

        if (
          !event.defaultPrevented &&
          props.mode !== "hold" &&
          event.detail === 0
        ) {
          press();
          release();
        }
      }}
      onKeyDown={(event: KeyboardEvent) => {
        props.onKeyDown?.(event);

        if (
          !event.defaultPrevented &&
          props.mode === "hold" &&
          !event.repeat &&
          (event.key === " " || event.key === "Enter")
        ) {
          event.preventDefault();
          press();
        }
      }}
      onKeyUp={(event: KeyboardEvent) => {
        props.onKeyUp?.(event);

        if (event.key === " " || event.key === "Enter") release();
      }}
      onPointerDown={(event: PointerEvent) => {
        props.onPointerDown?.(event);

        if (!event.defaultPrevented && event.button === 0) press();
      }}
      onPointerUp={(event: PointerEvent) => {
        props.onPointerUp?.(event);
        release();
      }}
      onPointerLeave={(event: PointerEvent) => {
        props.onPointerLeave?.(event);
        release();
      }}
      onPointerCancel={release}
      onLostPointerCapture={release}
      {...rest}
    >
      {props.children}
    </button>
  ));
};

interface SpanProps extends SpanDOMProps {
  className?: string;
}

export const SoundPadIcon = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      aria-hidden="true"
      class={cn(
        "relative text-(--pad-accent) [&_svg:not([class*='size-'])]:size-5",
        props.class,
        props.className
      )}
      data-slot="sound-pad-icon"
      {...rest}
    />
  );
};

export const SoundPadLabel = (props: SpanProps) => {
  const rest = omitProps(props, ["class", "className"]);

  return (
    <span
      class={cn(
        "relative mt-auto line-clamp-2 text-sm font-medium group-has-data-[variant=ring]/sound-pad:pe-6",
        props.class,
        props.className
      )}
      data-slot="sound-pad-label"
      {...rest}
    />
  );
};

interface ShortcutProps extends KbdDOMProps {
  className?: string;
}

export const SoundPadShortcut = (props: ShortcutProps) => {
  const settings = useContext(PadContext);
  const rest = omitProps(props, ["class", "className", "children"]);

  return (
    <Show when={props.children || settings.hotkey}>
      <Kbd
        class={cn(
          "absolute top-2 right-2 uppercase",
          props.class,
          props.className
        )}
        data-slot="sound-pad-shortcut"
        {...rest}
      >
        {props.children ?? settings.hotkey}
      </Kbd>
    </Show>
  );
};

export interface SoundPadProgressProps extends Omit<
  DivDOMProps,
  "style" | "ref"
> {
  ref?: RefTarget<HTMLDivElement>;
  className?: string;
  style?: StyleValue;
  value?: number;
  source?: FrameSource<number> | null;
  variant?: "bar" | "fill" | "ring";
}

export const SoundPadProgress = (props: SoundPadProgressProps) => {
  const settings = useContext(PadContext);
  let element: HTMLDivElement | undefined;
  useFrameSource(
    () => props.source,
    (next) =>
      element?.style.setProperty("--pad-progress", clamp(next, 0, 1).toFixed(4))
  );
  createCompatEffect(
    () => ({ value: props.value, playing: settings.playing }),
    ({ value, playing }) => {
      if (value !== undefined || !playing)
        element?.style.setProperty(
          "--pad-progress",
          value === undefined ? "0" : clamp(value, 0, 1).toFixed(4)
        );
    }
  );

  const rest = omitProps(props, [
    "class",
    "className",
    "style",
    "value",
    "source",
    "variant",
    "ref",
  ]);

  return (
    <div
      aria-hidden="true"
      class={cn(
        "pointer-events-none absolute [--pad-progress:0]",
        props.variant === "ring"
          ? "right-2 bottom-2 size-5"
          : "inset-x-0 bottom-0",
        props.variant === "fill"
          ? "top-0"
          : props.variant === "ring"
            ? ""
            : "h-1",
        props.class,
        props.className
      )}
      data-slot="sound-pad-progress"
      data-variant={props.variant ?? "bar"}
      style={props.style}
      {...rest}
      ref={(node: HTMLDivElement) => {
        element = node;
        setRefValue(props.ref, node);
      }}
    >
      <Show
        when={props.variant === "ring"}
        fallback={
          <div
            class={cn(
              "size-full origin-left scale-x-(--pad-progress) bg-(--pad-accent)",
              props.variant === "fill" && "opacity-20"
            )}
          />
        }
      >
        <div class="size-full rounded-full bg-[conic-gradient(var(--pad-accent)_calc(var(--pad-progress)*360deg),color-mix(in_oklch,var(--pad-accent)_20%,transparent)_0)] [mask:radial-gradient(farthest-side,transparent_calc(100%-3px),black_calc(100%-3px))]" />
      </Show>
    </div>
  );
};
