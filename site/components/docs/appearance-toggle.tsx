import { flush } from "solid-js";

import { MoonIcon, SunIcon } from "@/site/components/docs/icons";
import { useAppearance } from "@/site/components/docs/theme-controls";

const APPEARANCE_ICON_CLASS =
  "size-6.5 rounded-md p-1.5 text-muted-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground";

/** Light/dark switch shared by the site header and the docs sidebar. */
export const AppearanceToggle = (props: { class: string; testId?: string }) => {
  const [appearance, setAppearance] = useAppearance();

  const toggleAppearance = () => {
    const next = appearance() === "dark" ? "light" : "dark";

    const update = () => {
      setAppearance(next);
      flush();
    };

    const startViewTransition = document.startViewTransition;

    if (
      !startViewTransition ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      update();

      return;
    }

    const transition = startViewTransition.call(document, update);
    void transition.finished.catch(() => {});
  };

  return (
    <button
      aria-label="Toggle Theme"
      class={props.class}
      data-testid={props.testId}
      onClick={toggleAppearance}
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
  );
};
