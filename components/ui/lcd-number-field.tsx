import {
  Show,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  useContext,
} from "solid-js";
import type { Accessor } from "solid-js";

import { useLcdDisplayRowLabelId } from "@/components/ui/lcd-display";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  ButtonDOMProps,
  DivDOMProps,
  InputDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { setRefValue } from "@/lib/solid/ref";
import type { RefTarget } from "@/lib/solid/ref";
import { cn } from "@/lib/utils";

const REPEAT_DELAY_MS = 400;

const REPEAT_INTERVAL_MS = 60;

const DEFAULT_PIXEL_SENSITIVITY = 2;

/** The reasons a value changes; `reset` comes from `LcdNumberFieldReset`. */
export type LcdNumberFieldChangeReason =
  | "input-change"
  | "input-clear"
  | "input-blur"
  | "keyboard"
  | "increment-press"
  | "decrement-press"
  | "wheel"
  | "scrub"
  | "reset";

export interface LcdNumberFieldChangeDetails {
  event?: Event;
  reason: LcdNumberFieldChangeReason;
}

interface Draft {
  text: string;
  /** The value the edit asked for; Solid 2 settles controlled writes later. */
  requested: number | null;
  /** The value before the edit, which the parent may keep if it rejects it. */
  previous: number | null;
}

interface Modifiers {
  altKey: boolean;
  shiftKey: boolean;
}

interface LcdNumberFieldContextValue {
  disabled: Accessor<boolean>;
  readOnly: Accessor<boolean>;
  scrubbing: Accessor<boolean>;
  /** Whether the value differs from `resetValue`. */
  modified: Accessor<boolean>;
  canIncrement: Accessor<boolean>;
  canDecrement: Accessor<boolean>;
  allowWheelScrub: Accessor<boolean>;
  /** The unit's id while one is rendered, so the input can point at it. */
  unitId: Accessor<string | undefined>;
  setUnitId: (id: string | undefined) => void;
  text: Accessor<string>;
  edit: (text: string, event: Event) => void;
  finishEdit: (event: Event, reason: LcdNumberFieldChangeReason) => void;
  step: (
    direction: 1 | -1,
    modifiers: Modifiers,
    reason: LcdNumberFieldChangeReason,
    event: Event
  ) => number | undefined;
  jump: (edge: "min" | "max", event: Event) => void;
  /** `next` carries a value written in this same event, which Solid 2 has not applied yet. */
  commit: (
    reason: LcdNumberFieldChangeReason,
    event?: Event,
    next?: number | null
  ) => void;
  beginScrub: () => {
    move: (distance: number, modifiers: Modifiers, event: Event) => void;
    end: (event: Event) => void;
  };
  reset: (event?: Event) => void;
}

const LcdNumberFieldContext = createContext<LcdNumberFieldContextValue | null>(
  null
);

const useLcdNumberField = (part: string) => {
  const context = useContext(LcdNumberFieldContext);

  if (!context) {
    throw new Error(`${part} must be used inside LcdNumberField.`);
  }

  return context;
};

/** Runs a consumer's handler, which Solid 1 may bind to data as `[handler, data]`. */
/** A handler prop; Solid 1 may bind it to data as `[handler, data]`. */
interface BoundHandler {
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- the data is whatever the consumer bound.
  readonly 0: (data: unknown, event: never) => void;
  readonly 1: unknown;
}

type EventProp = ((event: never) => void) | BoundHandler | undefined;

const callHandler = (handler: EventProp, event: Event) => {
  if (!handler) return;

  // SAFETY: the handler belongs to the element this event came from.
  const forward = event as never;

  if ("call" in handler) handler(forward);
  else handler[0](handler[1], forward);
};

const places = (value: number) =>
  (value.toFixed(10).replace(/0+$/, "").split(".")[1] ?? "").length;

/** A 5 × 3 pixel chevron, pointing up or down. */
const PixelChevron = (props: { direction: "up" | "down" }) => (
  <svg
    aria-hidden="true"
    class={cn(
      "h-1.5 w-2.5 shrink-0 [shape-rendering:crispEdges]",
      props.direction === "up" && "rotate-180"
    )}
    fill="currentColor"
    viewBox="0 0 5 3"
  >
    <path d="M0 0h1v1H0zM4 0h1v1H4zM1 1h1v1H1zM3 1h1v1H3zM2 2h1v1H2z" />
  </svg>
);

