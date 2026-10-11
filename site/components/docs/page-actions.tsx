import { DropdownMenu } from "@kobalte/core/dropdown-menu";
import * as Toast from "@kobalte/core/toast";
import { Portal } from "@solidjs/web";
import { createUniqueId, onCleanup } from "solid-js";

import { CheckCircleIcon } from "@/components/icons/phosphor";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyFeedback } from "@/site/components/docs/copy-feedback";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";
import { createCopyFeedback } from "@/site/lib/docs/copy-feedback";

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
  "focus:bg-foreground/10 data-highlighted:bg-foreground/10 flex min-h-7 cursor-default select-none items-center gap-2 rounded-xl px-2 py-1.5 text-sm outline-hidden [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4";

export interface PageActionsProps {
  title: string;
  markdownUrl: string;
  registryUrl: string;
  sourceUrl: string;
  installCommand: string;
  compactPrompt: string;
}

export const PageActions = (props: PageActionsProps) => {
  const regionId = createUniqueId();
  const notifications = new Set<number>();
  let successMessage = "Copied";
  onCleanup(() => {
    for (const id of notifications) Toast.toaster.dismiss(id);
  });

  const notify = (message: string, error = false) => {
    const id = Toast.toaster.show(
      (toast) => {
        onCleanup(() => notifications.delete(toast.toastId));

        return (
          <Toast.Root
            toastId={toast.toastId}
            class="bg-popover text-popover-foreground flex items-center gap-1.5 rounded-(--radius) border p-4 text-[13px] [overflow-wrap:anywhere] shadow-[0_4px_12px_rgb(0_0_0/0.1)] outline-none"
            data-copy-notification={error ? "error" : "success"}
          >
            <span class="mr-1 -ml-[3px] flex size-4 shrink-0 items-center [&_svg]:-ml-px [&_svg]:size-4">
              {error ? (
                <DocsIcon name="XCircle" />
              ) : (
                <CheckCircleIcon aria-hidden="true" />
              )}
            </span>
            <Toast.Title class="text-[13px] leading-[1.5] font-medium">
              {message}
            </Toast.Title>
          </Toast.Root>
        );
      },
      { region: regionId }
    );

    notifications.add(id);
  };

  const [state, copy] = createCopyFeedback(() => fetchText(props.markdownUrl), {
    onCopySuccess: () => notify(successMessage),
    onCopyError: () => notify("Could not copy to clipboard", true),
  });

  const run = async (success: string, read: () => string | Promise<string>) => {
    successMessage = success;
    await copy(read);
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
        <CopyFeedback
          state={state}
          renderIcon={(current) => (
            <DocsIcon
              data-slot={current === "idle" ? undefined : `${current}-icon`}
              name={
                current === "done"
                  ? "Check"
                  : current === "error"
                    ? "XCircle"
                    : "Sparkle"
              }
            />
          )}
        />
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
          <DropdownMenu.Content class="bg-popover/70 text-popover-foreground ring-foreground/5 dark:ring-foreground/10 relative isolate z-100 w-64 overflow-hidden rounded-2xl p-1 shadow-lg ring-1 outline-none before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150">
            <DropdownMenu.Item class={ITEM_CLASS} onSelect={copyPrompt}>
              <DocsIcon name="Sparkle" />
              Copy prompt for AI
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class={ITEM_CLASS}
              onSelect={() =>
                void run("Install command copied", () =>
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
      <Portal>
        <Toast.Region
          regionId={regionId}
          aria-label="Notifications"
          duration={4000}
          limit={3}
          pauseOnInteraction
          pauseOnPageIdle
          swipeDirection="right"
          class="fixed right-6 bottom-6 z-[999999999] w-[356px] outline-none max-[600px]:right-4 max-[600px]:bottom-4 max-[600px]:w-[calc(100%-2rem)]"
          style={{
            "font-family":
              "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif, Apple Color Emoji, Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji",
          }}
        >
          <Toast.List
            data-copy-notifications
            class="m-0 list-none p-0 outline-none"
          />
        </Toast.Region>
      </Portal>
    </div>
  );
};
