import { For } from "solid-js";

import { AppearanceToggle } from "@/site/components/docs/appearance-toggle";
import { GitHubStars } from "@/site/components/docs/github-stars";
import { ChevronDownIcon } from "@/site/components/docs/icons";
import { useColorTheme } from "@/site/components/docs/theme-controls";
import { isTheme, THEMES } from "@/site/lib/docs/site-themes";

/** Docs sidebar footer: GitHub and the colour theme, then light/dark. */
export const SidebarControls = () => {
  const [theme, setTheme] = useColorTheme();

  return (
    <div class="flex flex-1 items-center gap-1">
      <GitHubStars />

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

      <AppearanceToggle class="ms-auto inline-flex items-center border-s px-1" />
    </div>
  );
};
