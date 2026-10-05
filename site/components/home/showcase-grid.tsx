import { For } from "solid-js";

import { cn } from "@/lib/utils";
import { ShowcaseCard } from "@/site/components/home/showcase-card";
import { ShowcaseTile } from "@/site/components/home/showcase-tile";
import type { ShowcaseTileName } from "@/site/components/home/showcase-tile";

interface ShowcaseItem {
  href: string;
  label: string;
  tile: ShowcaseTileName;
}

const WIDE: ShowcaseItem[] = [
  { href: "/docs/components/mixer", label: "Mixer", tile: "mixer" },
  { href: "/docs/components/waveform", label: "Waveform", tile: "waveform" },
  { href: "/docs/blocks/music-player", label: "Music player", tile: "music" },
  {
    href: "/docs/components/sound-pad",
    label: "Sound pads",
    tile: "sound-pads",
  },
];

const LEFT: ShowcaseItem[] = [
  {
    href: "/docs/components/bar-visualizer",
    label: "Bar visualizer",
    tile: "voice",
  },
  { href: "/docs/components/knob", label: "Knobs", tile: "knobs" },
  { href: "/docs/components/spectrum", label: "Spectrum", tile: "spectrum" },
  {
    href: "/docs/components/parameter-slider",
    label: "Parameter sliders",
    tile: "eq",
  },
  {
    href: "/docs/components/live-waveform",
    label: "Live waveform",
    tile: "live-waveform",
  },
];

const RIGHT: ShowcaseItem[] = [
  {
    href: "/docs/components/level-meter",
    label: "Level meters",
    tile: "meters",
  },
  {
    href: "/docs/components/channel-toggle",
    label: "Channel controls",
    tile: "channel",
  },
  { href: "/docs/components/fader", label: "Faders", tile: "faders" },
  {
    href: "/docs/components/audio-device-select",
    label: "Output",
    tile: "output",
  },
  {
    href: "/docs/components/audio-player",
    label: "Audio player",
    tile: "compact-player",
  },
];

const Column = (props: { class?: string; items: ShowcaseItem[] }) => (
  <div class={cn("flex min-w-0 flex-col gap-4", props.class)}>
    <For each={props.items}>
      {(item) => (
        <ShowcaseCard href={item.href} label={item.label}>
          <ShowcaseTile name={item.tile} />
        </ShowcaseCard>
      )}
    </For>
  </div>
);

export const ShowcaseGrid = () => (
  <section
    aria-label="Live components"
    class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
  >
    <Column class="md:col-span-2 lg:order-2" items={WIDE} />
    <Column class="lg:order-1" items={LEFT} />
    <Column class="lg:order-3" items={RIGHT} />
  </section>
);
