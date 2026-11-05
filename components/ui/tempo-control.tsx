import { cva } from "class-variance-authority";
import { createContext, createSignal, useContext } from "solid-js";
import type { Component } from "solid-js";

import { useAudioConfig } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import { useTapTempo } from "@/hooks/use-tap-tempo";
import type { TempoChangeDetails } from "@/hooks/use-tap-tempo";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  InputDOMProps,
  ButtonDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

interface TempoContextValue {
  disabled: () => boolean;
  readOnly: () => boolean;
  resetTaps: () => void;
  tap: (event?: Event) => void;
  setValue: (next: number, details?: TempoChangeDetails) => void;
  min: () => number;
  max: () => number;
  value: () => number;
  name: () => string | undefined;
  largeStep: () => number;
  tapRevision: () => number;
  commit: (next: number) => void;
}

const TempoContext = createContext<TempoContextValue>();

const useTempo = () => {
  const context = useContext(TempoContext);

  if (!context)
    throw new Error("TempoControl part must be used inside TempoControl.");

  return context;
};

export const tempoControlVariants = cva(
  "group/tempo-control inline-flex items-center gap-2 data-disabled:opacity-50",
  {
    variants: {
      size: {
        default: "[--tempo-height:--spacing(8)]",
        lg: "[--tempo-height:--spacing(9)]",
        sm: "[--tempo-height:--spacing(7)]",
      },
    },
    defaultVariants: { size: "default" },
  }
);

export interface TempoControlProps extends Omit<DivDOMProps, "onChange"> {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number, details: TempoChangeDetails) => void;
  onValueCommitted?: (value: number) => void;
  min?: number;
  max?: number;
  largeStep?: number;
  tapTimeout?: number;
  size?: AudioSize;
  disabled?: boolean;
  readOnly?: boolean;
  name?: string;
}

export const TempoControlInput = (
  props: InputDOMProps & { className?: string }
) => {
  const context = useTempo();

  const rest = omitProps(props, [
    "class",
    "className",
    "onInput",
    "onChange",
    "onBlur",
    "onKeyDown",
    "value",
    "name",
  ]);

  const [draft, setDraft] = createSignal<{
    text: string;
    value: number;
    revision: number;
  } | null>(null);

  createCompatEffect(
    () => [context.value(), context.tapRevision()] as const,
    ([value, revision]) => {
      const current = draft();

      if (
        current &&
        (current.value !== value || current.revision !== revision)
      ) {
        setDraft(null);
      }
    }
  );

  const displayValue = () => {
    const current = draft();

    return current &&
      current.value === context.value() &&
      current.revision === context.tapRevision()
      ? current.text
      : String(context.value());
  };

  const edit = (event: Event & { currentTarget: HTMLInputElement }) => {
    if (event.defaultPrevented || context.disabled() || context.readOnly())
      return;
    const text = event.currentTarget.value;
    const next = text.trim() === "" ? Number.NaN : Number(text);

    if (Number.isFinite(next)) {
      context.setValue(next, { reason: "input", event });
    } else {
      context.resetTaps();
    }

    setDraft({
      text,
      value: context.value(),
      revision: context.tapRevision(),
    });
  };

  const finish = (event: Event & { currentTarget: HTMLInputElement }) => {
    if (context.disabled() || context.readOnly()) return;
    const current = draft();

    const valid =
      current !== null &&
      current.text.trim() !== "" &&
      Number.isFinite(Number(current.text));

    setDraft(null);
    event.currentTarget.value = String(context.value());

    if (valid) context.commit(context.value());
  };

  return (
    <div
      class="bg-input/50 focus-within:ring-ring/30 flex h-(--tempo-height) items-center rounded-lg focus-within:ring-3"
      data-slot="tempo-control-input-group"
    >
      <input
        aria-label="Tempo in beats per minute"
        class={cn(
          "h-full w-16 bg-transparent px-2 text-end font-mono text-sm tabular-nums outline-hidden",
          props.class,
          props.className
        )}
        data-slot="tempo-control-input"
        disabled={context.disabled()}
        inputmode="decimal"
        aria-valuemin={context.min()}
        aria-valuemax={context.max()}
        aria-valuenow={context.value()}
        max={context.max()}
        min={context.min()}
        name={props.name ?? context.name()}
        value={displayValue()}
        onInput={(event) => {
          const handler = props.onInput;

          if (handler && "call" in handler) handler(event);
          else if (handler) handler[0](handler[1], event);

          edit(event);
        }}
        onChange={(event) => {
          const handler = props.onChange;

          if (handler && "call" in handler) handler(event);
          else if (handler) handler[0](handler[1], event);

          if (draft()?.text !== event.currentTarget.value) edit(event);
        }}
        onBlur={(event) => {
          const handler = props.onBlur;

          if (handler && "call" in handler) handler(event);
          else if (handler) handler[0](handler[1], event);

          if (!event.defaultPrevented) finish(event);
        }}
        onKeyDown={(event) => {
          const handler = props.onKeyDown;

          if (handler && "call" in handler) handler(event);
          else if (handler) handler[0](handler[1], event);

          if (
            event.defaultPrevented ||
            context.disabled() ||
            context.readOnly()
          )
            return;

          if (event.key === "Enter") {
            finish(event);

            return;
          }

          let next: number;
          const step = event.shiftKey ? context.largeStep() : 1;

          switch (event.key) {
            case "ArrowUp":
              next = context.value() + step;
              break;
            case "ArrowDown":
              next = context.value() - step;
              break;
            case "Home":
              next = context.min();
              break;
            case "End":
              next = context.max();
              break;
            default:
              return;
          }

          event.preventDefault();
          context.setValue(next, { event, reason: "keyboard" });
          setDraft(null);
          event.currentTarget.value = String(context.value());
          context.commit(context.value());
        }}
        readonly={context.readOnly()}
        step={1}
        type="text"
        role="spinbutton"
        {...rest}
      />
      <span
        aria-hidden="true"
        class="text-muted-foreground pr-2 text-xs"
        data-slot="tempo-control-unit"
      >
        BPM
      </span>
    </div>
  );
};

