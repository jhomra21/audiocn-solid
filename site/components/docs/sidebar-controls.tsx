import { For } from "solid-js";

import {
  ChevronDownIcon,
  MoonIcon,
  SunIcon,
} from "@/site/components/docs/icons";
import {
  useAppearance,
  useColorTheme,
} from "@/site/components/docs/theme-controls";
import { isTheme, THEMES } from "@/site/lib/docs/site-themes";
import { siteConfig } from "@/site/lib/site";

const APPEARANCE_ICON_CLASS =
  "size-6.5 rounded-md p-1.5 text-muted-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground";

/** Docs sidebar footer: GitHub and the colour theme, then light/dark. */
export const SidebarControls = () => {
  const [appearance, setAppearance] = useAppearance();
  const [theme, setTheme] = useColorTheme();

  return (
    <div class="flex flex-1 items-center gap-1">
      <a
        aria-label={`${siteConfig.githubRepo} on GitHub`}
        class="hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 inline-flex h-8 shrink-0 items-center justify-center rounded-2xl px-2 text-sm font-medium transition-all"
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

      <div class="relative w-28">
        <select
          aria-label="Theme"
          class="bg-input/50 text-foreground focus-visible:ring-ring/30 h-7 w-full appearance-none rounded-2xl px-3 pe-7 text-sm outline-none focus-visible:ring-3"
          onChange={(event) => {
            const next = event.currentTarget.value;

            if (isTheme(next)) {
              setTheme(next);
            }
          }}
          value={theme()}
        >
          <For each={THEMES}>
            {(option) => <option value={option.value}>{option.label}</option>}
          </For>
        </select>
        <ChevronDownIcon class="text-muted-foreground pointer-events-none absolute end-2 top-1.5 size-4" />
      </div>

      <button
        aria-label="Toggle Theme"
        class="ms-auto inline-flex items-center border-s px-1"
        onClick={() =>
          setAppearance(appearance() === "dark" ? "light" : "dark")
        }
        type="button"
      >
        <SunIcon
          data-active={appearance() === "light" ? "" : undefined}
          class={APPEARANCE_ICON_CLASS}
        />
        <MoonIcon
          data-active={appearance() === "dark" ? "" : undefined}
          class={APPEARANCE_ICON_CLASS}
        />
      </button>
    </div>
  );
};