const partState = (context: LcdNumberFieldContextValue) => ({
  "data-disabled": context.disabled() ? "" : undefined,
  "data-readonly": context.readOnly() ? "" : undefined,
  "data-scrubbing": context.scrubbing() ? "" : undefined,
});

export interface LcdNumberFieldScrubAreaProps extends Omit<
  DivDOMProps,
  "class"
> {
  class?: string;
  className?: string;
  /** The drag axis. Default `horizontal`. */
  direction?: "horizontal" | "vertical";
  /** Pixels the pointer moves per step. Default 2. */
  pixelSensitivity?: number;
}

/**
 * Drag inside it to change the value; Shift for large steps, Alt for small
 * ones. Wrap the row's label in it, like a hardware encoder's legend.
 */
export const LcdNumberFieldScrubArea = (
  props: LcdNumberFieldScrubAreaProps
) => {
  const context = useLcdNumberField("LcdNumberFieldScrubArea");
  const vertical = () => props.direction === "vertical";
  let scrub: ReturnType<LcdNumberFieldContextValue["beginScrub"]> | null = null;
  let last = 0;
  let carried = 0;

  const stop = (event: Event) => {
    scrub?.end(event);
    scrub = null;
  };

  onCleanup(() => scrub?.end(new Event("cleanup")));

  createCompatEffect(
    () => context.disabled() || context.readOnly(),
    (locked) => {
      if (locked) stop(new Event("locked"));
    }
  );

  return (
    <div
      {...omitProps(props, [
        "class",
        "className",
        "direction",
        "onPointerCancel",
        "onPointerDown",
        "onPointerMove",
        "onPointerUp",
        "pixelSensitivity",
      ])}
      class={cn(
        "inline-flex touch-none items-center select-none data-disabled:cursor-default",
        vertical() ? "cursor-ns-resize" : "cursor-ew-resize",
        props.class,
        props.className
      )}
      data-direction={vertical() ? "vertical" : "horizontal"}
      data-slot="lcd-number-field-scrub-area"
      {...partState(context)}
      onPointerCancel={(event) => {
        callHandler(props.onPointerCancel, event);
        stop(event);
      }}
      onPointerDown={(event) => {
        callHandler(props.onPointerDown, event);

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          context.disabled() ||
          context.readOnly()
        )
          return;

        event.currentTarget.setPointerCapture(event.pointerId);
        scrub = context.beginScrub();
        last = vertical() ? event.clientY : event.clientX;
        carried = 0;
      }}
      onPointerMove={(event) => {
        callHandler(props.onPointerMove, event);

        if (!scrub) return;
        const position = vertical() ? event.clientY : event.clientX;

        if (event.defaultPrevented) {
          last = position;

          return;
        }

        // Up and right raise the value.
        carried += vertical() ? last - position : position - last;
        last = position;

        const sensitivity = Math.max(
          1,
          props.pixelSensitivity ?? DEFAULT_PIXEL_SENSITIVITY
        );

        const steps = Math.trunc(carried / sensitivity);

        if (steps === 0) return;
        carried -= steps * sensitivity;
        scrub.move(steps, event, event);
      }}
      onPointerUp={(event) => {
        callHandler(props.onPointerUp, event);
        stop(event);
      }}
    >
      {props.children}
    </div>
  );
};

/** The value, its unit and its steppers, on one line. */
export const LcdNumberFieldGroup = (
  props: DivDOMProps & { className?: string }
) => {
  const context = useLcdNumberField("LcdNumberFieldGroup");

  return (
    <div
      {...omitProps(props, ["class", "className"])}
      class={cn("inline-flex items-center gap-2", props.class, props.className)}
      data-slot="lcd-number-field-group"
      role="group"
      {...partState(context)}
    />
  );
};

export type LcdNumberFieldInputProps = Omit<InputDOMProps, "class"> & {
  class?: string;
  className?: string;
};

/**
 * The number in lit ink. Selecting text inverts it, like an LCD cursor. Named
 * by the row's label and described by the unit.
 */
