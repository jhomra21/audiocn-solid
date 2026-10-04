import { For, Show, createSignal, onCleanup, onSettled } from "solid-js";
import type { JSX } from "@solidjs/web";

import {
  ChevronDownIcon,
  PanelLeftIcon,
  SearchIcon,
  TextAlignStartIcon,
} from "@/site/components/docs/icons";
import { SiteSearch, openSearch } from "@/site/components/docs/search-dialog";
import { SidebarControls } from "@/site/components/docs/sidebar-controls";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { DOCS_NAVIGATION } from "@/site/lib/docs/navigation";

interface DocsShellProps {
  children: JSX.Element;
  currentPath: string;
  description: string;
  title: string;
}

interface TocHeading {
  id: string;
  level: number;
  title: string;
}

const SECTION_LINKS = [
  { href: "/docs/components", label: "Components" },
  { href: "/docs/blocks", label: "Blocks" },
] as const;

const ICON_BUTTON_CLASS =
  "text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md p-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4.5";

const NAV_LINK_CLASS =
  "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground/80 aria-[current]:bg-primary/10 aria-[current]:text-primary relative flex items-center gap-2 rounded-lg p-2 text-start wrap-anywhere transition-colors hover:transition-none";

const NAV_SEPARATOR_CLASS =
  "mt-6 mb-1 inline-flex items-center gap-2 px-2 first:mt-0";

const revealCurrentLink = (viewport: HTMLDivElement) => {
  onSettled(() => {
    const current = viewport.querySelector("[aria-current=page]");

    if (!current) {
      return;
    }

    const link = current.getBoundingClientRect();
    const container = viewport.getBoundingClientRect();

    if (link.top < container.top || link.bottom > container.bottom) {
      viewport.scrollTop +=
        link.top - container.top - (container.height - link.height) / 2;
    }
  });
};

const Brand = () => (
  <a
    class="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium select-none"
    href="/"
  >
    <span class="font-heading inline-flex items-center gap-1 font-semibold tracking-tight">
      <img
        alt=""
        aria-hidden="true"
        class="size-6 shrink-0 dark:invert"
        height="24"
        src="/brand/logo.svg"
        width="24"
      />
      audiocn
      <span class="text-muted-foreground ms-1 text-xs font-normal">Solid</span>
    </span>
  </a>
);

const DocsNavigation = (props: { currentPath: string }) => (
  <nav aria-label="Documentation" class="flex flex-col gap-0.5">
    <div class="mb-4 flex flex-col gap-0.5">
      <For each={SECTION_LINKS}>
        {(link) => (
          <a
            class={NAV_LINK_CLASS}
            aria-current={
              props.currentPath.startsWith(link.href) ? "true" : undefined
            }
            href={link.href}
          >
            {link.label}
          </a>
        )}
      </For>
    </div>

    <For each={DOCS_NAVIGATION}>
      {(area) => (
        <>
          <p class={NAV_SEPARATOR_CLASS}>{area.label}</p>
          <For each={area.groups}>
            {(group) => (
              <>
                <Show when={group.label}>
                  <p class={NAV_SEPARATOR_CLASS}>{group.label}</p>
                </Show>
                <For each={group.items}>
                  {(item) => {
                    const current = () => item.href === props.currentPath;

                    return (
                      <a
                        aria-current={current() ? "page" : undefined}
                        class={NAV_LINK_CLASS}
                        href={item.href}
                      >
                        {item.label}
                      </a>
                    );
                  }}
                </For>
              </>
            )}
          </For>
        </>
      )}
    </For>
  </nav>
);

const TableOfContents = (props: { active: string; headings: TocHeading[] }) => (
  <div class="flex flex-col">
    <For each={props.headings}>
      {(heading) => (
        <a
          aria-current={props.active === heading.id ? "location" : undefined}
          class={`text-muted-foreground hover:text-accent-foreground aria-[current=location]:text-primary aria-[current=location]:before:bg-primary before:bg-border relative py-1.5 text-sm wrap-anywhere transition-colors before:absolute before:inset-y-0 before:w-px ${heading.level === 3 ? "ps-8 before:start-4" : "ps-5 before:start-2"}`}
          href={`#${heading.id}`}
        >
          {heading.title}
        </a>
      )}
    </For>
  </div>
);

