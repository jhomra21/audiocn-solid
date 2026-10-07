import type { JSX } from "@solidjs/web";
import { For, Show, createSignal, flush, onCleanup, onSettled } from "solid-js";

import { BrandAssetsMenu } from "@/site/components/docs/brand-assets-menu";
import {
  ChevronDownIcon,
  PanelLeftIcon,
  SearchIcon,
  TextAlignStartIcon,
} from "@/site/components/docs/icons";
import { PageActions } from "@/site/components/docs/page-actions";
import { PageMeta } from "@/site/components/docs/page-meta";
import { SiteSearch, openSearch } from "@/site/components/docs/search-dialog";
import { SidebarControls } from "@/site/components/docs/sidebar-controls";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { buildCompactPrompt, markdownUrlFor } from "@/site/lib/docs/ai-prompt";
import { DOCS_NAVIGATION } from "@/site/lib/docs/navigation";
import metadata from "@/site/lib/docs/page-metadata.json";
import {
  registryItemForPath,
  registryItemPath,
  registryItemUrl,
} from "@/site/lib/docs/registry";
import { lockBodyScroll } from "@/site/lib/docs/scroll-lock";
import { siteConfig } from "@/site/lib/site";

export interface DocsFrontmatter {
  description: string;
  title: string;
  seoDescription?: string;
  seoTitle?: string;
}

interface DocsShellProps {
  children: JSX.Element;
  currentPath: string;
  frontmatter: DocsFrontmatter;
  full?: boolean;
}

const PEEK_EDGE_PX = 100;

const PEEK_LEAVE_DELAY_MS = 500;

const EXAMPLE_PAGE = /^\/docs\/(?:components|blocks)\//;

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

let sidebarScrollTop: number | undefined;

const revealCurrentLink = (viewport: HTMLDivElement) => {
  onSettled(() => {
    if (sidebarScrollTop !== undefined) {
      viewport.scrollTop = sidebarScrollTop;
    }

    const current = viewport.querySelector("[aria-current=page]");

    if (!current) {
      return;
    }

    const link = current.getBoundingClientRect();
    const container = viewport.getBoundingClientRect();

    if (link.top < container.top) {
      viewport.scrollTop += link.top - container.top;
    } else if (link.bottom > container.bottom) {
      viewport.scrollTop += link.bottom - container.bottom;
    }
  });
};

const Brand = () => (
  <BrandAssetsMenu class="me-auto inline-flex items-center gap-2.5 text-[0.9375rem] font-medium select-none">
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
  </BrandAssetsMenu>
);

/**
 * Collapses and expands the desktop sidebar. It is rendered twice, in the
 * sidebar and in the floating panel, and only the copy outside the inert
 * element is reachable, so focus moves to it once the state has flipped.
 */
