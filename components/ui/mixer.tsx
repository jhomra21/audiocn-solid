import {
  createContext,
  createUniqueId,
  onCleanup,
  useContext,
} from "solid-js";

import { AudioConfigProvider } from "@/hooks/use-audio-config";
import type { AudioSize } from "@/hooks/use-audio-config";
import type { BallisticsInput } from "@/lib/audio/ballistics";
import type {
  MeterZone,
  Orientation,
} from "@/lib/audio/types";
import { provideContext } from "@/lib/solid/context";
import { createCompatEffect } from "@/lib/solid/effect";
import type {
  DivDOMProps,
  SpanDOMProps,
} from "@/lib/solid/jsx-types";
import { omitProps } from "@/lib/solid/props";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  "input, button, [tabindex]:not([tabindex='-1'])";

const STRIP_SELECTOR =
  "[data-slot='channel-strip']";

interface MixerContextValue {
  readonly orientation: Orientation;
  readonly titleId: string;
}

const MixerContext =
  createContext<MixerContextValue | null>(null);

const useMixerPart = (
  part: string
): MixerContextValue => {
  const context =
    useContext(MixerContext);

  if (!context) {
    throw new Error(
      `${part} must be used inside Mixer.`
    );
  }

  return context;
};

/** The surrounding mixer's layout, for custom parts. */
export const useMixerContext =
  (): MixerContextValue =>
    useMixerPart(
      "useMixerContext"
    );

export interface MixerProps
  extends Omit<
    DivDOMProps,
    | "children"
    | "class"
    | "className"
  > {
  ballistics?: BallisticsInput;
  children?: DivDOMProps["children"];
  class?: string;
  className?: string;
  disabled?: boolean;
  maxDb?: number;
  minDb?: number;
  orientation?: Orientation;
  size?: AudioSize;
  zones?: MeterZone[];
}

const MIXER_OWN = [
  "ballistics",
  "children",
  "class",
  "className",
  "disabled",
  "maxDb",
  "minDb",
  "orientation",
  "size",
  "zones",
] as const;

export const Mixer = (
  props: MixerProps
) => {
  const rest = omitProps(
    props,
    MIXER_OWN
  );

  const orientation = () =>
    props.orientation ??
    "horizontal";

  const titleId =
    `mixer-${createUniqueId()}-title`;

  const context: MixerContextValue = {
    get orientation() {
      return orientation();
    },
    titleId,
  };

  const config = {
    get ballistics() {
      return props.ballistics;
    },
    get disabled() {
      return props.disabled;
    },
    get maxDb() {
      return props.maxDb;
    },
    get minDb() {
      return props.minDb;
    },
    get orientation() {
      return orientation();
    },
    get size() {
      return props.size;
    },
    get zones() {
      return props.zones;
    },
  };

  return provideContext(
    MixerContext,
    context,
    () => (
      <AudioConfigProvider
        value={config}
      >
        <div
          aria-labelledby={
            titleId
          }
          class={cn(
            "group/mixer grid min-w-0 gap-3 [--mixer-gap:0.5rem]",
            orientation() ===
              "horizontal"
              ? "grid-cols-1 [grid-template-areas:'header'_'channels'_'separator'_'master']"
              : "grid-cols-[minmax(0,1fr)_auto_auto] grid-rows-[auto_minmax(0,1fr)] [grid-template-areas:'header_header_header'_'channels_separator_master']",
            props.class,
            props.className
          )}
          data-orientation={
            orientation()
          }
          data-size={
            props.size
          }
          data-slot="mixer"
          role="group"
          {...rest}
        >
          {props.children}
        </div>
      </AudioConfigProvider>
    )
  );
};

type DivPartProps = Omit<
  DivDOMProps,
  "class" | "className"
> & {
  class?: string;
  className?: string;
};

const CLASS_OWN = [
  "class",
  "className",
] as const;

export const MixerHeader = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-w-0 items-center gap-2 [grid-area:header]",
        props.class,
        props.className
      )}
      data-slot="mixer-header"
      {...rest}
    />
  );
};

export interface MixerTitleProps
  extends Omit<
    SpanDOMProps,
    "class" | "className"
  > {
  class?: string;
  className?: string;
}

export const MixerTitle = (
  props: MixerTitleProps
) => {
  const context =
    useMixerPart(
      "MixerTitle"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <h2
      class={cn(
        "font-heading mr-auto text-base font-medium",
        props.class,
        props.className
      )}
      data-slot="mixer-title"
      id={context.titleId}
      {...rest}
    />
  );
};

export const MixerActions = (
  props: DivPartProps
) => {
  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex items-center gap-1",
        props.class,
        props.className
      )}
      data-slot="mixer-actions"
      {...rest}
    />
  );
};

