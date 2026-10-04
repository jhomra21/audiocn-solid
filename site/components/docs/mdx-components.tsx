import { dynamic } from "@solidjs/web";
import type { ComponentProps, JSX } from "@solidjs/web";
import {
  Errored,
  For,
  Show,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
} from "solid-js";

import ChannelStripConsole from "@/components/examples/channel-strip-console";
import ChannelStripDemo from "@/components/examples/channel-strip-demo";
import ChannelStripNotices from "@/components/examples/channel-strip-notices";
import ChannelToggleDemo from "@/components/examples/channel-toggle-demo";
import ChannelToggleVariants from "@/components/examples/channel-toggle-variants";
import { ClipIndicatorDemo } from "@/components/examples/clip-indicator-demo";
import { ClipIndicatorLatching } from "@/components/examples/clip-indicator-latching";
import { DbReadoutDemo } from "@/components/examples/db-readout-demo";
import { DbReadoutZones } from "@/components/examples/db-readout-zones";
import { DbScaleDemo } from "@/components/examples/db-scale-demo";
import { DbScaleVertical } from "@/components/examples/db-scale-vertical";
import FaderBipolar from "@/components/examples/fader-bipolar";
import FaderDemo from "@/components/examples/fader-demo";
import FaderSilence from "@/components/examples/fader-silence";
import FaderSizes from "@/components/examples/fader-sizes";
import FaderVertical from "@/components/examples/fader-vertical";
import FaderWithMeter from "@/components/examples/fader-with-meter";
import KnobDemo from "@/components/examples/knob-demo";
import KnobDragDirections from "@/components/examples/knob-drag-directions";
import KnobMetal from "@/components/examples/knob-metal";
import KnobSizes from "@/components/examples/knob-sizes";
import KnobVolume from "@/components/examples/knob-volume";
import { LevelMeterBallistics } from "@/components/examples/level-meter-ballistics";
import { LevelMeterCssLevel } from "@/components/examples/level-meter-css-level";
import { LevelMeterCustomColors } from "@/components/examples/level-meter-custom-colors";
import { LevelMeterDemo } from "@/components/examples/level-meter-demo";
import { LevelMeterDual } from "@/components/examples/level-meter-dual";
import { LevelMeterMicrophone } from "@/components/examples/level-meter-microphone";
import { LevelMeterSimple } from "@/components/examples/level-meter-simple";
import { LevelMeterValues } from "@/components/examples/level-meter-values";
import { LevelMeterVariants } from "@/components/examples/level-meter-variants";
import { LevelMeterVertical } from "@/components/examples/level-meter-vertical";
import MixerConsole from "@/components/examples/mixer-console";
import MixerDemo from "@/components/examples/mixer-demo";
import MixerEmptyDemo from "@/components/examples/mixer-empty";
import PanControlDemo from "@/components/examples/pan-control-demo";
import PanControlKnob from "@/components/examples/pan-control-knob";
import ParameterSliderDemo from "@/components/examples/parameter-slider-demo";
import ParameterSliderFrequency from "@/components/examples/parameter-slider-frequency";
import VolumeControlDemo from "@/components/examples/volume-control-demo";
import {
  CheckIcon,
  ClipboardIcon,
  CopyIcon,
  InfoIcon,
  LinkIcon,
} from "@/site/components/docs/icons";
import { NotYetPorted } from "@/site/components/home/not-yet-ported";

const COPIED_RESET_MS = 1500;

/** Copies `read()` and reports it as copied for a moment. */
const createCopy = (read: () => string | undefined) => {
  const [copied, setCopied] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(timer));

  const copy = async () => {
    const text = read();

    if (text === undefined) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    clearTimeout(timer);
    timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return [copied, copy] as const;
};

export const MdxA = (props: ComponentProps<"a">) => <a {...props} />;

export const MdxBlockquote = (props: ComponentProps<"blockquote">) => (
  <blockquote {...props} />
);

export const MdxCode = (props: ComponentProps<"code">) => <code {...props} />;