export const DocsShell = (props: DocsShellProps) => {
  const [collapsed, setCollapsed] = createSignal(false);
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [tocOpen, setTocOpen] = createSignal(false);
  const [headings, setHeadings] = createSignal<TocHeading[]>([]);
  const [activeHeading, setActiveHeading] = createSignal("");

  const activeTitle = () =>
    headings().find((heading) => heading.id === activeHeading())?.title ??
    props.title;

  const tocProgress = () => {
    const index = headings().findIndex(
      (heading) => heading.id === activeHeading(),
    );

    return headings().length > 0 ? (index + 1) / headings().length : 0;
  };

  onSettled(() => {
    // MDX headings only; headings rendered inside example previews stay out.
    const nodes = [
      ...document.querySelectorAll<HTMLElement>("[data-docs-heading]"),
    ].filter((node) => node.tagName === "H2" || node.tagName === "H3");

    const values = nodes.map((node) => ({
      id: node.id,
      level: Number(node.tagName.slice(1)),
      title: node.querySelector("a")?.textContent?.trim() ?? "",
    }));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) =>
              left.boundingClientRect.top - right.boundingClientRect.top,
          )[0];

        if (visible && visible.target instanceof HTMLElement) {
          setActiveHeading(visible.target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px" },
    );

    setHeadings(values);
    setActiveHeading(values[0]?.id ?? "");
    nodes.forEach((node) => observer.observe(node));
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <div
        class={`grid [--fd-sidebar-width:0px] [--fd-toc-width:0px] xl:[--fd-toc-width:268px] ${collapsed() ? "" : "md:[--fd-sidebar-width:268px]"}`}
        data-sidebar-collapsed={collapsed() ? "true" : "false"}
        id="nd-docs-layout"
        style={{
          "grid-template": `"sidebar sidebar header toc toc" auto "sidebar sidebar toc-popover toc toc" auto "sidebar sidebar main toc toc" 1fr / minmax(0, 1fr) var(--fd-sidebar-width) minmax(0, calc(97rem - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(0, 1fr)`,
        }}
      >
        <header class="bg-background/80 sticky top-0 z-30 flex h-14 items-center border-b ps-4 pe-2.5 backdrop-blur-sm [grid-area:header] md:hidden">
          <Brand />
          <button
            aria-label="Open Search"
            class={`${ICON_BUTTON_CLASS} p-2`}
            onClick={openSearch}
            type="button"
          >
            <SearchIcon />
          </button>
          <button
            aria-controls="docs-sidebar-mobile"
            aria-expanded={mobileOpen() ? "true" : "false"}
            aria-label="Open Sidebar"
            class={`${ICON_BUTTON_CLASS} p-2`}
            onClick={() => setMobileOpen(true)}
            type="button"
          >
            <PanelLeftIcon />
          </button>
        </header>

        <Show when={!collapsed()}>
          <div class="sticky top-0 z-20 h-dvh [grid-area:sidebar] max-md:hidden">
            <aside class="bg-sidebar text-sidebar-foreground absolute inset-y-0 start-0 flex w-full flex-col items-end border-e text-sm *:w-(--fd-sidebar-width)">
              <div class="flex flex-col gap-3 p-4 pb-2">
                <div class="flex">
                  <Brand />
                  <button
                    aria-label="Collapse Sidebar"
                    class={`${ICON_BUTTON_CLASS} mb-auto`}
                    onClick={() => setCollapsed(true)}
                    type="button"
                  >
                    <PanelLeftIcon />
                  </button>
                </div>
                <button
                  aria-label="Search docs"
                  class="bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex items-center gap-2 rounded-lg border p-1.5 ps-2 text-sm transition-colors"
                  onClick={openSearch}
                  type="button"
                >
                  <SearchIcon class="size-4" />
                  Search
                  <span class="ms-auto inline-flex gap-0.5">
                    <kbd class="bg-background rounded-md border px-1.5">⌘</kbd>
                    <kbd class="bg-background rounded-md border px-1.5">K</kbd>
                  </span>
                </button>
              </div>
              <div
                class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [scrollbar-width:none] mask-[linear-gradient(to_bottom,transparent,white_12px,white_calc(100%-12px),transparent)]"
                ref={revealCurrentLink}
              >
                <DocsNavigation currentPath={props.currentPath} />
              </div>
              <div class="flex flex-col p-4 pt-2">
                <div class="text-muted-foreground bg-secondary/50 flex items-center rounded-lg border p-0.5 pe-0">
                  <SidebarControls />
                </div>
              </div>
            </aside>
          </div>
        </Show>

        <Show when={collapsed()}>
          <div class="bg-muted text-muted-foreground fixed start-4 top-4 z-10 flex rounded-xl border p-0.5 shadow-lg max-md:hidden">
            <button
              aria-label="Expand Sidebar"
              class={`${ICON_BUTTON_CLASS} rounded-lg`}
              onClick={() => setCollapsed(false)}
              type="button"
            >
              <PanelLeftIcon />
            </button>
            <button
              aria-label="Search docs"
              class={`${ICON_BUTTON_CLASS} rounded-lg`}
              onClick={openSearch}
              type="button"
            >
              <SearchIcon />
            </button>
          </div>
        </Show>

        <Show when={headings().length > 0}>
          <div class="sticky top-14 z-10 [grid-area:toc-popover] md:top-0 xl:hidden">
            <div class="bg-background/80 border-b backdrop-blur-sm">
              <button
                aria-expanded={tocOpen() ? "true" : "false"}
                class="text-muted-foreground flex h-10 w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm md:px-6 [&_svg]:size-4"
                onClick={() => setTocOpen((open) => !open)}
                type="button"
              >
                <svg aria-hidden="true" class="shrink-0" viewBox="0 0 18 18">
                  <circle
                    class="stroke-border"
                    cx="9"
                    cy="9"
                    fill="none"
                    r="7"
                    stroke-width="2"
                  />
                  <circle
                    class="stroke-primary -rotate-90 origin-center transition-all"
                    cx="9"
                    cy="9"
                    fill="none"
                    pathLength="1"
                    r="7"
                    stroke-dasharray={`${tocProgress()} 1`}
                    stroke-width="2"
                  />
                </svg>
                <span class="flex-1 truncate">
                  {tocOpen() ? props.title : activeTitle()}
                </span>
                <ChevronDownIcon
                  class={`mx-0.5 shrink-0 transition-transform ${tocOpen() ? "rotate-180" : ""}`}
                />
              </button>
              <Show when={tocOpen()}>
                <div class="max-h-[50dvh] overflow-y-auto px-4 pb-4 md:px-6">
                  <TableOfContents
                    active={activeHeading()}
                    headings={headings()}
                  />
                </div>
              </Show>
            </div>
          </div>
        </Show>

        <main class="grid justify-items-center [grid-area:main]">
          <article class="flex w-full max-w-[900px] min-w-0 flex-col gap-4 px-4 py-6 md:px-6 md:pt-8 xl:px-8 xl:pt-14 md:in-data-[sidebar-collapsed=true]:pt-16 xl:in-data-[sidebar-collapsed=true]:pt-14">
            <h1 class="text-[1.75em] font-semibold">{props.title}</h1>
            <p class="text-muted-foreground mb-8 text-lg">
              {props.description}
            </p>
            <div class="docs-article prose flex-1">{props.children}</div>
          </article>
        </main>

        <Show when={headings().length > 0}>
          <div class="sticky top-0 flex h-dvh w-(--fd-toc-width) flex-col pe-4 pt-12 pb-2 [grid-area:toc] max-xl:hidden">
            <nav aria-label="On this page" class="flex min-h-0 flex-col">
              <h2 class="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                <TextAlignStartIcon class="size-4" />
                On this page
              </h2>
              <div class="ms-px min-h-0 overflow-auto overscroll-contain py-3 [scrollbar-width:none] mask-[linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)]">
                <TableOfContents
                  active={activeHeading()}
                  headings={headings()}
                />
              </div>
            </nav>
          </div>
        </Show>
      </div>

      <Show when={mobileOpen()}>
        <div
          class="bg-foreground/20 fixed inset-0 z-40 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
        <aside
          class="bg-background fixed inset-y-0 end-0 z-40 flex w-[85%] max-w-[380px] flex-col border-s text-[0.9375rem] shadow-lg md:hidden"
          id="docs-sidebar-mobile"
        >
          <div class="text-muted-foreground flex items-center gap-1.5 p-4 pb-2">
            <SidebarControls />
            <button
              aria-label="Close Sidebar"
              class={`${ICON_BUTTON_CLASS} bg-secondary rounded-lg border`}
              onClick={() => setMobileOpen(false)}
              type="button"
            >
              <PanelLeftIcon />
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
            <DocsNavigation currentPath={props.currentPath} />
          </div>
        </aside>
      </Show>

      <SiteSearch />
      <SiteFooter />
    </div>
  );
};
