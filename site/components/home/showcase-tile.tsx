import { createSignal, lazy, Loading, onSettled, Show } from "solid-js";

const TILES = {
  channel: {
    Component: lazy(() => import("./tiles/channel-tile")),
    size: "h-34",
  },
  "compact-player": {
    Component: lazy(() => import("./tiles/compact-player-tile")),
    size: "h-10",
  },
  eq: { Component: lazy(() => import("./tiles/eq-tile")), size: "h-46" },
  faders: {
    Component: lazy(() => import("./tiles/faders-tile")),
    size: "h-62",
  },
  knobs: { Component: lazy(() => import("./tiles/knobs-tile")), size: "h-23" },
  "live-waveform": {
    Component: lazy(() => import("./tiles/live-waveform-tile")),
    size: "h-31",
  },
  meters: {
    Component: lazy(() => import("./tiles/meters-tile")),
    size: "h-62",
  },
  mixer: { Component: lazy(() => import("./tiles/mixer-tile")), size: "h-75" },
  music: {
    Component: lazy(() => import("./tiles/music-tile")),
    size: "h-82 @lg:h-40",
  },
  output: {
    Component: lazy(() => import("./tiles/output-tile")),
    size: "h-19",
  },
  "sound-pads": {
    Component: lazy(() => import("./tiles/sound-pads-tile")),
    size: "h-76 @sm:h-50",
  },
  spectrum: {
    Component: lazy(() => import("./tiles/spectrum-tile")),
    size: "h-32",
  },
  voice: { Component: lazy(() => import("./tiles/voice-tile")), size: "h-40" },
  waveform: {
    Component: lazy(() => import("./tiles/waveform-tile")),
    size: "h-36",
  },
};

export type ShowcaseTileName = keyof typeof TILES;

/** Match upstream: load once near the viewport, and keep the owner alive afterward. */
export const ShowcaseTile = (props: { name: ShowcaseTileName }) => {
  const [near, setNear] = createSignal(false);
  let element: HTMLDivElement | undefined;
  const tile = TILES[props.name];

  const placeholder = () => (
    <div
      data-slot="skeleton"
      class={`bg-muted w-full animate-pulse rounded-md motion-reduce:animate-none ${tile.size}`}
    />
  );

  onSettled(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(element);

    return () => observer.disconnect();
  });

  return (
    <div
      class="@container flex w-full min-w-0 justify-center"
      ref={(node) => {
        element = node;
      }}
    >
      <Show when={near()} fallback={placeholder()}>
        <Loading fallback={placeholder()}>
          <tile.Component />
        </Loading>
      </Show>
    </div>
  );
};