export const LcdNumberFieldInput = (props: LcdNumberFieldInputProps) => {
  const context = useLcdNumberField("LcdNumberFieldInput");
  const rowLabelId = useLcdDisplayRowLabelId();

  const describedBy = () =>
    [props["aria-describedby"], context.unitId()].filter(Boolean).join(" ") ||
    undefined;

  const interactive = () => !context.disabled() && !context.readOnly();

  return (
    <input
      autocomplete="off"
      inputmode="decimal"
      type="text"
      {...omitProps(props, [
        "aria-describedby",
        "aria-labelledby",
        "class",
        "className",
        "onBlur",
        "onInput",
        "onKeyDown",
        "onKeyUp",
        "onWheel",
        "value",
      ])}
      aria-describedby={describedBy()}
      aria-labelledby={props["aria-labelledby"] ?? rowLabelId?.()}
      aria-roledescription="Number field"
      class={cn(
        "-mx-1 field-sizing-content max-w-[12ch] min-w-[3ch] rounded-sm bg-transparent px-1 py-0.5 text-end text-(--lcd-display-lit) uppercase tabular-nums caret-(--lcd-display-lit) outline-none selection:bg-(--lcd-display-lit) selection:text-(--lcd-display-glass) focus-visible:ring-1 focus-visible:ring-(--lcd-display-lit) disabled:text-(--lcd-display-ink-dim) data-invalid:text-(--lcd-display-ink-dim)",
        props.class,
        props.className
      )}
      data-slot="lcd-number-field-input"
      {...partState(context)}
      disabled={context.disabled()}
      onBlur={(event) => {
        callHandler(props.onBlur, event);

        if (!event.defaultPrevented && interactive())
          context.finishEdit(event, "input-blur");
      }}
      onInput={(event) => {
        callHandler(props.onInput, event);

        if (!event.defaultPrevented && interactive())
          context.edit(event.currentTarget.value, event);
      }}
      onKeyDown={(event) => {
        callHandler(props.onKeyDown, event);

        if (event.defaultPrevented || !interactive()) return;

        if (event.key === "Enter") {
          context.finishEdit(event, "keyboard");
        } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          event.preventDefault();
          context.step(
            event.key === "ArrowUp" ? 1 : -1,
            event,
            "keyboard",
            event
          );
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          context.jump(event.key === "Home" ? "min" : "max", event);
        }
      }}
      onKeyUp={(event) => {
        callHandler(props.onKeyUp, event);

        if (
          !event.defaultPrevented &&
          interactive() &&
          ["ArrowDown", "ArrowUp", "End", "Home"].includes(event.key)
        )
          context.commit("keyboard", event);
      }}
      onWheel={(event) => {
        callHandler(props.onWheel, event);

        if (
          event.defaultPrevented ||
          event.ctrlKey ||
          event.deltaY === 0 ||
          !context.allowWheelScrub() ||
          !interactive() ||
          document.activeElement !== event.currentTarget
        )
          return;

        event.preventDefault();

        const next = context.step(
          event.deltaY < 0 ? 1 : -1,
          event,
          "wheel",
          event
        );

        if (next !== undefined) context.commit("wheel", event, next);
      }}
      readonly={context.readOnly()}
      value={context.text()}
    />
  );
};

/** The unit after the number, in dim ink. Screen readers hear it with the value. */
export const LcdNumberFieldUnit = (
  props: SpanDOMProps & { className?: string }
) => {
  const context = useLcdNumberField("LcdNumberFieldUnit");
  const generatedId = createUniqueId();
  const id = () => props.id || generatedId;

  createCompatEffect(id, (unitId) => {
    context.setUnitId(unitId);

    return () => context.setUnitId(undefined);
  });

  return (
    <span
      {...omitProps(props, ["class", "className", "id"])}
      class={cn("text-(--lcd-display-ink-dim)", props.class, props.className)}
      data-slot="lcd-number-field-unit"
      id={id()}
    />
  );
};

export type LcdNumberFieldResetProps = Omit<ButtonDOMProps, "class"> & {
  class?: string;
  className?: string;
};

/**
 * Returns the value to `resetValue`, like the Parameter Slider's and the
 * Fader's reset. It is disabled and hidden while there is nothing to reset.
 */
