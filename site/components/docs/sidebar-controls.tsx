import { For } from "solid-js";

import { isTheme, THEMES } from "@/site/lib/docs/site-themes";
import { siteConfig } from "@/site/lib/site";
import {
  useAppearance,
  useColorTheme,
} from "@/site/components/docs/theme-controls";

export const SidebarControls = () => {
  const [appearance, setAppearance] = useAppearance();
  const [theme, setTheme] = useColorTheme();

  return (
    <div class="grid gap-3 border-t pt-4">
      <div class="flex items-center gap-2">
        <a
          class="text-muted-foreground hover:text-foreground flex h-8 items-center gap-2 rounded-md px-2 text-xs"
          href={`https://github.com/${siteConfig.githubRepo}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub ★
        </a>
        <select
          aria-label="Color theme"
          class="bg-background ml-auto h-8 min-w-24 rounded-md border px-2 text-xs"
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
      </div>

      <div class="grid grid-cols-2 gap-1">
        <button
          aria-pressed={appearance() === "light" ? "true" : "false"}
          class="aria-[pressed=true]:bg-muted text-muted-foreground hover:text-foreground flex h-8 items-center justify-center rounded-md text-xs"
          onClick={() => setAppearance("light")}
          type="button"
        >
          Light
        </button>
        <button
          aria-pressed={appearance() === "dark" ? "true" : "false"}
          class="aria-[pressed=true]:bg-muted text-muted-foreground hover:text-foreground flex h-8 items-center justify-center rounded-md text-xs"
          onClick={() => setAppearance("dark")}
          type="button"
        >
          Dark
        </button>
      </div>
    </div>
  );
};
