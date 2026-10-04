import { For } from "solid-js";

import { isTheme, THEMES } from "@/site/lib/docs/site-themes";
import {
  useAppearance,
  useColorTheme,
} from "@/site/components/docs/theme-controls";

export const SidebarControls = () => {
  const [appearance, setAppearance] = useAppearance();
  const [theme, setTheme] = useColorTheme();

  return (
    <div class="grid gap-2 border-t pt-4">
      <label class="grid gap-1 text-xs">
        <span class="text-muted-foreground">Color theme</span>
        <select
          aria-label="Color theme"
          class="bg-background h-8 rounded-md border px-2 text-sm"
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
      </label>

      <button
        class="text-muted-foreground hover:bg-muted hover:text-foreground flex h-8 items-center justify-between rounded-md px-2 text-sm"
        onClick={() =>
          setAppearance(appearance() === "dark" ? "light" : "dark")
        }
        type="button"
      >
        Appearance
        <span>{appearance() === "dark" ? "Dark" : "Light"}</span>
      </button>
    </div>
  );
};
