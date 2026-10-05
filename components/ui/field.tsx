import { children, createMemo, For, Show } from "solid-js";

import { Label } from "@/components/ui/label";
import type { LabelProps } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type {
  DivDOMProps,
  ParagraphDOMProps,
  FieldSetDOMProps,
  LegendDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

type FieldPartProps = DivDOMProps & { className?: string };

export const FieldSet = (props: FieldSetDOMProps & { className?: string }) => (
  <fieldset
    data-slot="field-set"
    class={cn(
      "flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const FieldLegend = (
  props: LegendDOMProps & { className?: string; variant?: "legend" | "label" }
) => (
  <legend
    data-slot="field-legend"
    data-variant={props.variant ?? "legend"}
    class={cn(
      "mb-3 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "variant"])}
  />
);

export const FieldTitle = (props: FieldPartProps) => (
  <div
    data-slot="field-label"
    class={cn(
      "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const FieldSeparator = (props: FieldPartProps) => {
  const content = children(() => props.children);

  return (
    <div
      data-slot="field-separator"
      data-content={Boolean(content())}
      class={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        props.class,
        props.className
      )}
      {...omitProps(props, ["class", "className", "children"])}
    >
      <Separator class="absolute inset-0 top-1/2" />
      <Show when={content()}>
        <span
          class="bg-background text-muted-foreground relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {content()}
        </span>
      </Show>
    </div>
  );
};

export const FieldError = (
  props: FieldPartProps & { errors?: ({ message?: string } | undefined)[] }
) => {
  const messages = createMemo(() => [
    ...new Set(
      props.errors?.flatMap((error) =>
        error?.message ? [error.message] : []
      ) ?? []
    ),
  ]);

  const content = children(() => props.children);

  return (
    <Show when={content() || messages().length > 0}>
      <div
        role="alert"
        data-slot="field-error"
        class={cn(
          "text-destructive text-sm font-normal",
          props.class,
          props.className
        )}
        {...omitProps(props, ["class", "className", "children", "errors"])}
      >
        <Show
          when={content()}
          fallback={
            <Show
              when={messages().length === 1}
              fallback={
                <ul class="ml-4 flex list-disc flex-col gap-1">
                  <For each={messages()}>{(message) => <li>{message}</li>}</For>
                </ul>
              }
            >
              {messages()[0]}
            </Show>
          }
        >
          {content()}
        </Show>
      </div>
    </Show>
  );
};

export const FieldGroup = (props: FieldPartProps) => (
  <div
    data-slot="field-group"
    class={cn(
      "group/field-group @container/field-group flex w-full flex-col gap-6 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

const orientations = {
  horizontal:
    "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
  responsive:
    "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
  vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
};

export const Field = (
  props: FieldPartProps & { orientation?: keyof typeof orientations }
) => (
  <div
    role="group"
    data-slot="field"
    data-orientation={props.orientation ?? "vertical"}
    class={cn(
      "group/field data-[invalid=true]:text-destructive flex w-full gap-3",
      orientations[props.orientation ?? "vertical"],
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className", "orientation"])}
  />
);

export const FieldContent = (props: FieldPartProps) => (
  <div
    data-slot="field-content"
    class={cn(
      "group/field-content flex flex-1 flex-col gap-1 leading-snug",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const FieldLabel = (props: LabelProps) => (
  <Label
    data-slot="field-label"
    class={cn(
      "group/field-label peer/field-label has-data-checked:bg-input/30 has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-input/40 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring has-[>[data-slot=field]]:has-[:focus-visible]:ring-ring/50 flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-2xl has-[>[data-slot=field]]:border has-[>[data-slot=field]]:has-[:focus-visible]:ring-3 *:data-[slot=field]:p-4",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);

export const FieldDescription = (
  props: ParagraphDOMProps & { className?: string }
) => (
  <p
    data-slot="field-description"
    class={cn(
      "text-muted-foreground [&>a:hover]:text-primary text-left text-sm leading-normal font-normal group-has-data-horizontal/field:text-balance last:mt-0 nth-last-2:-mt-1 [&>a]:underline [&>a]:underline-offset-4 [[data-variant=legend]+&]:-mt-1.5",
      props.class,
      props.className
    )}
    {...omitProps(props, ["class", "className"])}
  />
);
