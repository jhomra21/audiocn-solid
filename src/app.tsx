import { For } from "solid-js";

import { ComponentPreview } from "@/components/docs/component-preview";
import { ClipIndicatorDemo } from "@/examples/clip-indicator-demo";
import { ClipIndicatorLatching } from "@/examples/clip-indicator-latching";
import { DbReadoutDemo } from "@/examples/db-readout-demo";
import { DbReadoutZones } from "@/examples/db-readout-zones";
import { DbScaleDemo } from "@/examples/db-scale-demo";
import { DbScaleVertical } from "@/examples/db-scale-vertical";
import { LevelMeterBallistics } from "@/examples/level-meter-ballistics";
import { LevelMeterCssLevel } from "@/examples/level-meter-css-level";
import { LevelMeterCustomColors } from "@/examples/level-meter-custom-colors";
import { LevelMeterDemo } from "@/examples/level-meter-demo";
import { LevelMeterDual } from "@/examples/level-meter-dual";
import { LevelMeterMicrophone } from "@/examples/level-meter-microphone";
import { LevelMeterSimple } from "@/examples/level-meter-simple";
import { LevelMeterValues } from "@/examples/level-meter-values";
import { LevelMeterVariants } from "@/examples/level-meter-variants";
import { LevelMeterVertical } from "@/examples/level-meter-vertical";

const sources = import.meta.glob("../examples/*.tsx", {
  eager: true,
  import: "default",
  query: "?raw",
}) as Record<string, string>;

const codeFor = (name: string) =>
  sources[`../examples/${name}.tsx`] ?? `// ${name}.tsx`;

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
    className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8"
    data-runtime={props.runtime ?? "solid-1"}
  >
    <header className="mb-12 grid gap-2">
      <h1 className="font-heading text-3xl font-semibold">audiocn Solid</h1>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Solid ports rendered through the same examples used by the upstream
        audiocn component docs.
      </p>
    </header>

    <For each={groups}>
      {(group) => (
        <section className="mb-14" data-example-group={group.title}>
          <h2 className="font-heading text-2xl font-semibold">{group.title}</h2>
          <For each={group.examples}>
            {([name, render]) => (
              <article data-example={name}>
                <h3 className="text-muted-foreground mt-6 font-mono text-xs">
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
