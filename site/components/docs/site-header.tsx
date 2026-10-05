import { For, Show } from "solid-js";

import { BrandAssetsMenu } from "@/site/components/docs/brand-assets-menu";
import { MoonIcon, SunIcon } from "@/site/components/docs/icons";
import { SiteSearch, openSearch } from "@/site/components/docs/search-dialog";
import { useAppearance } from "@/site/components/docs/theme-controls";
import { siteConfig } from "@/site/lib/site";

const navItems = [
  { href: "/docs", label: "Docs" },
  { href: "/docs/components", label: "Components" },
  { href: "/docs/blocks", label: "Blocks" },
] as const;

export const SiteHeader = () => {
  const [appearance, setAppearance] = useAppearance();

  return (
    <>
      <header class="bg-background/90 sticky top-0 z-50 border-b backdrop-blur">
        <div class="mx-auto flex h-14 w-full max-w-7xl items-center gap-5 px-4 sm:px-6">
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

          <nav
            aria-label="Primary"
            class="hidden items-center gap-1 text-sm sm:flex"
          >
            <For each={navItems}>
              {(item) => (
                <a
                  class="text-muted-foreground hover:text-foreground hover:bg-muted rounded-md px-2.5 py-1.5 transition-colors"
                  href={item.href}
                >
                  {item.label}
                </a>
              )}
            </For>
          </nav>

          <div class="ml-auto flex items-center gap-1">
            <button
              aria-label="Search docs"
              class="text-muted-foreground hover:text-foreground hover:bg-muted hidden h-8 items-center gap-2 rounded-md border px-2.5 text-sm transition-colors sm:flex"
              onClick={openSearch}
              type="button"
            >
              Search docs
              <kbd class="text-muted-foreground font-mono text-[10px]">⌘K</kbd>
            </button>

            <a
              aria-label={`${siteConfig.githubRepo} on GitHub`}
              class="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors"
              href={`https://github.com/${siteConfig.githubRepo}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg aria-hidden="true" class="size-4" viewBox="0 0 24 24">
                <path
                  d="M12 0C5.37 0 0 5.372 0 11.997 0 17.3 3.438 21.795 8.205 23.38c.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.609-4.042-1.609C4.422 17.77 3.633 17.4 3.633 17.4c-1.087-.744.084-.73.084-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.417-1.304.76-1.604-2.665-.3-5.466-1.332-5.466-5.929 0-1.31.465-2.38 1.235-3.219-.135-.303-.54-1.523.105-3.175 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.006 2.04.138 3 .404 2.28-1.551 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.608-2.805 5.623-5.475 5.918.42.36.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.284 0 .315.21.69.825.57C20.565 21.79 24 17.291 24 11.997 24 5.372 18.627 0 12 0"
                  fill="currentColor"
                />
              </svg>
            </a>

            <button
              aria-label={
                appearance() === "dark" ? "Use light mode" : "Use dark mode"
              }
              class="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 items-center justify-center rounded-md border-0 bg-transparent transition-colors"
              data-testid="appearance-toggle"
              onClick={() =>
                setAppearance(appearance() === "dark" ? "light" : "dark")
              }
              type="button"
            >
              <Show
                when={appearance() === "dark"}
                fallback={<MoonIcon class="size-4" />}
              >
                <SunIcon class="size-4" />
              </Show>
            </button>
          </div>
        </div>
      </header>

      <SiteSearch />
    </>
  );
};
