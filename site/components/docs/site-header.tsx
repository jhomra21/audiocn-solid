import { For, Show, createSignal } from "solid-js";

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

  return (
    <>
      <header class="bg-background/90 sticky top-0 z-50 border-b backdrop-blur">
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

          <div class="ml-auto hidden items-center gap-1.5 lg:flex">
            <button
              class="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-md border p-1.5 ps-2 text-sm transition-colors"
              onClick={openSearch}
              type="button"
            >
              <SearchIcon class="size-4" />
              Search
              <div class="ms-4 inline-flex gap-0.5">
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
              class={ICON_BUTTON_CLASS}
              onClick={openSearch}
              type="button"
            >
              <SearchIcon />
            </button>
            <button
              aria-controls="site-menu"
              aria-expanded={menuOpen() ? "true" : "false"}
              aria-label="Toggle Menu"
              class={ICON_BUTTON_CLASS}
              onClick={() => setMenuOpen((open) => !open)}
              type="button"
            >
              <ChevronDownIcon class={menuOpen() ? "rotate-180" : ""} />
            </button>
          </div>
        </nav>

        <Show when={menuOpen()}>
          <div
            class="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 pb-3 text-sm sm:px-6 lg:hidden"
            id="site-menu"
          >
            <For each={navItems}>
              {(item) => (
                <a class="py-1.5" href={item.href}>
                  {item.label}
                </a>
              )}
            </For>
            <div class="mt-2 flex items-center gap-2">
              <GitHubStars />
              <div class="flex-1" role="separator" />
              <AppearanceToggle class={THEME_TOGGLE_CLASS} />
            </div>
          </div>
        </Show>
      </header>

      <SiteSearch />
    </>
  );
};