export const MdxEm = (props: ComponentProps<"em">) => <em {...props} />;

export const MdxH1 = (props: ComponentProps<"h1">) => <h1 {...props} />;

interface HeadingProps extends ComponentProps<"h2"> {
  as: "h2" | "h3" | "h4";
}

/** An MDX heading with an anchor link; `data-docs-heading` feeds the page TOC. */
const Heading = (props: HeadingProps) => {
  const Tag = dynamic(() => props.as);
  const rest = omit(props, "as", "children");

  const [copied, copy] = createCopy(() => {
    const url = new URL(window.location.href);
    url.hash = props.id || "";

    return url.href;
  });

  return (
    <Tag
      {...rest}
      class="group/heading flex scroll-m-28 flex-row items-center gap-1"
      data-docs-heading=""
    >
      <a data-card="" href={`#${props.id}`}>
        {props.children}
      </a>
      <button
        aria-live="polite"
        class="not-prose text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex shrink-0 items-center justify-center rounded-md p-1 opacity-0 transition-opacity group-hover/heading:opacity-100 focus-visible:opacity-100 [&_svg]:size-4"
        onClick={() => void copy()}
        type="button"
      >
        <Show fallback={<LinkIcon />} when={copied()}>
          <CheckIcon />
        </Show>
        <span class="sr-only">
          {copied() ? "Copied Anchor Link" : "Copy Anchor Link"}
        </span>
      </button>
    </Tag>
  );
};

export const MdxH2 = (props: ComponentProps<"h2">) => (
  <Heading as="h2" {...props} />
);

export const MdxH3 = (props: ComponentProps<"h3">) => (
  <Heading as="h3" {...props} />
);

export const MdxH4 = (props: ComponentProps<"h4">) => (
  <Heading as="h4" {...props} />
);

export const MdxHr = (props: ComponentProps<"hr">) => <hr {...props} />;

export const MdxImg = (props: ComponentProps<"img">) => <img {...props} />;

export const MdxLi = (props: ComponentProps<"li">) => <li {...props} />;

export const MdxOl = (props: ComponentProps<"ol">) => <ol {...props} />;

export const MdxP = (props: ComponentProps<"p">) => <p {...props} />;

const COPY_BUTTON_CLASS =
  "hover:text-accent-foreground data-copied:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md p-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4";

interface PreProps extends ComponentProps<"pre"> {
  /** Set from a fence's `title="…"` by the shiki options in lib/docs/code-highlight. */
  "data-title"?: string;
}

/** A highlighted code block: shiki's `pre` framed like fumadocs' CodeBlock. */
export const MdxPre = (props: PreProps) => {
  let viewport: HTMLDivElement | undefined;

  const [copied, copy] = createCopy(
    () => viewport?.querySelector("pre")?.textContent ?? undefined
  );

  const copyButton = () => (
    <button
      aria-live="polite"
      class={COPY_BUTTON_CLASS}
      data-copied={copied() ? "" : undefined}
      onClick={() => void copy()}
      type="button"
    >
      <Show fallback={<ClipboardIcon />} when={copied()}>
        <CheckIcon />
      </Show>
      <span class="sr-only">{copied() ? "Copied Text" : "Copy Text"}</span>
    </button>
  );

  return (
    <figure
      class={`${props.class ?? ""} not-prose bg-card relative my-4 overflow-hidden rounded-xl border text-sm shadow-sm`}
      dir="ltr"
      style={props.style}
      tabindex="-1"
    >
      <Show
        fallback={
          <div class="text-muted-foreground absolute top-3 right-2 z-2 rounded-lg backdrop-blur-lg">
            {copyButton()}
          </div>
        }
        when={props["data-title"]}
      >
        {(title) => (
          <div class="text-muted-foreground flex h-9.5 items-center gap-2 border-b px-4">
            <figcaption class="flex-1 truncate">{title()}</figcaption>
            <div class="-me-2">{copyButton()}</div>
          </div>
        )}
      </Show>
      <div
        class="fd-scroll-container focus-visible:ring-ring max-h-[600px] overflow-auto py-3.5 text-[0.8125rem] focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
        ref={(element) => {
          viewport = element;
        }}
        role="region"
        style={
          props["data-title"]
            ? undefined
            : { "--padding-right": "calc(var(--spacing) * 8)" }
        }
        tabindex="0"
      >
        <pre class="w-max min-w-full *:flex *:flex-col">{props.children}</pre>
      </div>
    </figure>
  );
};

