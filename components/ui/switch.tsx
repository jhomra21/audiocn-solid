import { createSignal, untrack } from "solid-js";

import { createCompatEffect } from "@/lib/solid/effect";
import type { ButtonDOMProps } from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<
  ButtonDOMProps,
  "onClick" | "disabled" | "value"
> {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  value?: string;
  onCheckedChange?: (checked: boolean) => void;
  onClick?: (event: MouseEvent) => void;
  size?: "sm" | "default";
  className?: string;
}

export const Switch = (props: SwitchProps) => {
  const initialChecked = untrack(() => props.defaultChecked ?? false);
  const [uncontrolled, setUncontrolled] = createSignal(initialChecked);

  const refOptions = { ownedWrite: true, name: "Switch.input" };

  const [input, setInput] = createSignal<HTMLInputElement | undefined>(
    undefined,
    refOptions
  );

  createCompatEffect(
    () => ({ element: input(), controlled: props.checked }),
    ({ element, controlled }) => {
      if (element) element.defaultChecked = controlled ?? initialChecked;
      const form = element?.form;

      const reset = (event: Event) => {
        // The browser resets inputs after dispatch, including controlled inputs.
        queueMicrotask(() => {
          if (event.defaultPrevented || !element) return;
          const next = props.checked ?? initialChecked;

          if (props.checked === undefined) setUncontrolled(next);
          element.checked = next;
        });
      };

      form?.addEventListener("reset", reset);

      return () => form?.removeEventListener("reset", reset);
    }
  );

  const checked = () => props.checked ?? uncontrolled();

  const rest = omitProps(props, [
    "class",
    "className",
    "checked",
    "defaultChecked",
    "onCheckedChange",
    "onClick",
    "size",
    "children",
    "name",
    "value",
  ]);

  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={checked() ? "true" : "false"}
        data-slot="switch"
        data-size={props.size ?? "default"}
        data-checked={checked() ? "" : undefined}
        data-unchecked={checked() ? undefined : ""}
        data-disabled={props.disabled ? "" : undefined}
        class={cn(
          "peer group/switch focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary group-has-[:focus-visible]/field-label:data-checked:border-primary data-unchecked:bg-input/90 relative inline-flex shrink-0 items-center rounded-2xl border-2 transition-all outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-unchecked:border-transparent group-has-[:focus-visible]/field-label:data-unchecked:border-transparent data-[size=default]:h-5 data-[size=default]:w-8 data-[size=sm]:h-4 data-[size=sm]:w-6",
          props.class,
          props.className
        )}
        {...rest}
        onClick={(event: MouseEvent) => {
          props.onClick?.(event);

          if (event.defaultPrevented || props.disabled) return;
          const next = !checked();

          if (props.checked === undefined) setUncontrolled(next);
          props.onCheckedChange?.(next);
        }}
      >
        <span
          data-slot="switch-thumb"
          data-checked={checked() ? "" : undefined}
          data-unchecked={checked() ? undefined : ""}
          class="bg-background dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground pointer-events-none block rounded-2xl shadow-sm ring-0 transition-transform not-dark:bg-clip-padding group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-checked:translate-x-[calc(100%-4px)] data-unchecked:translate-x-0"
        />
      </button>
      <input
        ref={setInput}
        type="checkbox"
        aria-hidden="true"
        tabindex="-1"
        class="sr-only"
        name={props.name}
        value={props.value ?? "on"}
        form={props.form}
        checked={checked()}
        disabled={props.disabled}
        onChange={(event) => {
          const next = event.currentTarget.checked;

          if (props.checked === undefined) setUncontrolled(next);
          props.onCheckedChange?.(next);
        }}
      />
    </>
  );
};
