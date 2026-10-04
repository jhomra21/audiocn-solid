import { createSignal, onSettled } from "solid-js";

import { isTheme, type ThemeName } from "@/site/lib/docs/site-themes";

type Appearance = "dark" | "light";

const COLOR_STORAGE_KEY = "audiocn-theme";

const COLOR_CHANGE_EVENT = "audiocn-theme-change";

const APPEARANCE_STORAGE_KEY = "audiocn-appearance";

const APPEARANCE_CHANGE_EVENT = "audiocn-appearance-change";

const applyColorTheme = (theme: ThemeName) => {
  if (theme === "stone") {
    delete document.documentElement.dataset.theme;

    return;
  }

  document.documentElement.dataset.theme = theme;
};

const readColorTheme = (): ThemeName => {
  try {
    const stored = window.localStorage.getItem(COLOR_STORAGE_KEY);

    return isTheme(stored) ? stored : "stone";
  } catch {
    return "stone";
  }
};

const readAppearance = (): Appearance => {
  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);

    if (stored === "dark" || stored === "light") {
      return stored;
    }
  } catch {
    // The current visit still follows the system preference.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const applyAppearance = (appearance: Appearance) => {
  document.documentElement.classList.toggle("dark", appearance === "dark");
};

export const useColorTheme = () => {
  const [theme, setTheme] = createSignal<ThemeName>("stone");

  onSettled(() => {
    const sync = () => {
      const next = readColorTheme();
      setTheme(next);
      applyColorTheme(next);
    };

    sync();
    window.addEventListener(COLOR_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(COLOR_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  });

  const saveTheme = (next: ThemeName) => {
    try {
      window.localStorage.setItem(COLOR_STORAGE_KEY, next);
    } catch {
      // The theme still applies for this visit.
    }

    setTheme(next);
    applyColorTheme(next);
    window.dispatchEvent(new Event(COLOR_CHANGE_EVENT));
  };

  return [theme, saveTheme] as const;
};

export const useAppearance = () => {
  const [appearance, setAppearance] = createSignal<Appearance>("light");

  onSettled(() => {
    const sync = () => {
      const next = readAppearance();
      setAppearance(next);
      applyAppearance(next);
    };

    sync();
    window.addEventListener(APPEARANCE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  });

  const saveAppearance = (next: Appearance) => {
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, next);
    } catch {
      // The appearance still applies for this visit.
    }

    setAppearance(next);
    applyAppearance(next);
    window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
  };

  return [appearance, saveAppearance] as const;
};