export const MdxSpan = (props: ComponentProps<"span">) => <span {...props} />;

export const MdxStrong = (props: ComponentProps<"strong">) => (
  <strong {...props} />
);

export const MdxTable = (props: ComponentProps<"table">) => (
  <div class="prose-no-margin relative my-6 overflow-auto">
    <table {...props} />
  </div>
);

export const MdxTbody = (props: ComponentProps<"tbody">) => (
  <tbody {...props} />
);

export const MdxTd = (props: ComponentProps<"td">) => <td {...props} />;

export const MdxTh = (props: ComponentProps<"th">) => <th {...props} />;

export const MdxThead = (props: ComponentProps<"thead">) => (
  <thead {...props} />
);

export const MdxTr = (props: ComponentProps<"tr">) => <tr {...props} />;

export const MdxUl = (props: ComponentProps<"ul">) => <ul {...props} />;

interface ChildrenProps {
  children?: JSX.Element;
}

interface CalloutProps extends ChildrenProps {
  title?: string;
}

export const Callout = (props: CalloutProps) => (
  <div
    class="bg-card text-card-foreground my-4 flex gap-2 rounded-xl border p-3 ps-1 text-sm shadow-md [--callout-color:oklch(62.3%_0.214_259.815)]"
    data-docs-component="callout"
  >
    <div class="w-0.5 rounded-sm bg-(--callout-color)/50" role="none" />
    <InfoIcon class="text-card -me-0.5 size-5 fill-(--callout-color)" />
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <Show when={props.title}>
        <p class="my-0! font-medium">{props.title}</p>
      </Show>
      <div class="text-muted-foreground prose-no-margin empty:hidden">
        {props.children}
      </div>
    </div>
  </div>
);

export const Steps = (props: ChildrenProps) => (
  <div class="fd-steps" data-docs-component="steps">
    {props.children}
  </div>
);

export const Step = (props: ChildrenProps) => (
  <div class="fd-step" data-docs-component="step">
    {props.children}
  </div>
);

interface TabProps extends ChildrenProps {
  value: string;
}

export const Tabs = (props: ChildrenProps) => (
  <div class="my-4 grid gap-2" data-docs-component="tabs">
    {props.children}
  </div>
);

export const Tab = (props: TabProps) => (
  <section
    class="rounded-lg border p-3"
    data-docs-component="tab"
    data-value={props.value}
  >
    {props.children}
  </section>
);

type ExampleName = keyof typeof examples;

const examples = {
  "clip-indicator-demo": ClipIndicatorDemo,
  "clip-indicator-latching": ClipIndicatorLatching,
  "db-readout-demo": DbReadoutDemo,
  "db-readout-zones": DbReadoutZones,
  "db-scale-demo": DbScaleDemo,
  "db-scale-vertical": DbScaleVertical,
  "fader-sizes": FaderSizes,
  "fader-bipolar": FaderBipolar,
  "fader-demo": FaderDemo,
  "fader-silence": FaderSilence,
  "fader-vertical": FaderVertical,
  "fader-with-meter": FaderWithMeter,
  "knob-demo": KnobDemo,
  "knob-drag-directions": KnobDragDirections,
  "knob-metal": KnobMetal,
  "knob-sizes": KnobSizes,
  "knob-volume": KnobVolume,
  "mixer-console": MixerConsole,
  "mixer-demo": MixerDemo,
  "mixer-empty": MixerEmptyDemo,
  "parameter-slider-frequency": ParameterSliderFrequency,
  "pan-control-demo": PanControlDemo,
  "pan-control-knob": PanControlKnob,
  "parameter-slider-demo": ParameterSliderDemo,
  "channel-strip-console": ChannelStripConsole,
  "channel-strip-demo": ChannelStripDemo,
  "channel-strip-notices": ChannelStripNotices,
  "channel-toggle-demo": ChannelToggleDemo,
  "channel-toggle-variants": ChannelToggleVariants,
  "volume-control-demo": VolumeControlDemo,
  "level-meter-ballistics": LevelMeterBallistics,
  "level-meter-css-level": LevelMeterCssLevel,
  "level-meter-custom-colors": LevelMeterCustomColors,
  "level-meter-demo": LevelMeterDemo,
  "level-meter-dual": LevelMeterDual,
  "level-meter-microphone": LevelMeterMicrophone,
  "level-meter-simple": LevelMeterSimple,
  "level-meter-values": LevelMeterValues,
  "level-meter-variants": LevelMeterVariants,
  "level-meter-vertical": LevelMeterVertical,
};

