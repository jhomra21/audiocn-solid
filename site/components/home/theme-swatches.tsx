import { For } from "solid-js";

import { Button } from "@/components/ui/button";
import { useColorTheme } from "@/site/components/docs/theme-controls";
import { THEMES } from "@/site/lib/docs/site-themes";

export const ThemeSwatches = () => {
  const [theme, setTheme] = useColorTheme();

  return (
    <fieldset class="flex flex-wrap items-center gap-1">
      <legend class="sr-only">Theme</legend>
      <For each={THEMES}>
        {(option) => (
          <Button
            aria-pressed={theme() === option.value ? "true" : "false"}
            onClick={() => setTheme(option.value)}
            size="xs"
            variant={theme() === option.value ? "outline" : "ghost"}
          >
            <span
              aria-hidden="true"
              class="ring-foreground/15 size-2.5 rounded-full ring-1"
              style={`background-color: ${option.swatch}`}
            />
            {option.label}
          </Button>
        )}
      </For>
    </fieldset>
  );
};