export const LcdNumberFieldReset = (props: LcdNumberFieldResetProps) => {
  const context = useLcdNumberField("LcdNumberFieldReset");

  return (
    <button
      aria-label="Reset"
      type="button"
      {...omitProps(props, ["children", "class", "className", "onClick"])}
      class={cn(
        "-my-0.5 cursor-pointer rounded-sm px-1 py-0.5 text-[0.75em] text-(--lcd-display-ink-dim) uppercase outline-none hover:text-(--lcd-display-lit) focus-visible:ring-1 focus-visible:ring-(--lcd-display-lit) disabled:pointer-events-none disabled:opacity-0",
        props.class,
        props.className
      )}
      data-modified={context.modified() ? "" : undefined}
      data-slot="lcd-number-field-reset"
      disabled={
        context.disabled() ||
        context.readOnly() ||
        !context.modified() ||
        props.disabled
      }
      onClick={(event) => {
        callHandler(props.onClick, event);

        if (!event.defaultPrevented) context.reset(event);
      }}
    >
      {props.children ?? "Reset"}
    </button>
  );
};

const STEPPER_BUTTON =
  "flex cursor-pointer items-center justify-center rounded-[1px] px-0.5 py-px text-(--lcd-display-ink-dim) outline-none hover:text-(--lcd-display-lit) active:text-(--lcd-display-lit) disabled:cursor-default disabled:opacity-40 disabled:hover:text-(--lcd-display-ink-dim)";

type LcdNumberFieldStepButtonProps = Omit<ButtonDOMProps, "class"> & {
  class?: string;
  className?: string;
};

const StepButton = (
  props: LcdNumberFieldStepButtonProps & { direction: 1 | -1 }
) => {
  const context = useLcdNumberField("LcdNumberFieldStepButton");
  const increment = () => props.direction === 1;
  const reason = () => (increment() ? "increment-press" : "decrement-press");
  let delay: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let pressed = false;

  const stop = (event?: Event) => {
    clearTimeout(delay);
    clearInterval(interval);

    if (!pressed) return;
    pressed = false;
    context.commit(reason(), event);
  };

  onCleanup(() => {
    clearTimeout(delay);
    clearInterval(interval);
  });

  createCompatEffect(
    () => context.disabled() || context.readOnly(),
    (locked) => {
      if (locked) stop();
    }
  );

  const disabled = () =>
    context.disabled() ||
    context.readOnly() ||
    props.disabled ||
    !(increment() ? context.canIncrement() : context.canDecrement());

  return (
    <button
      aria-label={increment() ? "Increase" : "Decrease"}
      tabindex={-1}
      type="button"
      {...omitProps(props, [
        "children",
        "class",
        "className",
        "direction",
        "onClick",
        "onMouseDown",
        "onPointerCancel",
        "onPointerDown",
        "onPointerUp",
      ])}
      class={cn(STEPPER_BUTTON, props.class, props.className)}
      {...partState(context)}
      disabled={disabled()}
      onClick={(event) => {
        callHandler(props.onClick, event);

        // A keyboard or assistive click has no pointer press before it.
        if (!event.defaultPrevented && event.detail === 0) {
          const next = context.step(props.direction, event, reason(), event);

          if (next !== undefined) context.commit(reason(), event, next);
        }
      }}
      onMouseDown={(event) => {
        callHandler(props.onMouseDown, event);

        // The field keeps focus, so the typed text survives a press.
        if (!event.defaultPrevented) event.preventDefault();
      }}
      onPointerCancel={(event) => {
        callHandler(props.onPointerCancel, event);
        stop(event);
      }}
      onPointerDown={(event) => {
        callHandler(props.onPointerDown, event);

        if (event.defaultPrevented || event.button !== 0 || disabled()) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        pressed = true;
        context.step(props.direction, event, reason(), event);
        delay = setTimeout(() => {
          interval = setInterval(() => {
            if (
              context.step(props.direction, event, reason(), event) ===
              undefined
            )
              stop();
          }, REPEAT_INTERVAL_MS);
        }, REPEAT_DELAY_MS);
      }}
      onPointerUp={(event) => {
        callHandler(props.onPointerUp, event);
        stop(event);
      }}
    >
      {props.children ?? (
        <PixelChevron direction={increment() ? "up" : "down"} />
      )}
    </button>
  );
};

/** Steps the value up. Hold to repeat. */
export const LcdNumberFieldIncrement = (
  props: LcdNumberFieldStepButtonProps
) => (
  <StepButton {...props} data-slot="lcd-number-field-increment" direction={1} />
);

/** Steps the value down. Hold to repeat. */
export const LcdNumberFieldDecrement = (
  props: LcdNumberFieldStepButtonProps
) => (
  <StepButton
    {...props}
    data-slot="lcd-number-field-decrement"
    direction={-1}
  />
);

