import { For, Show, createSignal, onSettled } from "solid-js";

import { AppearanceToggle } from "@/site/components/docs/appearance-toggle";
import { BrandAssetsMenu } from "@/site/components/docs/brand-assets-menu";
import { GitHubStars } from "@/site/components/docs/github-stars";
import { ChevronDownIcon, SearchIcon } from "@/site/components/docs/icons";
import { SiteSearch, openSearch } from "@/site/components/docs/search-dialog";

const navItems = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/components", label: "Components" },
  { href: "/docs/blocks", label: "Blocks" },
] as const;

const ICON_BUTTON_CLASS =
  "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4.5";

const THEME_TOGGLE_CLASS =
  "inline-flex items-center overflow-hidden rounded-full border p-1 *:rounded-full";

export const SiteHeader = () => {
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [menuMounted, setMenuMounted] = createSignal(false);
  let header: HTMLElement | undefined;
  let menuContent: HTMLDivElement | undefined;
  let menuTrigger: HTMLButtonElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;

  const openMenu = () => {
    clearTimeout(closeTimer);
    setMenuMounted(true);
    setMenuOpen(true);
  };

  const closeMenu = () => {
    if (!menuOpen()) return;

    setMenuOpen(false);
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setMenuMounted(false), 200);
  };

  onSettled(() => {
    resizeObserver = new ResizeObserver(() => {
      if (menuContent) {
        header?.style.setProperty(
          "--site-menu-height",
          `${menuContent.scrollHeight}px`
        );
      }
    });

    if (menuContent) resizeObserver.observe(menuContent);

    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !header?.contains(event.target))
        closeMenu();
    };

    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const dismissAtDesktop = (event: MediaQueryListEvent) => {
      if (!event.matches) return;

      const focusWasInMenu = menuContent?.contains(document.activeElement);
      closeMenu();

      if (focusWasInMenu) {
        header?.querySelector<HTMLElement>(".site-desktop-search")?.focus();
      }
    };

    desktopQuery.addEventListener("change", dismissAtDesktop);

    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      desktopQuery.removeEventListener("change", dismissAtDesktop);
      resizeObserver?.disconnect();
      clearTimeout(closeTimer);
    };
  });

  return (
    <>
      <header
        class={`bg-background/90 sticky top-0 z-50 border-b backdrop-blur ${menuOpen() ? "rounded-b-2xl shadow-lg" : ""}`}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !menuOpen()) return;
          event.preventDefault();
          closeMenu();
          menuTrigger?.focus();
        }}
        ref={(element) => {
          header = element;
        }}
      >
        <nav
          aria-label="Primary"
          class="mx-auto flex h-14 w-full max-w-7xl items-center gap-5 px-4 sm:px-6"
        >
          <BrandAssetsMenu class="focus-visible:ring-ring/50 flex items-center gap-2 rounded-md outline-none focus-visible:ring-3">
            <img
              alt=""
              data-slot="brand-logo"
              aria-hidden="true"
              class="size-7 dark:invert"
              height="28"
              src="/brand/logo.svg"
              width="28"
            />
            <span class="font-heading text-base font-semibold tracking-tight">
              audiocn
            </span>
            <span class="text-muted-foreground text-xs">Solid</span>
          </BrandAssetsMenu>

          <ul class="hidden items-center gap-1 text-sm sm:flex">
            <For each={navItems}>
              {(item) => (
                <li>
                  <a
                    class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors"
                    href={item.href}
                  >
                    {item.label}
                  </a>
                </li>
              )}
            </For>
          </ul>

          <div class="ml-auto hidden flex-1 items-center justify-end gap-1.5 lg:flex">
            <button
              class="site-desktop-search bg-secondary/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex w-full max-w-[240px] items-center gap-2 rounded-full border p-1.5 ps-2.5 text-sm transition-colors"
              onClick={openSearch}
              type="button"
            >
              <SearchIcon class="size-4" />
              Search
              <div class="ms-auto inline-flex gap-0.5">
                <kbd class="bg-background rounded-md border px-1.5">⌘</kbd>
                <kbd class="bg-background rounded-md border px-1.5">K</kbd>
              </div>
            </button>
            <AppearanceToggle
              class={THEME_TOGGLE_CLASS}
              testId="appearance-toggle"
            />
            <GitHubStars />
          </div>

          <div class="ml-auto flex items-center gap-1 lg:hidden">
            <button
              aria-label="Open Search"
              class="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors duration-100 focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-4.5"
              onClick={openSearch}
              type="button"
            >
              <SearchIcon />
            </button>
            <button
              aria-controls="site-menu"
              aria-expanded={menuOpen() ? "true" : "false"}
              aria-label="Toggle Menu"
              class={`${ICON_BUTTON_CLASS} group`}
              onClick={() => (menuOpen() ? closeMenu() : openMenu())}
              ref={(element) => {
                menuTrigger = element;
              }}
              type="button"
            >
              <ChevronDownIcon
                class={`size-5.5 transition-transform duration-300 ${menuOpen() ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </nav>

        <Show when={menuMounted()}>
          <div
            aria-hidden={menuOpen() ? undefined : "true"}
            class="site-menu bg-background"
            data-open={menuOpen() ? "true" : "false"}
            id="site-menu"
            inert={!menuOpen()}
          >
            <div
              class="site-menu-content mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 pb-3 text-sm sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6"
              ref={(element) => {
                menuContent = element;

                if (element) resizeObserver?.observe(element);
              }}
            >
              <For each={navItems}>
                {(item) => (
                  <a class="py-1.5 sm:hidden" href={item.href}>
                    {item.label}
                  </a>
                )}
              </For>
              <div class="mt-2 flex items-center gap-2 sm:mt-0">
                <GitHubStars />
                <div class="flex-1" role="separator" />
                <AppearanceToggle
                  class={THEME_TOGGLE_CLASS}
                  testId="appearance-toggle"
                />
              </div>
            </div>
          </div>
        </Show>
      </header>

      <SiteSearch />
    </>
  );
};
