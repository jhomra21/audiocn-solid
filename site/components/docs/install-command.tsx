import { For, Show, createSignal, onSettled } from "solid-js";

import {
  Tabs as CommandTabs,
  TabsList as CommandTabsList,
  TabsTrigger as CommandTab,
  TabsContent as CommandContent,
} from "@/components/ui/tabs";
import { CopyFeedback } from "@/site/components/docs/copy-feedback";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";
import { createCopyFeedback } from "@/site/lib/docs/copy-feedback";

const INSTALL_COPY_BUTTON_CLASS =
  "hover:text-accent-foreground data-copied:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md p-1 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4 [&_svg:not([class*='size-'])]:size-3.5";

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