/** The increment over the decrement, as a stacked pair of pixel chevrons. */
export const LcdNumberFieldStepper = (
  props: SpanDOMProps & { className?: string }
) => (
  <span
    {...omitProps(props, ["children", "class", "className"])}
    class={cn("inline-flex flex-col gap-0.5", props.class, props.className)}
    data-slot="lcd-number-field-stepper"
  >
    {props.children ?? (
      <>
        <LcdNumberFieldIncrement />
        <LcdNumberFieldDecrement />
      </>
    )}
  </span>
);

export interface LcdNumberFieldProps extends Omit<
  DivDOMProps,
  "children" | "class" | "onChange" | "ref"
> {
  class?: string;
  className?: string;
  children?: DivDOMProps["children"];
  ref?: RefTarget<HTMLDivElement>;
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (
    value: number | null,
    details: LcdNumberFieldChangeDetails
  ) => void;
  onValueCommitted?: (
    value: number | null,
    details: LcdNumberFieldChangeDetails
  ) => void;
  /** The value `LcdNumberFieldReset` returns to. Default `defaultValue ?? min`. */
  resetValue?: number;
  min?: number;
  max?: number;
  /** The Up and Down arrow step. Default 1. */
  step?: number;
  /** The step with Alt held. Default 0.1. */
  smallStep?: number;
  /** The step with Shift held. Default 10. */
  largeStep?: number;
  /** `Intl.NumberFormat` options for the shown value. */
  format?: Intl.NumberFormatOptions;
  locale?: Intl.LocalesArgument;
  disabled?: boolean;
  readOnly?: boolean;
  /** Submits the value in a hidden input under this name. */
  name?: string;
  /** Change the value with the wheel while the field is focused. Default true. */
  allowWheelScrub?: boolean;
}

const LCD_NUMBER_FIELD_OWN = [
  "allowWheelScrub",
  "children",
  "class",
  "className",
  "defaultValue",
  "disabled",
  "format",
  "largeStep",
  "locale",
  "max",
  "min",
  "name",
  "onValueChange",
  "onValueCommitted",
  "readOnly",
  "ref",
  "resetValue",
  "smallStep",
  "step",
  "value",
] as const;

/**
 * An editable number on the LCD Display: type it, step it with the arrow
 * keys, the wheel or the pixel steppers, or drag the scrub area. Its root lays
 * out no box of its own (`display: contents`), so its parts sit in the row
 * beside the label. With no children it renders the input and the steppers.
 */