const SidebarCollapseTrigger = (props: {
  class: string;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <button
    aria-controls="nd-sidebar"
    aria-expanded={props.collapsed ? "false" : "true"}
    aria-label="Collapse Sidebar"
    class={props.class}
    data-collapsed={props.collapsed ? "true" : "false"}
    onClick={(event) => {
      const button = event.currentTarget;

      props.onToggle();
      flush();

      if (button.matches("[inert] *")) {
        document
          .querySelector<HTMLElement>(
            '[aria-controls="nd-sidebar"]:not([inert] *)'
          )
          ?.focus();
      }
    }}
    type="button"
  >
    <PanelLeftIcon />
  </button>
);

const DocsNavigation = (props: {
  currentPath: string;
  onNavigate?: () => void;
}) => (
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
            onClick={props.onNavigate}
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
                        onClick={props.onNavigate}
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

const MobileSidebar = (props: { currentPath: string; onClose: () => void }) => {
  let dialog: HTMLDialogElement | undefined;
  let closeButton: HTMLButtonElement | undefined;

  onSettled(() => {
    const previous = document.activeElement;
    const releaseScroll = lockBodyScroll();
    const desktop = window.matchMedia("(min-width: 48rem)");

    const resize = () => {
      if (desktop.matches) props.onClose();
    };

    dialog?.showModal();
    closeButton?.focus();
    desktop.addEventListener("change", resize);

    return () => {
      desktop.removeEventListener("change", resize);
      dialog?.close();
      releaseScroll();

      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  });

  return (
    <dialog
      aria-label="Documentation navigation"
      class="text-foreground backdrop:bg-foreground/20 fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:backdrop-blur-xs"
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) props.onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          props.onClose();
        } else if (event.key === "Tab") {
          const targets = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href], button:not(:disabled), select:not(:disabled)"
            )
          );

          const index = targets.findIndex(
            (target) => target === document.activeElement
          );

          const next =
            (index + (event.shiftKey ? -1 : 1) + targets.length) %
            targets.length;

          event.preventDefault();
          targets[next]?.focus();
        }
      }}
      ref={(node) => {
        dialog = node;
      }}
    >
      <aside
        class="bg-background fixed inset-y-0 end-0 z-40 flex w-[85%] max-w-[380px] flex-col border-s text-[0.9375rem] shadow-lg md:hidden"
        id="docs-sidebar-mobile"
      >
        <div class="text-muted-foreground flex items-center gap-1.5 p-4 pb-2">
          <SidebarControls />
          <button
            aria-expanded="true"
            aria-label="Close Sidebar"
            class={`${ICON_BUTTON_CLASS} bg-secondary rounded-lg border`}
            onClick={props.onClose}
            ref={(node) => {
              closeButton = node;
            }}
            type="button"
          >
            <PanelLeftIcon />
          </button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <DocsNavigation
            currentPath={props.currentPath}
            onNavigate={props.onClose}
          />
        </div>
      </aside>
    </dialog>
  );
};

const TableOfContents = (props: {
  active: string;
  headings: TocHeading[];
  onNavigate?: (id: string) => void;
}) => (
  <div class="flex flex-col">
    <For each={props.headings}>
      {(heading, index) => (
        <a
          aria-current={props.active === heading.id ? "location" : "false"}
          class={`text-muted-foreground hover:text-accent-foreground aria-[current=location]:text-primary relative py-1.5 text-sm wrap-anywhere transition-colors first:pt-0 last:pb-0 ${heading.level === 3 ? "ps-8" : "ps-5"}`}
          href={`#${heading.id}`}
          onClick={() => props.onNavigate?.(heading.id)}
        >
          <svg
            aria-hidden="true"
            class="pointer-events-none absolute start-0 top-0 h-full w-6 overflow-visible"
            fill="none"
          >
            <path
              class="stroke-foreground/10"
              d={`M ${props.headings[index() - 1]?.level === 3 ? 16.5 : 8.5} 0 C ${props.headings[index() - 1]?.level === 3 ? 16.5 : 8.5} 8 ${heading.level === 3 ? 16.5 : 8.5} 4 ${heading.level === 3 ? 16.5 : 8.5} 12`}
            />
            <line
              class={
                props.active === heading.id
                  ? "stroke-primary"
                  : "stroke-foreground/10"
              }
              x1={heading.level === 3 ? 16.5 : 8.5}
              x2={heading.level === 3 ? 16.5 : 8.5}
              y1="12"
              y2="100%"
            />
          </svg>
          {heading.title}
        </a>
      )}
    </For>
  </div>
);

