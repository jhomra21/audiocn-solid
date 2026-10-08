import { dynamic } from "@solidjs/web";
import type { ComponentProps, JSX } from "@solidjs/web";
import {
  Errored,
  For,
  Show,
  createSignal,
  createUniqueId,
  omit,
  onSettled,
} from "solid-js";

import AudioDeviceSelectDemo from "@/components/examples/audio-device-select-demo";
import AudioDeviceSelectStates from "@/components/examples/audio-device-select-states";
import AudioPlayerCompact from "@/components/examples/audio-player-compact";
import AudioPlayerDemo from "@/components/examples/audio-player-demo";
import BarVisualizerAlign from "@/components/examples/bar-visualizer-align";
import BarVisualizerDemo from "@/components/examples/bar-visualizer-demo";
import BarVisualizerMini from "@/components/examples/bar-visualizer-mini";
import BarVisualizerMirrored from "@/components/examples/bar-visualizer-mirrored";
import BarVisualizerStates from "@/components/examples/bar-visualizer-states";
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
import ElectricBarVisualizerColors from "@/components/examples/electric-bar-visualizer-colors";
import ElectricBarVisualizerDemo from "@/components/examples/electric-bar-visualizer-demo";
import ElectricBarVisualizerIntensity from "@/components/examples/electric-bar-visualizer-intensity";
import ElectricBarVisualizerMicrophone from "@/components/examples/electric-bar-visualizer-microphone";
import ElectricBarVisualizerMirrored from "@/components/examples/electric-bar-visualizer-mirrored";
import ElectricBarVisualizerStates from "@/components/examples/electric-bar-visualizer-states";
import ElectricWaveformDemo from "@/components/examples/electric-waveform-demo";
import ElectricWaveformIntensity from "@/components/examples/electric-waveform-intensity";
import ElectricWaveformMicrophone from "@/components/examples/electric-waveform-microphone";
import ElectricWaveformModes from "@/components/examples/electric-waveform-modes";
import ElectricWaveformStates from "@/components/examples/electric-waveform-states";
import FaderBipolar from "@/components/examples/fader-bipolar";
import FaderDemo from "@/components/examples/fader-demo";
import FaderSilence from "@/components/examples/fader-silence";
import FaderSizes from "@/components/examples/fader-sizes";
import FaderVertical from "@/components/examples/fader-vertical";
import FaderWithMeter from "@/components/examples/fader-with-meter";
import FrameSourceDemo from "@/components/examples/frame-source-demo";
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
import LiveWaveformDemo from "@/components/examples/live-waveform-demo";
import LiveWaveformIdle from "@/components/examples/live-waveform-idle";
import LiveWaveformMicrophone from "@/components/examples/live-waveform-microphone";
import LiveWaveformVariants from "@/components/examples/live-waveform-variants";
import MicSetupDemo from "@/components/examples/mic-setup-demo";
import MixerConsole from "@/components/examples/mixer-console";
import MixerDemo from "@/components/examples/mixer-demo";
import MixerEmptyDemo from "@/components/examples/mixer-empty";
import MusicPlayerDemo from "@/components/examples/music-player-demo";
import MusicPlayerDucking from "@/components/examples/music-player-ducking";
import PanControlDemo from "@/components/examples/pan-control-demo";
import PanControlKnob from "@/components/examples/pan-control-knob";
import ParameterSliderDemo from "@/components/examples/parameter-slider-demo";
import ParameterSliderFrequency from "@/components/examples/parameter-slider-frequency";
import QuickAudioPopoverDemo from "@/components/examples/quick-audio-popover-demo";
import SmoothWaveformDemo from "@/components/examples/smooth-waveform-demo";
import SmoothWaveformMicrophone from "@/components/examples/smooth-waveform-microphone";
import SmoothWaveformModes from "@/components/examples/smooth-waveform-modes";
import SmoothWaveformStates from "@/components/examples/smooth-waveform-states";
import SoundPadDemo from "@/components/examples/sound-pad-demo";
import SoundPadGridDemo from "@/components/examples/sound-pad-grid";
import SoundboardDemo from "@/components/examples/soundboard-demo";
import SpectrumDemo from "@/components/examples/spectrum-demo";
import SpectrumMicrophone from "@/components/examples/spectrum-microphone";
import SpectrumVariants from "@/components/examples/spectrum-variants";
import SystemAudioMixerConsole from "@/components/examples/system-audio-mixer-console";
import SystemAudioMixerDemo from "@/components/examples/system-audio-mixer-demo";
import SystemAudioSettingsDemo from "@/components/examples/system-audio-settings-demo";
import TrackListDemo from "@/components/examples/track-list-demo";
import VolumeControlDemo from "@/components/examples/volume-control-demo";
import VolumeControlPopover from "@/components/examples/volume-control-popover";
import WaveformDemo from "@/components/examples/waveform-demo";
import WaveformRegions from "@/components/examples/waveform-regions";
import WaveformVariants from "@/components/examples/waveform-variants";
import {
  Tabs as CommandTabs,
  TabsList as CommandTabsList,
  TabsTrigger as CommandTab,
  TabsContent as CommandContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  CopyErrorIcon,
  CopyFeedback,
} from "@/site/components/docs/copy-feedback";
import {
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  InfoIcon,
  LinkIcon,
} from "@/site/components/docs/icons";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";
import { NotYetPorted } from "@/site/components/home/not-yet-ported";
import { createCopyFeedback } from "@/site/lib/docs/copy-feedback";

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

  const [copyState, copy] = createCopyFeedback(() => {
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
        <CopyFeedback
          state={copyState}
          renderIcon={(state) =>
            state === "done" ? (
              <CheckIcon />
            ) : state === "error" ? (
              <CopyErrorIcon />
            ) : (
              <LinkIcon />
            )
          }
        />
        <span class="sr-only">
          {copyState() === "done"
            ? "Copied Anchor Link"
            : copyState() === "error"
              ? "Copy failed"
              : "Copy Anchor Link"}
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

const INSTALL_COPY_BUTTON_CLASS = `${COPY_BUTTON_CLASS} [&_svg:not([class*='size-'])]:size-3.5`;

interface PreProps extends ComponentProps<"pre"> {
  /** Set from a fence's `title="…"` by the shiki options in lib/docs/code-highlight. */
  "data-title"?: string;
}

/** A highlighted code block: shiki's `pre` framed like fumadocs' CodeBlock. */
export const MdxPre = (props: PreProps) => {
  let viewport: HTMLDivElement | undefined;

  const [copyState, copy] = createCopyFeedback(
    () => viewport?.querySelector("pre")?.textContent ?? undefined
  );

  const copyButton = () => (
    <button
      aria-live="polite"
      class={COPY_BUTTON_CLASS}
      data-copied={copyState() === "done" ? "" : undefined}
      onClick={() => void copy()}
      type="button"
    >
      <CopyFeedback
        state={copyState}
        renderIcon={(state) =>
          state === "done" ? (
            <CheckIcon />
          ) : state === "error" ? (
            <CopyErrorIcon />
          ) : (
            <ClipboardIcon />
          )
        }
      />
      <span class="sr-only">
        {copyState() === "done"
          ? "Copied Text"
          : copyState() === "error"
            ? "Copy failed"
            : "Copy Text"}
      </span>
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
  "mic-setup-demo": MicSetupDemo,
  "music-player-demo": MusicPlayerDemo,
  "music-player-ducking": MusicPlayerDucking,
  "quick-audio-popover-demo": QuickAudioPopoverDemo,
  "soundboard-demo": SoundboardDemo,
  "system-audio-mixer-demo": SystemAudioMixerDemo,
  "system-audio-mixer-console": SystemAudioMixerConsole,
  "system-audio-settings-demo": SystemAudioSettingsDemo,
  "audio-player-demo": AudioPlayerDemo,
  "audio-player-compact": AudioPlayerCompact,
  "audio-device-select-demo": AudioDeviceSelectDemo,
  "audio-device-select-states": AudioDeviceSelectStates,
  "waveform-demo": WaveformDemo,
  "waveform-regions": WaveformRegions,
  "waveform-variants": WaveformVariants,
  "track-list-demo": TrackListDemo,
  "sound-pad-demo": SoundPadDemo,
  "sound-pad-grid": SoundPadGridDemo,
  "electric-bar-visualizer-demo": ElectricBarVisualizerDemo,
  "electric-bar-visualizer-colors": ElectricBarVisualizerColors,
  "electric-bar-visualizer-intensity": ElectricBarVisualizerIntensity,
  "electric-bar-visualizer-mirrored": ElectricBarVisualizerMirrored,
  "electric-bar-visualizer-states": ElectricBarVisualizerStates,
  "electric-bar-visualizer-microphone": ElectricBarVisualizerMicrophone,
  "electric-waveform-demo": ElectricWaveformDemo,
  "electric-waveform-intensity": ElectricWaveformIntensity,
  "electric-waveform-modes": ElectricWaveformModes,
  "electric-waveform-states": ElectricWaveformStates,
  "electric-waveform-microphone": ElectricWaveformMicrophone,
  "spectrum-demo": SpectrumDemo,
  "spectrum-variants": SpectrumVariants,
  "spectrum-microphone": SpectrumMicrophone,
  "bar-visualizer-align": BarVisualizerAlign,
  "bar-visualizer-demo": BarVisualizerDemo,
  "bar-visualizer-mini": BarVisualizerMini,
  "bar-visualizer-mirrored": BarVisualizerMirrored,
  "bar-visualizer-states": BarVisualizerStates,
  "smooth-waveform-demo": SmoothWaveformDemo,
  "smooth-waveform-modes": SmoothWaveformModes,
  "smooth-waveform-states": SmoothWaveformStates,
  "smooth-waveform-microphone": SmoothWaveformMicrophone,
  "live-waveform-demo": LiveWaveformDemo,
  "live-waveform-variants": LiveWaveformVariants,
  "live-waveform-idle": LiveWaveformIdle,
  "live-waveform-microphone": LiveWaveformMicrophone,
  "frame-source-demo": FrameSourceDemo,
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
  "volume-control-popover": VolumeControlPopover,
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
      class="not-prose my-6 flex flex-col gap-2"
      data-docs-component="component-preview"
      data-example={props.name}
      data-orientation="horizontal"
      data-slot="tabs"
    >
      <div
        aria-label={`${props.name} example`}
        class="text-muted-foreground inline-flex h-8 w-fit items-center justify-center gap-1 bg-transparent p-[3px]"
        data-slot="tabs-list"
        data-variant="line"
        role="tablist"
      >
        <For each={tabs}>
          {(tab) => (
            <button
              aria-controls={`${id}-${tab}-panel`}
              aria-selected={selected() === tab ? "true" : "false"}
              class="text-foreground/60 hover:text-foreground focus-visible:ring-ring/50 aria-selected:text-foreground after:bg-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-transparent px-1.5 py-0.5 text-sm font-medium whitespace-nowrap outline-none after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:opacity-0 after:transition-opacity focus-visible:ring-3 aria-selected:after:opacity-100"
              data-slot="tabs-trigger"
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
      <Show when={selected() === "preview"}>
        <div
          aria-labelledby={`${id}-preview-tab`}
          class="flex-1 text-sm outline-none"
          data-slot="tabs-content"
          id={`${id}-preview-panel`}
          role="tabpanel"
          tabindex="0"
        >
          <div
            class={cn(
              "bg-background flex min-h-72 w-full justify-center rounded-xl border p-4 sm:p-10",
              props.align === "start"
                ? "items-start"
                : props.align === "end"
                  ? "items-end"
                  : "items-center",
              props.className
            )}
            data-slot="component-preview"
          >
            <Errored
              fallback={(error) => {
                const current = error();

                return (
                  <div data-docs-ssr-error={props.name}>
                    {current instanceof Error
                      ? current.message
                      : String(current)}
                  </div>
                );
              }}
            >
              <Example />
            </Errored>
          </div>
        </div>
      </Show>
      <Show when={selected() === "code"}>
        <div
          aria-labelledby={`${id}-code-tab`}
          class="flex-1 text-sm outline-none [&_.fd-scroll-container]:max-h-[32rem] [&_figure]:my-0"
          data-slot="tabs-content"
          id={`${id}-code-panel`}
          role="tabpanel"
          tabindex="0"
        >
          {props.children}
        </div>
      </Show>
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
  const [copyState, copy] = createCopyFeedback(() => current()[1]);
  onSettled(() => {
    try {
      const saved = localStorage.getItem("packageManager");

      if (commands.some(([manager]) => manager === saved)) setSelected(saved!);
    } catch {
      // Storage may be blocked; selection stays local to this command.
    }
  });

  const selectManager = (value: string) => {
    setSelected(value);

    try {
      localStorage.setItem("packageManager", value);
    } catch {
      /* Selection still works without storage. */
    }
  };

  return (
    <section
      class="not-prose bg-code relative my-4 overflow-hidden rounded-xl"
      data-docs-component="install-command"
    >
      <CommandTabs
        value={selected()}
        onValueChange={selectManager}
        class="gap-0"
      >
        <CommandTabsList
          aria-label="Package manager"
          class="text-muted-foreground flex h-10 w-full justify-start rounded-none border-b bg-transparent p-0 ps-4 pe-10 group-data-[orientation=horizontal]/tabs:h-10"
        >
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
              <CommandTab
                value={manager}
                class="relative h-7 flex-none rounded-lg bg-transparent px-2 font-mono text-sm font-medium shadow-none data-active:bg-transparent"
              >
                {manager}
                <Show when={selected() === manager}>
                  <span
                    data-slot="tabs-indicator"
                    aria-hidden="true"
                    class="bg-foreground pointer-events-none absolute inset-x-0 -bottom-1.5 h-0.5"
                  />
                </Show>
              </CommandTab>
            )}
          </For>
        </CommandTabsList>
        <For each={commands}>
          {([manager, command]) => (
            <CommandContent value={manager}>
              <pre class="overflow-x-auto overscroll-x-contain p-4 leading-6">
                <code
                  data-slot="code-block"
                  data-language="bash"
                  class="text-muted-foreground font-mono text-sm/none"
                >
                  <span class="select-none">$ </span>
                  {command}
                </code>
              </pre>
            </CommandContent>
          )}
        </For>
      </CommandTabs>
      <button
        data-slot="button"
        aria-label={
          copyState() === "done"
            ? "Copied install command"
            : copyState() === "error"
              ? "Copy failed"
              : "Copy install command"
        }
        aria-live="polite"
        class={`${INSTALL_COPY_BUTTON_CLASS} absolute top-2 right-2 size-6`}
        onClick={() => void copy()}
        type="button"
      >
        <CopyFeedback
          state={copyState}
          renderIcon={(state) =>
            state === "done" ? (
              <DocsIcon data-slot="done-icon" name="Check" />
            ) : state === "error" ? (
              <DocsIcon data-slot="error-icon" name="XCircle" />
            ) : (
              <DocsIcon data-slot="idle-icon" name="Copy" />
            )
          }
        />
      </button>
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
  <Show
    when={props.rows.length > 0}
    fallback={<p class="text-muted-foreground text-sm">No props.</p>}
  >
    <TypeTable
      component="props-table"
      type={Object.fromEntries(
        props.rows.map(([name, type, defaultValue, description]) => [
          name,
          {
            type,
            default: defaultValue ?? undefined,
            description: description ?? undefined,
          },
        ])
      )}
    />
  </Show>
);

interface TypeEntry {
  default?: string;
  description?: string;
  type: string;
  required?: boolean;
}

interface TypeTableProps {
  component?: string;
  type: Record<string, TypeEntry>;
}

export const TypeTable = (props: TypeTableProps) => (
  <div
    class="bg-card text-card-foreground @container my-6 flex flex-col overflow-hidden rounded-2xl border p-1 text-sm"
    data-docs-component={props.component ?? "type-table"}
  >
    <div class="not-prose text-muted-foreground flex items-center px-3 py-1 font-medium">
      <p class="w-1/4">Prop</p>
      <p class="@max-xl:hidden">Type</p>
    </div>
    <For each={Object.entries(props.type)}>
      {([name, entry]) => <TypeProperty name={name} entry={entry} />}
    </For>
  </div>
);

const TypeProperty = (props: { name: string; entry: TypeEntry }) => {
  const [open, setOpen] = createSignal(false);
  const id = createUniqueId();

  return (
    <div
      class={`scroll-m-20 overflow-hidden rounded-xl border transition-all ${open() ? "bg-background shadow-sm not-last:mb-2" : "border-transparent"}`}
    >
      <button
        aria-controls={id}
        aria-expanded={open() ? "true" : "false"}
        aria-label={`${props.name}${props.entry.required ? "" : "?"}`}
        class="not-prose hover:bg-accent relative flex w-full items-center px-3 py-2 text-start"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <code class="text-primary w-1/4 min-w-fit pe-2 font-mono font-medium">
          {props.name}
          {props.entry.required ? "" : "?"}
        </code>
        <span class="@max-xl:hidden">{props.entry.type}</span>
        <ChevronDownIcon
          class={`text-muted-foreground absolute end-2 size-4 transition-transform ${open() ? "rotate-180" : ""}`}
        />
      </button>
      <Show when={open()}>
        <div
          class="fd-scroll-container grid grid-cols-[1fr_3fr] gap-y-4 overflow-auto border-t p-3 text-sm"
          id={id}
        >
          <div class="prose prose-no-margin col-span-full empty:hidden">
            {props.entry.description}
          </div>
          <Show when={props.entry.default}>
            <p class="not-prose text-muted-foreground pe-2">Default</p>
            <p class="not-prose my-auto">{props.entry.default}</p>
          </Show>
        </div>
      </Show>
    </div>
  );
};
