import { For, Show } from "solid-js";
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
  <div class="flex min-h-svh flex-col">
    <SiteHeader />

    <div class="mx-auto grid w-full max-w-7xl flex-1 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside class="hidden border-r md:block">
        <div class="sticky top-14 grid max-h-[calc(100svh-3.5rem)] gap-6 overflow-y-auto px-4 py-6">
          <DocsNavigation currentPath={props.currentPath} />
          <SidebarControls />
        </div>
      </aside>

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

        <main class="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <header class="grid gap-3">
            <h1 class="font-heading text-4xl font-semibold tracking-tight">
              {props.title}
            </h1>
            <p class="text-muted-foreground max-w-2xl text-base">
              {props.description}
            </p>
          </header>

          <article class="prose max-w-none">{props.children}</article>
        </main>
      </div>
    </div>

    <SiteFooter />
  </div>
);