const focusNeighbour = (
  event: KeyboardEvent,
  container: HTMLDivElement,
  direction: number
): boolean => {
  const target =
    event.target;

  if (
    !(target instanceof HTMLElement)
  ) {
    return false;
  }

  const strip =
    target.closest<HTMLElement>(
      STRIP_SELECTOR
    );

  if (!strip) {
    return false;
  }

  const strips = [
    ...container.querySelectorAll<HTMLElement>(
      STRIP_SELECTOR
    ),
  ];

  const index =
    strips.indexOf(strip);

  const neighbour =
    strips[
      index + direction
    ];

  if (!neighbour) {
    return false;
  }

  const slot =
    target.closest<HTMLElement>(
      "[data-slot]"
    )?.dataset.slot;

  const match = slot
    ? neighbour.querySelector<HTMLElement>(
        `[data-slot='${slot}']`
      )
    : null;

  const focusTarget =
    match?.matches(
      FOCUSABLE
    )
      ? match
      : match?.querySelector<HTMLElement>(
            FOCUSABLE
          ) ??
        neighbour.querySelector<HTMLElement>(
          FOCUSABLE
        );

  if (!focusTarget) {
    return false;
  }

  focusTarget.focus();

  return true;
};

export interface MixerChannelsProps
  extends Omit<
    DivDOMProps,
    | "class"
    | "className"
    | "onKeyDown"
  > {
  class?: string;
  className?: string;
  onKeyDownCapture?: (
    event: KeyboardEvent
  ) => void;
  scrollable?: boolean;
}

const CHANNELS_OWN = [
  "class",
  "className",
  "onKeyDownCapture",
  "scrollable",
] as const;

export const MixerChannels = (
  props: MixerChannelsProps
) => {
  const context =
    useMixerPart(
      "MixerChannels"
    );

  const rest = omitProps(
    props,
    CHANNELS_OWN
  );

  let element:
    | HTMLDivElement
    | undefined;

  createCompatEffect(
    () => [
      element,
      context.orientation,
      props.onKeyDownCapture,
    ] as const,
    ([
      node,
      orientation,
      externalHandler,
    ]) => {
      if (!node) {
        return;
      }

      const handler = (
        event: KeyboardEvent
      ) => {
        externalHandler?.(
          event
        );

        if (
          event.defaultPrevented ||
          !(
            event.ctrlKey ||
            event.metaKey
          )
        ) {
          return;
        }

        const previous =
          orientation ===
          "horizontal"
            ? "ArrowUp"
            : "ArrowLeft";

        const next =
          orientation ===
          "horizontal"
            ? "ArrowDown"
            : "ArrowRight";

        let direction = 0;

        if (
          event.key ===
          previous
        ) {
          direction = -1;
        } else if (
          event.key ===
          next
        ) {
          direction = 1;
        }

        if (
          direction !== 0 &&
          focusNeighbour(
            event,
            node,
            direction
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      };

      node.addEventListener(
        "keydown",
        handler,
        {
          capture: true,
        }
      );

      return () => {
        node.removeEventListener(
          "keydown",
          handler,
          {
            capture: true,
          }
        );
      };
    }
  );

  onCleanup(() => {
    element = undefined;
  });

  const scrollable = () =>
    props.scrollable ??
    true;

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 gap-(--mixer-gap) [grid-area:channels]",
        context.orientation ===
          "horizontal"
          ? "flex-col"
          : "flex-row",
        scrollable()
          ? context.orientation ===
            "horizontal"
            ? "overflow-y-auto"
            : "overflow-x-auto"
          : undefined,
        "empty:hidden",
        props.class,
        props.className
      )}
      data-slot="mixer-channels"
      ref={(node) => {
        element = node;
      }}
      {...rest}
    />
  );
};

export const MixerSeparator = (
  props: DivPartProps
) => {
  const context =
    useMixerPart(
      "MixerSeparator"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      aria-hidden="true"
      class={cn(
        "bg-border shrink-0 [grid-area:separator]",
        context.orientation ===
          "horizontal"
          ? "h-px w-full"
          : "h-full w-px",
        props.class,
        props.className
      )}
      data-slot="mixer-separator"
      {...rest}
    />
  );
};

export const MixerMaster = (
  props: DivPartProps
) => {
  const context =
    useMixerPart(
      "MixerMaster"
    );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "flex min-h-0 min-w-0 [grid-area:master]",
        context.orientation ===
          "horizontal"
          ? "flex-col"
          : "flex-row",
        props.class,
        props.className
      )}
      data-slot="mixer-master"
      {...rest}
    />
  );
};

/** Shown when MixerChannels renders nothing. */
export const MixerEmpty = (
  props: DivPartProps
) => {
  useMixerPart(
    "MixerEmpty"
  );

  const rest = omitProps(
    props,
    CLASS_OWN
  );

  return (
    <div
      class={cn(
        "text-muted-foreground hidden min-h-24 items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm [grid-area:channels] group-has-[[data-slot=mixer-channels]:empty]/mixer:flex",
        props.class,
        props.className
      )}
      data-slot="mixer-empty"
      {...rest}
    />
  );
};