type TempoTapDOMProps = Omit<ButtonDOMProps, "onClick" | "onKeyDown"> & {
  onClick?: (event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
};

export interface TempoControlTapProps extends TempoTapDOMProps {
  className?: string;
  as?: Component<TempoTapDOMProps>;
}

export const TempoControlTap = (props: TempoControlTapProps) => {
  const context = useTempo();

  const rest = omitProps(props, [
    "as",
    "class",
    "className",
    "children",
    "disabled",
    "onClick",
    "onKeyDown",
  ]);

  const TapButton =
    props.as ??
    ((buttonProps: TempoTapDOMProps) => <button {...buttonProps} />);

  return (
    <TapButton
      aria-label={props["aria-label"] ?? "Tap tempo"}
      class={cn(
        "border-border bg-background hover:bg-muted inline-flex h-(--tempo-height) shrink-0 touch-manipulation items-center justify-center rounded-lg border px-3 text-sm font-medium outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
        props.class,
        props.className
      )}
      data-slot="tempo-control-tap"
      disabled={context.disabled() || context.readOnly() || props.disabled}
      onClick={(event: MouseEvent) => {
        props.onClick?.(event);

        if (!event.defaultPrevented) context.tap(event);
      }}
      onKeyDown={(event: KeyboardEvent) => {
        props.onKeyDown?.(event);

        if (event.repeat && (event.key === "Enter" || event.key === " "))
          event.preventDefault();
      }}
      type="button"
      {...rest}
    >
      {props.children ?? "Tap"}
    </TapButton>
  );
};

export const TempoControl = (
  props: TempoControlProps & { className?: string }
) => {
  const config = useAudioConfig();
  const [tapRevision, setTapRevision] = createSignal(0);
  const disabled = () => props.disabled ?? config.disabled ?? false;
  const size = () => props.size ?? config.size ?? "default";
  const min = () => Math.ceil(props.min ?? 30);
  const max = () => Math.floor(props.max ?? 600);

  const tempo = useTapTempo({
    get value() {
      return props.value;
    },
    get defaultValue() {
      return props.defaultValue;
    },
    get min() {
      return min();
    },
    get max() {
      return max();
    },
    get tapTimeout() {
      return props.tapTimeout;
    },
    get disabled() {
      return disabled();
    },
    get readOnly() {
      return props.readOnly;
    },
    get onValueChange() {
      return props.onValueChange;
    },
    get onValueCommitted() {
      return (next: number) => {
        setTapRevision((revision) => revision + 1);
        props.onValueCommitted?.(next);
      };
    },
  });

  const context: TempoContextValue = {
    disabled,
    readOnly: () => props.readOnly ?? false,
    resetTaps: tempo.resetTaps,
    tap: tempo.tap,
    tapRevision,
    setValue: tempo.setValue,
    min,
    max,
    value: tempo.value,
    name: () => props.name,
    largeStep: () => Math.max(1, Math.round(props.largeStep ?? 10)),
    commit: (next) => props.onValueCommitted?.(next),
  };

  const rest = omitProps(props, [
    "value",
    "defaultValue",
    "onValueChange",
    "onValueCommitted",
    "min",
    "max",
    "largeStep",
    "tapTimeout",
    "size",
    "disabled",
    "readOnly",
    "name",
    "class",
    "className",
    "children",
  ]);

  return provideContext(TempoContext, context, () => (
    <div
      aria-label="Tempo"
      class={cn(
        tempoControlVariants({ size: size() }),
        props.class,
        props.className
      )}
      data-disabled={disabled() ? "" : undefined}
      data-readonly={props.readOnly ? "" : undefined}
      data-size={size()}
      data-slot="tempo-control"
      role="group"
      {...rest}
    >
      {props.children ?? (
        <>
          <TempoControlInput />
          <TempoControlTap />
        </>
      )}
    </div>
  ));
};