export const DocsShell = (props: DocsShellProps) => {
  const pages = DOCS_NAVIGATION.flatMap((area) =>
    area.groups.flatMap((group) => group.items)
  );

  const currentIndex = () =>
    pages.findIndex((page) => page.href === props.currentPath);

  const adjacent = () => [pages[currentIndex() - 1], pages[currentIndex() + 1]];

  const pageMetadata: { title: string; description: string; url: string }[] =
    metadata;

  const [collapsed, setCollapsed] = createSignal(false);
  const [hovered, setHovered] = createSignal(false);
  const [mobileOpen, setMobileOpen] = createSignal(false);
  const [tocOpen, setTocOpen] = createSignal(false);
  const [headings, setHeadings] = createSignal<TocHeading[]>([]);
  const [activeHeadings, setActiveHeadings] = createSignal<string[]>([]);
  const activeHeading = () => activeHeadings()[0] ?? "";

  const activeTitle = () =>
    headings().find((heading) => heading.id === activeHeading())?.title ?? "";

  const showTitle = () => tocOpen() || activeTitle() === "";

  // Progress reaches the last heading in view, so a short page that shows
  // several headings at once reports more than its first heading.
  const tocProgress = () =>
    (headings().reduce(
      (last, heading, index) =>
        activeHeadings().includes(heading.id) ? index : last,
      -1
    ) +
      1) /
    Math.max(1, headings().length);

  let sidebar: HTMLElement | undefined;
  let leaveTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (typeof document === "undefined") {
      return;
    }

    const viewport = document.querySelector<HTMLDivElement>(
      "#nd-sidebar [data-docs-navigation-viewport]"
    );

    if (viewport) {
      sidebarScrollTop = viewport.scrollTop;
    }
  });

  onCleanup(() => clearTimeout(leaveTimer));

  const toggleCollapsed = () => {
    const next = !collapsed();

    setCollapsed(next);

    if (next) {
      setHovered(false);
    }
  };

  // A collapsed sidebar peeks in while the pointer is on it or the screen
  // edge. Touch never peeks, and neither does a sidebar mid-transition.
  const ignoresHover = (event: PointerEvent) =>
    !collapsed() ||
    event.pointerType === "touch" ||
    (sidebar?.getAnimations().length ?? 0) > 0;

  const peek = {
    onPointerEnter: (event: PointerEvent) => {
      if (ignoresHover(event)) {
        return;
      }

      clearTimeout(leaveTimer);
      setHovered(true);
    },
    onPointerLeave: (event: PointerEvent) => {
      if (ignoresHover(event)) {
        return;
      }

      clearTimeout(leaveTimer);

      const nearEdge =
        Math.min(event.clientX, document.body.clientWidth - event.clientX) <=
        PEEK_EDGE_PX;

      leaveTimer = setTimeout(
        () => setHovered(false),
        nearEdge ? PEEK_LEAVE_DELAY_MS : 0
      );
    },
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

    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }

        const inView = values.filter((value) => visible.has(value.id));

        // Between headings, the one nearest the top of the viewport stays active.
        const nearest = nodes.reduce((best, node) =>
          Math.abs(node.getBoundingClientRect().top) <
          Math.abs(best.getBoundingClientRect().top)
            ? node
            : best
        );

        setActiveHeadings(
          inView.length > 0 ? inView.map((value) => value.id) : [nearest.id]
        );
      },
      { threshold: 0.9 }
    );

    setHeadings(values);
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  });

  return (
    <div class="flex min-h-0 flex-1 flex-col">
      <PageMeta
        description={
          props.frontmatter.seoDescription ?? props.frontmatter.description
        }
        pathname={props.currentPath}
        title={
          props.frontmatter.seoTitle ??
          (EXAMPLE_PAGE.test(props.currentPath)
            ? `${props.frontmatter.title} for Solid`
            : props.frontmatter.title)
        }
      />
      <div
        class={`grid [--fd-sidebar-width:0px] [--fd-toc-width:0px] md:[--fd-sidebar-width:268px] ${props.full ? "" : "xl:[--fd-toc-width:268px]"}`}
        data-sidebar-collapsed={collapsed() ? "true" : "false"}
        id="nd-docs-layout"
        style={{
          "--fd-sidebar-col": collapsed() ? "0px" : "var(--fd-sidebar-width)",
          "grid-template": `"sidebar sidebar header toc toc" auto "sidebar sidebar toc-popover toc toc" auto "sidebar sidebar main toc toc" 1fr / minmax(0, 1fr) var(--fd-sidebar-col) minmax(0, calc(97rem - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(0, 1fr)`,
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
            aria-label={mobileOpen() ? "Close Sidebar" : "Open Sidebar"}
            class={`${ICON_BUTTON_CLASS} p-2`}
            onClick={(event) => {
              event.currentTarget.focus();
              setMobileOpen((open) => !open);
            }}
            type="button"
          >
            <PanelLeftIcon />
          </button>
        </header>

        <div
          class="pointer-events-none sticky top-0 z-20 h-dvh [grid-area:sidebar] *:pointer-events-auto max-md:hidden"
          data-sidebar-placeholder
        >
          <Show when={collapsed()}>
            <div
              class="absolute inset-y-0 start-0 w-4"
              onPointerEnter={peek.onPointerEnter}
              onPointerLeave={peek.onPointerLeave}
            />
          </Show>
          <aside
            class={`bg-sidebar text-sidebar-foreground absolute start-0 flex flex-col items-end text-sm duration-250 *:w-(--fd-sidebar-width) ${collapsed() ? `inset-y-2 w-(--fd-sidebar-width) rounded-xl border transition-transform ${hovered() ? "translate-x-2 shadow-lg" : "-translate-x-(--fd-sidebar-width)"}` : "inset-y-0 w-full border-e"}`}
            data-collapsed={collapsed() ? "true" : "false"}
            data-hovered={collapsed() && hovered() ? "true" : "false"}
            id="nd-sidebar"
            inert={collapsed() && !hovered()}
            onPointerEnter={peek.onPointerEnter}
            onPointerLeave={peek.onPointerLeave}
            ref={(element) => {
              sidebar = element;
            }}
          >
            <div class="flex flex-col gap-3 p-4 pb-2">
              <div class="flex">
                <Brand />
                <SidebarCollapseTrigger
                  class={`${ICON_BUTTON_CLASS} mb-auto`}
                  collapsed={collapsed()}
                  onToggle={toggleCollapsed}
                />
              </div>
              <button
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
              class="min-h-0 flex-1 [scrollbar-width:none] overflow-y-auto overscroll-contain mask-[linear-gradient(to_bottom,transparent,white_12px,white_calc(100%-12px),transparent)] p-4"
              data-docs-navigation-viewport
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

        <div
          class={`bg-muted text-muted-foreground fixed start-4 top-4 z-10 flex rounded-xl border p-0.5 shadow-lg transition-opacity max-md:hidden ${!collapsed() || hovered() ? "pointer-events-none opacity-0" : ""}`}
          data-sidebar-panel
          inert={!collapsed() || hovered()}
        >
          <SidebarCollapseTrigger
            class={`${ICON_BUTTON_CLASS} rounded-lg`}
            collapsed={collapsed()}
            onToggle={toggleCollapsed}
          />
          <button
            aria-label="Open Search"
            class={`${ICON_BUTTON_CLASS} rounded-lg`}
            onClick={openSearch}
            type="button"
          >
            <SearchIcon />
          </button>
        </div>

        <Show when={mobileOpen()}>
          <MobileSidebar
            currentPath={props.currentPath}
            onClose={() => setMobileOpen(false)}
          />
        </Show>

        <Show when={headings().length > 0}>
          <div
            class="sticky top-14 z-10 [grid-area:toc-popover] md:top-0 xl:hidden"
            data-docs-toc-popover
          >
            <header class="bg-background/80 backdrop-blur-sm">
              <button
                aria-expanded={tocOpen() ? "true" : "false"}
                class="text-muted-foreground flex h-10 w-full items-center gap-2.5 border-b px-4 py-2.5 text-start text-sm md:px-6 [&_svg]:size-4"
                onClick={() => setTocOpen((open) => !open)}
                type="button"
              >
                <svg
                  aria-valuemax="1"
                  aria-valuemin="0"
                  aria-valuenow={tocProgress()}
                  class="shrink-0"
                  role="progressbar"
                  viewBox="0 0 18 18"
                >
                  <circle
                    class="stroke-border"
                    cx="9"
                    cy="9"
                    fill="none"
                    r="7"
                    stroke-width="2"
                  />
                  <circle
                    class="stroke-primary origin-center -rotate-90 transition-all"
                    cx="9"
                    cy="9"
                    fill="none"
                    pathLength="1"
                    r="7"
                    stroke-dasharray={`${tocProgress()} 1`}
                    stroke-width="2"
                  />
                </svg>
                <span class="grid flex-1 *:col-start-1 *:row-start-1 *:truncate *:transition-all">
                  <span
                    class={showTitle() ? "" : "-translate-y-full opacity-0"}
                  >
                    {props.frontmatter.title}
                  </span>
                  <span class={showTitle() ? "translate-y-full opacity-0" : ""}>
                    {activeTitle()}
                  </span>
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
                    onNavigate={(id) => {
                      setActiveHeadings([id]);
                      setTocOpen(false);
                    }}
                  />
                </div>
              </Show>
            </header>
          </div>
        </Show>

        <main class="grid justify-items-center [grid-area:main]">
          <article
            data-full={props.full ? "true" : undefined}
            class={`flex w-full ${props.full ? "" : "max-w-[900px]"} min-w-0 flex-col gap-4 px-4 py-6 md:px-6 md:pt-8 md:in-data-[sidebar-collapsed=true]:pt-16 xl:px-8 xl:pt-14 xl:in-data-[sidebar-collapsed=true]:pt-14`}
          >
            <h1 class="text-[1.75em] font-semibold">
              {props.frontmatter.title}
            </h1>
            <p class="text-muted-foreground mb-8 text-lg">
              {props.frontmatter.description}
            </p>
            <Show when={registryItemForPath(props.currentPath)}>
              {(item) => (
                <PageActions
                  title={props.frontmatter.title}
                  markdownUrl={markdownUrlFor(props.currentPath)}
                  registryUrl={registryItemUrl(item().name)}
                  sourceUrl={registryItemPath(item().name)}
                  installCommand={`npx shadcn@latest add ${siteConfig.registryNamespace}/${item().name}`}
                  compactPrompt={buildCompactPrompt({
                    title: props.frontmatter.title,
                    pathname: props.currentPath,
                    name: item().name,
                  })}
                />
              )}
            </Show>
            <div class="docs-article prose flex-1">{props.children}</div>
            <div
              role="navigation"
              aria-label="Adjacent pages"
              class="grid grid-cols-2 gap-4 pb-6"
            >
              <For each={adjacent()}>
                {(page, index) => (
                  <Show when={page} fallback={<div />}>
                    {(item) => {
                      const details = () =>
                        pageMetadata.find((entry) => entry.url === item().href);

                      return (
                        <a
                          href={item().href}
                          class={`hover:bg-accent/50 flex flex-col gap-2 rounded-lg border p-4 transition-colors ${index() === 1 ? "col-start-2 text-end" : ""}`}
                        >
                          <p class="font-medium">
                            {details()?.title ?? item().label}
                          </p>
                          <p class="text-muted-foreground text-sm">
                            {details()?.description}
                          </p>
                        </a>
                      );
                    }}
                  </Show>
                )}
              </For>
            </div>
          </article>
        </main>

        <Show when={!props.full && headings().length > 0}>
          <div class="sticky top-0 flex h-dvh w-(--fd-toc-width) flex-col pe-4 pt-12 pb-2 [grid-area:toc] max-xl:hidden">
            <nav aria-label="On this page" class="flex min-h-0 flex-col">
              <h2 class="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
                <TextAlignStartIcon class="size-4" />
                On this page
              </h2>
              <div class="ms-px min-h-0 [scrollbar-width:none] overflow-auto overscroll-contain mask-[linear-gradient(to_bottom,transparent,white_16px,white_calc(100%-16px),transparent)] py-3">
                <TableOfContents
                  active={activeHeading()}
                  headings={headings()}
                />
              </div>
            </nav>
          </div>
        </Show>
      </div>

      <SiteSearch />
      <SiteFooter />
    </div>
  );
};
