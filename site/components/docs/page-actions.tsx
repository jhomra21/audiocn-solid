import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import { Show, createSignal, onCleanup } from "solid-js";

import { Button, buttonVariants } from "@/components/ui/button";
import { CheckIcon } from "@/site/components/docs/icons";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";

const documents = new Map<string, Promise<string>>();

const fetchText = (url: string): Promise<string> => {
  const cached = documents.get(url);

  if (cached) return cached;

  const pending = fetch(url)
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Failed to fetch ${url}: ${response.status}`);

      return await response.text();
    })
    .catch((error) => {
      documents.delete(url);
      throw error;
    });

  documents.set(url, pending);

  return pending;
};

interface RegistrySource {
  files: { content: string }[];
}

const isRegistrySource = (payload: unknown): payload is RegistrySource =>
  typeof payload === "object" &&
  payload !== null &&
  "files" in payload &&
  Array.isArray(payload.files) &&
  typeof payload.files[0] === "object" &&
  payload.files[0] !== null &&
  "content" in payload.files[0] &&
  typeof payload.files[0].content === "string";

const fetchRegistrySource = async (url: string) => {
  const payload: unknown = JSON.parse(await fetchText(url));

  if (!isRegistrySource(payload)) throw new Error(`No source in ${url}`);

  return payload.files[0]!.content;
};

/** Start the async clipboard write in the user gesture (Safari also requires it). */
const writeClipboard = async (text: string | Promise<string>) => {
  if (
    isString(text) ||
    !("ClipboardItem" in window) ||
    !navigator.clipboard?.write
  ) {
    await navigator.clipboard.writeText(await text);
  } else {
    const blob = text.then(
      (value) => new Blob([value], { type: "text/plain" })
    );

    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": blob }),
    ]);
  }
};

const isString = (
  value: string | Promise<string> | (() => Promise<string>)
): value is string => typeof value === "string";

const commandForManager = (command: string) => {
  let manager = "pnpm";

  try {
    const saved = localStorage.getItem("packageManager");

    if (saved) manager = saved.startsWith('"') ? JSON.parse(saved) : saved;
  } catch {
    // The default remains usable when storage is unavailable.
  }

  const prefixes = new Map([
    ["pnpm", "pnpm dlx "],
    ["yarn", "yarn dlx "],
    ["bun", "bunx --bun "],
  ]);

  return command.replace(/^npx /u, prefixes.get(manager) ?? "npx ");
};

const chatUrl = (base: string, params: Record<string, string>) =>
  `${base}?${new URLSearchParams(params).toString()}`;

const ITEM_CLASS =
  "data-highlighted:bg-accent data-highlighted:text-accent-foreground flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none [&_svg]:size-4";

export interface PageActionsProps {
  title: string;
  markdownUrl: string;
  registryUrl: string;
  sourceUrl: string;
  installCommand: string;
  compactPrompt: string;
}

export const PageActions = (props: PageActionsProps) => {
  const [state, setState] = createSignal<"idle" | "done" | "error">("idle");
  const [message, setMessage] = createSignal("");
  let reset: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(reset));

  const run = async (
    success: string,
    read: string | (() => Promise<string>)
  ) => {
    clearTimeout(reset);

    try {
      await writeClipboard(isString(read) ? read : read());
      setState("done");
      setMessage(success);
    } catch {
      setState("error");
      setMessage("Could not copy to clipboard");
    }

    reset = setTimeout(() => setState("idle"), 1500);
  };

  const copyPrompt = () =>
    void run(`Prompt for ${props.title} copied`, () =>
      fetchText(props.markdownUrl)
    );

  const prefetch = () => {
    void fetchText(props.markdownUrl).catch(() => undefined);
  };

  return (
    <div class="not-prose mb-6 flex items-center gap-1" data-page-actions>
      <Button
        size="sm"
        variant="secondary"
        onClick={copyPrompt}
        onFocus={prefetch}
        onMouseEnter={prefetch}
        type="button"
      >
        <Show
          when={state() !== "idle"}
          fallback={<DocsIcon class="size-4" name="Sparkle" />}
        >
          <Show
            when={state() === "done"}
            fallback={
              <svg
                aria-hidden="true"
                data-slot="error-icon"
                class="size-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="m9 9 6 6m-6 0 6-6" />
              </svg>
            }
          >
            <CheckIcon data-slot="done-icon" class="size-4" />
          </Show>
        </Show>
        Copy prompt for AI
      </Button>
      <DropdownMenu placement="bottom-start">
        <DropdownMenu.Trigger
          aria-label="More actions for AI agents"
          class={buttonVariants({ size: "icon-sm", variant: "secondary" })}
          data-slot="dropdown-menu-trigger"
        >
          <DocsIcon name="CaretDown" />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content class="bg-popover text-popover-foreground z-100 w-64 rounded-lg border p-1 shadow-md outline-none">
            <DropdownMenu.Item class={ITEM_CLASS} onSelect={copyPrompt}>
              <DocsIcon name="Sparkle" />
              Copy prompt for AI
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={ITEM_CLASS}
              onSelect={() =>
                void run(
                  "Install command copied",
                  commandForManager(props.installCommand)
                )
              }
            >
              <DocsIcon name="Terminal" />
              Copy install command
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={ITEM_CLASS}
              onSelect={() =>
                void run("Component source copied", () =>
                  fetchRegistrySource(props.sourceUrl)
                )
              }
            >
              <DocsIcon name="FileTs" />
              Copy component source
            </DropdownMenu.Item>
            <DropdownMenu.Item
              as="a"
              class={ITEM_CLASS}
              href={props.markdownUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              <DocsIcon name="MarkdownLogo" />
              View as Markdown
            </DropdownMenu.Item>
            <DropdownMenu.Separator class="bg-border my-1 h-px" />
            <DropdownMenu.Item
              as="a"
              class={ITEM_CLASS}
              href={chatUrl("https://chatgpt.com/", {
                hints: "search",
                prompt: props.compactPrompt,
              })}
              target="_blank"
              rel="noreferrer noopener"
            >
              <DocsIcon name="OpenAiLogo" />
              Open in ChatGPT
            </DropdownMenu.Item>
            <DropdownMenu.Item
              as="a"
              class={ITEM_CLASS}
              href={chatUrl("https://claude.ai/new", {
                q: props.compactPrompt,
              })}
              target="_blank"
              rel="noreferrer noopener"
            >
              <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z" />
              </svg>
              Open in Claude
            </DropdownMenu.Item>
            <DropdownMenu.Item
              as="a"
              class={ITEM_CLASS}
              href={chatUrl("https://v0.dev/chat/api/open", {
                url: props.registryUrl,
              })}
              target="_blank"
              rel="noreferrer noopener"
            >
              <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1 24 22H0Z" />
              </svg>
              Open in v0
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu>
      <span
        role="status"
        class={
          message()
            ? "bg-popover text-popover-foreground fixed right-4 bottom-4 z-100 rounded-lg border px-4 py-3 text-sm shadow-md"
            : "sr-only"
        }
      >
        {message()}
      </span>
    </div>
  );
};