const isExampleName = (name: string): name is ExampleName => name in examples;

interface ComponentPreviewProps extends ChildrenProps {
  align?: "center" | "start" | "end";
  className?: string;
  name: string;
}

export const ComponentPreview = (props: ComponentPreviewProps) => {
  if (!isExampleName(props.name)) {
    return (
      <section
        data-docs-component="component-preview"
        data-missing={props.name}
        data-slot="component-preview"
      >
        <NotYetPorted item={`Example ${props.name}`} />
      </section>
    );
  }

  const Example = examples[props.name];
  const [selected, setSelected] = createSignal("preview");
  const id = createUniqueId();
  const tabs = ["preview", "code"] as const;

  const onTabKeyDown = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();

    const next =
      event.key === "Home"
        ? "preview"
        : event.key === "End"
          ? "code"
          : selected() === "preview"
            ? "code"
            : "preview";

    setSelected(next);
    document.getElementById(`${id}-${next}-tab`)?.focus();
  };

  return (
    <section
      class="not-prose my-6"
      data-docs-component="component-preview"
      data-example={props.name}
    >
      <div
        aria-label={`${props.name} example`}
        class="mb-1 flex h-9 items-center gap-2"
        role="tablist"
      >
        <For each={tabs}>
          {(tab) => (
            <button
              aria-controls={`${id}-${tab}-panel`}
              aria-selected={selected() === tab ? "true" : "false"}
              class="text-muted-foreground aria-selected:text-foreground aria-selected:after:bg-foreground relative h-9 px-2 text-sm font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full"
              id={`${id}-${tab}-tab`}
              onClick={() => setSelected(tab)}
              onKeyDown={onTabKeyDown}
              role="tab"
              tabindex={selected() === tab ? 0 : -1}
              type="button"
            >
              {tab === "preview" ? "Preview" : "Code"}
            </button>
          )}
        </For>
      </div>
      <div
        aria-labelledby={`${id}-preview-tab`}
        hidden={selected() !== "preview"}
        id={`${id}-preview-panel`}
        role="tabpanel"
        tabindex="0"
      >
        <div
          class={`bg-background flex min-h-72 w-full justify-center rounded-xl border p-4 sm:p-10 ${props.align === "start" ? "items-start" : props.align === "end" ? "items-end" : "items-center"} ${props.className ?? ""}`}
          data-slot="component-preview"
        >
          <Errored
            fallback={(error) => {
              const current = error();

              return (
                <div data-docs-ssr-error={props.name}>
                  {current instanceof Error ? current.message : String(current)}
                </div>
              );
            }}
          >
            <Example />
          </Errored>
        </div>
      </div>
      <div
        aria-labelledby={`${id}-code-tab`}
        class="[&_.fd-scroll-container]:max-h-[32rem] [&_figure]:my-0"
        hidden={selected() !== "code"}
        id={`${id}-code-panel`}
        role="tabpanel"
        tabindex="0"
      >
        {props.children}
      </div>
    </section>
  );
};

interface ComponentSourceProps extends ChildrenProps {
  path: string;
  title?: string;
}

