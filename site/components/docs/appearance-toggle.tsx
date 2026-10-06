import { MoonIcon, SunIcon } from "@/site/components/docs/icons";
import { useAppearance } from "@/site/components/docs/theme-controls";

const APPEARANCE_ICON_CLASS =
  "size-6.5 rounded-md p-1.5 text-muted-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground";

/** Light/dark switch shared by the site header and the docs sidebar. */
export const AppearanceToggle = (props: { class: string; testId?: string }) => {
  const [appearance, setAppearance] = useAppearance();

  return (
    <button
      aria-label="Toggle Theme"
      class={props.class}
      data-testid={props.testId}
      onClick={() => setAppearance(appearance() === "dark" ? "light" : "dark")}
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
