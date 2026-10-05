import { For } from "solid-js";

import { cn } from "@/lib/utils";
import { NotYetPorted } from "@/site/components/home/not-yet-ported";
import { ShowcaseCard } from "@/site/components/home/showcase-card";
import ChannelTile from "@/site/components/home/tiles/channel-tile";
import EqTile from "@/site/components/home/tiles/eq-tile";
import FadersTile from "@/site/components/home/tiles/faders-tile";
import KnobsTile from "@/site/components/home/tiles/knobs-tile";
import LiveWaveformTile from "@/site/components/home/tiles/live-waveform-tile";
import MetersTile from "@/site/components/home/tiles/meters-tile";
import MixerTile from "@/site/components/home/tiles/mixer-tile";
import SpectrumTile from "@/site/components/home/tiles/spectrum-tile";
import VoiceTile from "@/site/components/home/tiles/voice-tile";

const TILES = new Map([
  ["channel", ChannelTile],
  ["eq", EqTile],
  ["faders", FadersTile],
  ["knobs", KnobsTile],
  ["meters", MetersTile],
  ["mixer", MixerTile],
  ["live-waveform", LiveWaveformTile],
  ["voice", VoiceTile],
  ["spectrum", SpectrumTile],
]);

interface ShowcaseItem {
  href: string;
  label: string;
  tile: string;
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

const ShowcaseTile = (props: ShowcaseItem) => {
  const Tile = TILES.get(props.tile);

  return (
    <div class="@container flex w-full min-w-0 justify-center">
      {Tile ? <Tile /> : <NotYetPorted item={props.label} />}
    </div>
  );
};

const Column = (props: { class?: string; items: ShowcaseItem[] }) => (
  <div class={cn("flex min-w-0 flex-col gap-4", props.class)}>
    <For each={props.items}>
      {(item) => (
        <ShowcaseCard href={item.href} label={item.label}>
          <ShowcaseTile {...item} />
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
