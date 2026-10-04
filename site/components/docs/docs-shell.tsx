import { For, Show, createSignal, onCleanup, onSettled } from "solid-js";
import type { JSX } from "@solidjs/web";

import { SidebarControls } from "@/site/components/docs/sidebar-controls";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { SiteHeader } from "@/site/components/docs/site-header";
import { DOCS_NAVIGATION } from "@/site/lib/docs/navigation";

interface DocsShellProps {
  children: JSX.Element;
  currentPath: string;
  description: string;
  title: string;
}

const DocsNavigation = (props: { currentPath: string }) => (
  <nav aria-label="Documentation" class="grid gap-6">
    <For each={DOCS_NAVIGATION}>
      {(area) => (
        <section class="grid gap-2">
          <h2 class="text-foreground px-2 text-sm font-semibold">
            {area.label}
          </h2>

          <div class="grid gap-3">
            <For each={area.groups}>
              {(group) => (
                <div class="grid gap-1">
                  <Show when={group.label}>
                    <h3 class="text-muted-foreground px-2 pt-1 text-xs font-medium">
                      {group.label}
                    </h3>
                  </Show>

                  <For each={group.items}>
                    {(item) => {
                      const current = () => item.href === props.currentPath;

                      return (
                        <a
                          aria-current={current() ? "page" : undefined}
                          class="hover:bg-muted hover:text-foreground aria-[current=page]:bg-muted aria-[current=page]:text-foreground text-muted-foreground rounded-md px-2 py-1.5 text-sm transition-colors"
                          href={item.href}
                        >
                          {item.label}
                        </a>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </div>
        </section>
      )}
    </For>
  </nav>
);

export const DocsShell = (props: DocsShellProps) => (
  <DocsShellContent {...props} />
);

interface TocHeading {
  id: string;
  level: number;
  title: string;
}

const DocsShellContent = (props: DocsShellProps) => {
  const [collapsed, setCollapsed] = createSignal(false);
  const [headings, setHeadings] = createSignal<TocHeading[]>([]);
  const [activeHeading, setActiveHeading] = createSignal("");

  onSettled(() => {
    const nodes = [
      ...document.querySelectorAll<HTMLElement>(
        ".docs-article h2[id], .docs-article h3[id]"
      ),
    ];

    const values = nodes.map((node) => ({
      id: node.id,
      level: Number(node.tagName.slice(1)),
      title: node.textContent?.trim() ?? "",
    }));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top
          )[0];

        if (
          visible &&
          visible.target instanceof HTMLElement
        ) {
          setActiveHeading(visible.target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px" }
    );

    setHeadings(values);
    setActiveHeading(values[0]?.id ?? "");
    nodes.forEach((node) => observer.observe(node));
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="flex min-h-svh flex-col">
      <SiteHeader />

      <div
        class={`mx-auto grid w-full max-w-7xl flex-1 ${collapsed() ? "md:grid-cols-[minmax(0,1fr)]" : "md:grid-cols-[15rem_minmax(0,1fr)]"}`}
      >
        <Show when={!collapsed()}>
          <aside class="hidden border-r md:block">
            <div class="sticky top-14 grid max-h-[calc(100svh-3.5rem)] grid-rows-[auto_auto_1fr_auto] gap-5 overflow-y-auto px-4 py-6">
              <a
                class="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-3"
                href="/"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  class="size-7 dark:invert"
                  height="28"
                  src="/brand/logo.svg"
                  width="28"
                />
                <span class="font-heading text-base font-semibold">audiocn</span>
                <span class="text-muted-foreground text-xs">Solid</span>
              </a>
              <button
                class="text-muted-foreground hover:bg-muted hover:text-foreground flex h-9 items-center justify-between rounded-md border px-3 text-sm"
                onClick={() =>
                  window.dispatchEvent(new Event("audiocn-open-search"))
                }
                type="button"
              >
                Search docs <kbd class="font-mono text-[10px]">⌘K</kbd>
              </button>
              <DocsNavigation currentPath={props.currentPath} />
              <SidebarControls />
            </div>
          </aside>
        </Show>

        <div class="min-w-0">
          <details class="border-b px-4 py-3 md:hidden">
            <summary class="cursor-pointer text-sm font-medium">
              Documentation navigation
            </summary>
            <div class="grid gap-5 pt-4">
              <DocsNavigation currentPath={props.currentPath} />
              <SidebarControls />
            </div>
          </details>

          <div class="flex items-center border-b px-4 py-2 md:border-0">
            <button
              aria-label={collapsed() ? "Show documentation sidebar" : "Hide documentation sidebar"}
              class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md px-2 py-1 text-sm"
              onClick={() => setCollapsed((value) => !value)}
              type="button"
            >
              {collapsed() ? "Show sidebar" : "Hide sidebar"}
            </button>
          </div>

          <main class="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_12rem] lg:gap-12 lg:px-10 lg:py-10">
            <div class="min-w-0">
              <header class="mb-8 grid gap-3">
                <h1 class="font-heading text-4xl font-semibold tracking-tight">
                  {props.title}
                </h1>
                <p class="text-muted-foreground max-w-2xl text-base">
                  {props.description}
                </p>
              </header>
              <article class="docs-article prose max-w-none">
                {props.children}
              </article>
            </div>
            <Show when={headings().length > 0}>
              <aside class="hidden lg:block">
                <nav
                  aria-label="On this page"
                  class="sticky top-20 grid gap-2 text-sm"
                >
                  <h2 class="text-foreground font-medium">On this page</h2>
                  <For each={headings()}>
                    {(heading) => (
                      <a
                        aria-current={
                          activeHeading() === heading.id ? "location" : undefined
                        }
                        class={`text-muted-foreground hover:text-foreground aria-[current=location]:text-foreground border-l py-1 transition-colors ${heading.level === 3 ? "pl-5" : "pl-3"}`}
                        href={`#${heading.id}`}
                      >
                        {heading.title}
                      </a>
                    )}
                  </For>
                </nav>
              </aside>
            </Show>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
};