export const ComponentSource = (props: ComponentSourceProps) => (
  <section data-docs-component="component-source">{props.children}</section>
);

interface InstallCommandProps {
  command: string;
}

const packageCommands = (command: string) =>
  [
    ["pnpm", command.replace(/^npx /, "pnpm dlx ")],
    ["yarn", command.replace(/^npx /, "yarn dlx ")],
    ["npm", command],
    ["bun", command.replace(/^npx /, "bunx ")],
  ] as const;

export const InstallCommand = (props: InstallCommandProps) => (
  <InstallTabs command={props.command} />
);

const InstallTabs = (props: InstallCommandProps) => {
  const commands = packageCommands(props.command);
  const [selected, setSelected] = createSignal("pnpm");
  const current = () => commands.find(([manager]) => manager === selected())!;
  const [copied, copy] = createCopy(() => current()[1]);

  return (
    <section
      class="not-prose bg-code relative my-4 overflow-hidden rounded-xl"
      data-docs-component="install-command"
    >
      <div class="text-muted-foreground flex h-10 items-center border-b ps-4 pe-2">
        <svg
          aria-hidden="true"
          class="me-2 size-4 shrink-0"
          viewBox="0 0 24 24"
        >
          <path
            d="M0 0v7.5h7.5V0zm8.25 0v7.5h7.498V0zm8.25 0v7.5H24V0zM8.25 8.25v7.5h7.498v-7.5zm8.25 0v7.5H24v-7.5zM0 16.5V24h7.5v-7.5zm8.25 0V24h7.498v-7.5zm8.25 0V24H24v-7.5z"
            fill="currentColor"
          />
        </svg>
        <For each={commands}>
          {([manager]) => (
            <button
              aria-pressed={selected() === manager ? "true" : "false"}
              class="aria-pressed:text-foreground aria-pressed:after:bg-foreground relative h-10 px-2 font-mono text-sm font-medium after:absolute after:inset-x-0 after:bottom-0 after:h-0.5"
              onClick={() => setSelected(manager)}
              type="button"
            >
              {manager}
            </button>
          )}
        </For>
        <button
          aria-label={
            copied() ? "Copied install command" : "Copy install command"
          }
          aria-live="polite"
          class={`${COPY_BUTTON_CLASS} ms-auto`}
          onClick={() => void copy()}
          type="button"
        >
          <Show fallback={<CopyIcon />} when={copied()}>
            <CheckIcon />
          </Show>
        </button>
      </div>
      <pre class="overflow-x-auto overscroll-x-contain p-4 leading-6">
        <code class="text-muted-foreground font-mono text-sm/none">
          <span class="select-none">$ </span>
          {current()[1]}
        </code>
      </pre>
    </section>
  );
};

type PropRow = [
  name: string,
  type: string,
  defaultValue: string | null,
  description: string | null,
];

interface PropsTableProps {
  rows: PropRow[];
}

export const PropsTable = (props: PropsTableProps) => (
  <div class="my-4 overflow-x-auto" data-docs-component="props-table">
    <table>
      <thead>
        <tr>
          <th>Prop</th>
          <th>Type</th>
          <th>Default</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <For each={props.rows}>
          {(row) => (
            <tr>
              <td>
                <code>{row[0]}</code>
              </td>
              <td>
                <code>{row[1]}</code>
              </td>
              <td>{row[2] ?? "—"}</td>
              <td>{row[3] ?? ""}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </div>
);

interface TypeEntry {
  default?: string;
  description?: string;
  type: string;
}

interface TypeTableProps {
  type: Record<string, TypeEntry>;
}

export const TypeTable = (props: TypeTableProps) => (
  <div class="my-4 overflow-x-auto" data-docs-component="type-table">
    <table>
      <tbody>
        <For each={Object.entries(props.type)}>
          {([name, entry]) => (
            <tr>
              <td>
                <code>{name}</code>
              </td>
              <td>
                <code>{entry.type}</code>
              </td>
              <td>{entry.default ?? ""}</td>
              <td>{entry.description ?? ""}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </div>
);
