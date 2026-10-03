import { For } from "solid-js";

import { ComponentPreview } from "@/components/docs/component-preview";
import { ClipIndicatorDemo } from "@/components/examples/clip-indicator-demo";
import { ClipIndicatorLatching } from "@/components/examples/clip-indicator-latching";
import { DbReadoutDemo } from "@/components/examples/db-readout-demo";
import { DbReadoutZones } from "@/components/examples/db-readout-zones";
import { DbScaleDemo } from "@/components/examples/db-scale-demo";
import { DbScaleVertical } from "@/components/examples/db-scale-vertical";
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

const sources = import.meta.glob<string>("../components/examples/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
});

const codeFor = (name: string) =>
  sources[`../components/examples/${name}.tsx`] ?? `// ${name}.tsx`;

const groups = [
  {
    title: "LevelMeter",
    examples: [
      ["level-meter-demo", () => <LevelMeterDemo />],
      ["level-meter-simple", () => <LevelMeterSimple />],
      ["level-meter-values", () => <LevelMeterValues />],
      ["level-meter-vertical", () => <LevelMeterVertical />],
      ["level-meter-variants", () => <LevelMeterVariants />],
      ["level-meter-dual", () => <LevelMeterDual />],
      ["level-meter-ballistics", () => <LevelMeterBallistics />],
      ["level-meter-custom-colors", () => <LevelMeterCustomColors />],
      ["level-meter-css-level", () => <LevelMeterCssLevel />],
      ["level-meter-microphone", () => <LevelMeterMicrophone />],
    ] as const,
  },
  {
    title: "DbReadout",
    examples: [
      ["db-readout-demo", () => <DbReadoutDemo />],
      ["db-readout-zones", () => <DbReadoutZones />],
    ] as const,
  },
  {
    title: "DbScale",
    examples: [
      ["db-scale-demo", () => <DbScaleDemo />],
      ["db-scale-vertical", () => <DbScaleVertical />],
    ] as const,
  },
  {
    title: "ClipIndicator",
    examples: [
      ["clip-indicator-demo", () => <ClipIndicatorDemo />],
      ["clip-indicator-latching", () => <ClipIndicatorLatching />],
    ] as const,
  },
];

export interface AppProps {
  runtime?: "solid-1" | "solid-2";
}

export const App = (props: AppProps) => (
  <main
    class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8"
    data-runtime={props.runtime ?? "solid-1"}
  >
    <header class="mb-12 grid gap-2">
      <h1 class="font-heading text-3xl font-semibold">audiocn Solid</h1>
      <p class="text-muted-foreground max-w-2xl text-sm">
        Solid ports rendered through the same examples used by the upstream
        audiocn component docs.
      </p>
    </header>

    <For each={groups}>
      {(group) => (
        <section class="mb-14" data-example-group={group.title}>
          <h2 class="font-heading text-2xl font-semibold">{group.title}</h2>
          <For each={group.examples}>
            {([name, render]) => (
              <article data-example={name}>
                <h3 class="text-muted-foreground mt-6 font-mono text-xs">
                  {name}
                </h3>
                <ComponentPreview code={codeFor(name)}>
                  {render()}
                </ComponentPreview>
              </article>
            )}
          </For>
        </section>
      )}
    </For>
  </main>
);
