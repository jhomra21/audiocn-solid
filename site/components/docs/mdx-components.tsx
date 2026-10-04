import { Errored, For, createSignal } from "solid-js";
import type { ComponentProps, JSX } from "@solidjs/web";

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


export const MdxA = (props: ComponentProps<"a">) => <a {...props} />;

export const MdxBlockquote = (props: ComponentProps<"blockquote">) => (
  <blockquote {...props} />
);

export const MdxCode = (props: ComponentProps<"code">) => <code {...props} />;

export const MdxEm = (props: ComponentProps<"em">) => <em {...props} />;

export const MdxH1 = (props: ComponentProps<"h1">) => <h1 {...props} />;

export const MdxH2 = (props: ComponentProps<"h2">) => <h2 {...props} />;

export const MdxH3 = (props: ComponentProps<"h3">) => <h3 {...props} />;

export const MdxH4 = (props: ComponentProps<"h4">) => <h4 {...props} />;

export const MdxHr = (props: ComponentProps<"hr">) => <hr {...props} />;

export const MdxImg = (props: ComponentProps<"img">) => <img {...props} />;

export const MdxLi = (props: ComponentProps<"li">) => <li {...props} />;

export const MdxOl = (props: ComponentProps<"ol">) => <ol {...props} />;

export const MdxP = (props: ComponentProps<"p">) => <p {...props} />;

export const MdxPre = (props: ComponentProps<"pre">) => <pre {...props} />;

export const MdxSpan = (props: ComponentProps<"span">) => <span {...props} />;

export const MdxStrong = (props: ComponentProps<"strong">) => (
  <strong {...props} />
);

export const MdxTable = (props: ComponentProps<"table">) => <table {...props} />;

export const MdxTbody = (props: ComponentProps<"tbody">) => <tbody {...props} />;

export const MdxTd = (props: ComponentProps<"td">) => <td {...props} />;

export const MdxTh = (props: ComponentProps<"th">) => <th {...props} />;

export const MdxThead = (props: ComponentProps<"thead">) => <thead {...props} />;

export const MdxTr = (props: ComponentProps<"tr">) => <tr {...props} />;

export const MdxUl = (props: ComponentProps<"ul">) => <ul {...props} />;

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

  return (
    <section
      class="my-4 overflow-hidden rounded-lg border"
      data-docs-component="install-command"
    >
      <div class="flex items-center gap-1 border-b px-2 py-2">
        <For each={commands}>
          {([manager]) => (
            <button
              aria-pressed={selected() === manager ? "true" : "false"}
              class="aria-[pressed=true]:bg-muted rounded-md px-3 py-1.5 text-xs"
              onClick={() => setSelected(manager)}
              type="button"
            >
              {manager}
            </button>
          )}
        </For>
        <button
          aria-label="Copy install command"
          class="text-muted-foreground ml-auto rounded-md px-2 py-1 text-xs"
          onClick={() => void navigator.clipboard.writeText(current()[1])}
          type="button"
        >
          Copy
        </button>
      </div>
      <pre class="overflow-x-auto p-4">
        <code>$ {current()[1]}</code>
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