export const LcdNumberField = (props: LcdNumberFieldProps) => {
  const [ownValue, setOwnValue] = createSignal<number | null>(
    props.defaultValue ?? null
  );

  const [draft, setDraft] = createSignal<Draft | null>(null);
  const [unitId, setUnitId] = createSignal<string>();
  const [scrubbing, setScrubbing] = createSignal(false);

  const controlled = () => props.value !== undefined;
  const value = () => (controlled() ? (props.value ?? null) : ownValue());
  const disabled = () => props.disabled ?? false;
  const readOnly = () => props.readOnly ?? false;
  const min = () => props.min ?? Number.NEGATIVE_INFINITY;
  const max = () => props.max ?? Number.POSITIVE_INFINITY;

  const target = () =>
    props.resetValue ?? props.defaultValue ?? props.min ?? null;

  const formatter = createMemo(
    () => new Intl.NumberFormat(props.locale, props.format)
  );

  const separators = createMemo(() => {
    const parts = new Intl.NumberFormat(props.locale).formatToParts(-11_111.1);
    const find = (type: string) => parts.find((part) => part.type === type);

    return {
      decimal: find("decimal")?.value ?? ".",
      group: find("group")?.value ?? ",",
    };
  });

  /** A number, null for empty text, undefined for text that is not a number. */
  const parse = (text: string): number | null | undefined => {
    const trimmed = text.trim();

    if (trimmed === "") return null;
    const { decimal, group } = separators();

    let normalized = trimmed
      .replaceAll("\u2212", "-")
      .replace(/[\s\u00a0\u202f]/g, "");

    // Accept a dot as the decimal point when the locale's own is another mark.
    if (decimal !== "." && group !== "." && !normalized.includes(decimal))
      normalized = normalized.replaceAll(".", decimal);
    normalized = normalized.replaceAll(group, "").replaceAll(decimal, ".");

    return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(normalized)
      ? Number(normalized)
      : undefined;
  };

  const clampValue = (next: number) => Math.min(max(), Math.max(min(), next));

  const liveDraft = () => {
    const current = draft();

    return current &&
      (current.requested === value() || current.previous === value())
      ? current
      : null;
  };

  const text = () => {
    const current = liveDraft();

    if (current) return current.text;
    const shown = value();

    return shown === null ? "" : formatter().format(shown);
  };

  createCompatEffect(value, () => {
    if (draft() && !liveDraft()) setDraft(null);
  });

  const change = (
    next: number | null,
    reason: LcdNumberFieldChangeReason,
    event?: Event
  ) => {
    if (!controlled()) setOwnValue(next);
    props.onValueChange?.(next, { event, reason });
  };

  const locked = () => disabled() || readOnly();

  const commit: LcdNumberFieldContextValue["commit"] = (
    reason,
    event,
    next = value()
  ) => props.onValueCommitted?.(next, { event, reason });

  const stepped = (from: number | null, direction: 1 | -1, amount: number) => {
    const base = from ?? 0;
    const digits = Math.max(places(base), places(amount));

    return clampValue(Number((base + direction * amount).toFixed(digits)));
  };

  const amountFor = (modifiers: Modifiers) =>
    modifiers.shiftKey
      ? (props.largeStep ?? 10)
      : modifiers.altKey
        ? (props.smallStep ?? 0.1)
        : (props.step ?? 1);

  const step: LcdNumberFieldContextValue["step"] = (
    direction,
    modifiers,
    reason,
    event
  ) => {
    if (locked()) return undefined;
    const next = stepped(value(), direction, amountFor(modifiers));

    setDraft(null);

    if (next === value()) return undefined;
    change(next, reason, event);

    return next;
  };

  const context: LcdNumberFieldContextValue = {
    allowWheelScrub: () => props.allowWheelScrub ?? true,
    beginScrub: () => {
      setScrubbing(true);
      let current = value();

      return {
        end: (event) => {
          setScrubbing(false);
          commit("scrub", event);
        },
        move: (distance, modifiers, event) => {
          if (locked()) return;
          current = stepped(
            current,
            distance > 0 ? 1 : -1,
            amountFor(modifiers) * Math.abs(distance)
          );
          setDraft(null);
          change(current, "scrub", event);
        },
      };
    },
    canDecrement: () => (value() ?? 0) > min(),
    canIncrement: () => (value() ?? 0) < max(),
    commit,
    disabled,
    edit: (inputText, event) => {
      if (locked()) return;
      const parsed = parse(inputText);
      const previous = value();

      if (parsed === undefined) {
        setDraft({ previous, requested: previous, text: inputText });

        return;
      }

      setDraft({ previous, requested: parsed, text: inputText });

      if (parsed !== previous)
        change(parsed, parsed === null ? "input-clear" : "input-change", event);
    },
    finishEdit: (event, reason) => {
      if (locked()) return;
      const current = liveDraft();

      setDraft(null);

      if (!current) return;
      const parsed = parse(current.text);

      if (parsed === undefined) return;
      const next = parsed === null ? null : clampValue(parsed);

      if (next !== current.requested) change(next, reason, event);
      props.onValueCommitted?.(next, { event, reason });
    },
    jump: (edge, event) => {
      if (locked()) return;
      const next = edge === "min" ? props.min : props.max;

      setDraft(null);

      if (next !== undefined && next !== value())
        change(next, "keyboard", event);
    },
    modified: () => value() !== target(),
    readOnly,
    reset: (event) => {
      if (locked()) return;
      const next = target();

      setDraft(null);
      change(next, "reset", event);
      props.onValueCommitted?.(next, { event, reason: "reset" });
    },
    scrubbing,
    setUnitId,
    step,
    text,
    unitId,
  };

  return provideContext(LcdNumberFieldContext, context, () => (
    <div
      {...omitProps(props, LCD_NUMBER_FIELD_OWN)}
      class={cn("contents", props.class, props.className)}
      data-slot="lcd-number-field"
      {...partState(context)}
      ref={(node: HTMLDivElement) => setRefValue(props.ref, node)}
    >
      {props.children ?? (
        <LcdNumberFieldGroup>
          <LcdNumberFieldInput />
          <LcdNumberFieldStepper />
        </LcdNumberFieldGroup>
      )}
      <Show when={props.name}>
        {(name) => <input name={name()} type="hidden" value={value() ?? ""} />}
      </Show>
    </div>
  ));
};
