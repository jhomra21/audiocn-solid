import { For } from "solid-js";
import type { JSX } from "@solidjs/web";

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
import levelMeterSource from "@/components/ui/level-meter.tsx?raw";

interface ChildrenProps {
  children?: JSX.Element;
}

interface CalloutProps extends ChildrenProps {
  title?: string;
}

export const Callout = (props: CalloutProps) => (
  <aside
    class="my-4 rounded-lg border bg-muted/30 p-4"
    data-docs-component="callout"
  >
    {props.title ? <strong>{props.title}</strong> : null}
    <div>{props.children}</div>
  </aside>
);

export const Steps = (props: ChildrenProps) => (
  <ol class="my-4 grid gap-3" data-docs-component="steps">
    {props.children}
  </ol>
);

export const Step = (props: ChildrenProps) => (
  <li class="rounded-lg border p-4" data-docs-component="step">
    {props.children}
  </li>
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
  <section class="rounded-lg border p-3" data-docs-component="tab" data-value={props.value}>
    {props.children}
  </section>
);

type ExampleName = keyof typeof examples;

const examples = {
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

interface ComponentPreviewProps {
  name: string;
}

export const ComponentPreview = (props: ComponentPreviewProps) => {
  if (!isExampleName(props.name)) {
    return (
      <div data-docs-component="component-preview" data-missing={props.name}>
        Missing example: {props.name}
      </div>
    );
  }

  const Example = examples[props.name];

  return (
    <section
      class="my-4 rounded-xl border p-6"
      data-docs-component="component-preview"
      data-example={props.name}
    >
      <Example />
    </section>
  );
};

interface ComponentSourceProps {
  path: string;
  title?: string;
}

export const ComponentSource = (props: ComponentSourceProps) => (
  <section class="my-4 grid gap-2" data-docs-component="component-source">
    <strong>{props.title ?? props.path}</strong>
    <pre class="max-h-80 overflow-auto rounded-lg border p-4">
      <code>{levelMeterSource}</code>
    </pre>
  </section>
);

interface InstallCommandProps {
  command: string;
}

const packageCommands = (command: string) => [
  ["npm", command],
  ["pnpm", command.replace(/^npx /, "pnpm dlx ")],
  ["yarn", command.replace(/^npx /, "yarn dlx ")],
  ["bun", command.replace(/^npx /, "bunx ")],
] as const;

export const InstallCommand = (props: InstallCommandProps) => (
  <div class="my-4 grid gap-2" data-docs-component="install-command">
    <For each={packageCommands(props.command)}>
      {([manager, command]) => (
        <div class="grid grid-cols-[4rem_1fr] gap-2 rounded-lg border p-2">
          <span class="text-muted-foreground font-mono text-xs">{manager}</span>
          <code>{command}</code>
        </div>
      )}
    </For>
  </div>
);

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
              <td><code>{row[0]}</code></td>
              <td><code>{row[1]}</code></td>
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
              <td><code>{name}</code></td>
              <td><code>{entry.type}</code></td>
              <td>{entry.default ?? ""}</td>
              <td>{entry.description ?? ""}</td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  </div>
);
