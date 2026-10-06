import { For, Show, createMemo, createSignal, onSettled } from "solid-js";

import { SearchIcon } from "@/site/components/docs/icons";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";
import {
  useAppearance,
  useColorTheme,
} from "@/site/components/docs/theme-controls";
import { DOCS_NAVIGATION } from "@/site/lib/docs/navigation";
import { THEMES } from "@/site/lib/docs/site-themes";
import { searchDocs } from "@/site/lib/search";
import { searchGroups } from "@/site/lib/search-groups";
import type { SearchDocument } from "@/site/lib/search-schema";
import { searchSections } from "@/site/lib/search-sections";
import { siteConfig } from "@/site/lib/site";

type SearchState = "error" | "idle" | "searching" | "done";

type IconName = Parameters<typeof DocsIcon>[0]["name"];

interface MenuItem {
  id: string;
  title: string;
  url?: string;
  external?: boolean;
  icon?: IconName;
  swatch?: string;
  current?: boolean;
  hint?: string;
  keywords?: string;
  select?: () => void;
  description?: string;
}

const icons = new Map<string, IconName>([
  ["Getting started", "Rocket"],
  ["Components", "Cube"],
  ["Blocks", "SquaresFour"],
  ["Hooks", "Function"],
  ["Concepts", "Lightbulb"],
]);

const groups = searchGroups(DOCS_NAVIGATION).map((group) => ({
  label: group.label,
  items: group.items.map((item): MenuItem => ({
    ...item,
    id: `menu:${item.url}`,
    icon: icons.get(group.label),
  })),
}));

const links: MenuItem[] = [
  {
    id: "links:contributors",
    title: "Contributors",
    url: "/contributors",
    icon: "Users",
    keywords: "Contributors",
  },
  {
    id: "links:github",
    title: "GitHub",
    url: `https://github.com/${siteConfig.githubRepo}`,
    external: true,
    icon: "GithubLogo",
    keywords: "GitHub source repository",
  },
];

const matches = (keywords: string | undefined, query: string) => {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);

  return (
    words.length > 0 &&
    words.every((word) => keywords?.toLowerCase().includes(word))
  );
};

const SearchDialog = (props: { onClose: () => void }) => {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchDocument[]>([]);
  const [state, setState] = createSignal<SearchState>("idle");
  const [active, setActive] = createSignal("menu:/docs");
  const [appearance, saveAppearance] = useAppearance();
  const [theme, saveTheme] = useColorTheme();
  let requestVersion = 0;
  let dialog: HTMLDialogElement | undefined;
  let input: HTMLInputElement | undefined;

  const themeItems = createMemo((): MenuItem[] => [
    {
      id: "theme:mode",
      title: appearance() === "dark" ? "Light mode" : "Dark mode",
      icon: appearance() === "dark" ? "Sun" : "Moon",
      hint: "D",
      keywords: "theme mode dark light",
      select: () => saveAppearance(appearance() === "dark" ? "light" : "dark"),
    },
    ...THEMES.map((entry): MenuItem => ({
      id: `theme:${entry.value}`,
      title: entry.label,
      swatch: entry.swatch,
      current: entry.value === theme(),
      keywords: `theme colour color ${entry.label}`,
      select: () => saveTheme(entry.value),
    })),
  ]);

  const extras = () =>
    [...links, ...themeItems()].filter((item) =>
      matches(item.keywords, query())
    );

  const menuGroups = () => [
    ...groups,
    { label: "Links", items: links },
    { label: "Theme", items: themeItems() },
  ];

  const resultGroups = createMemo(() =>
    results().map((result) => ({
      label: result.title,
      items: [
        { ...result },
        ...searchSections(result, query()),
      ] satisfies MenuItem[],
    }))
  );

  const items = createMemo((): MenuItem[] =>
    state() === "idle"
      ? menuGroups().flatMap((group) => group.items)
      : [...resultGroups().flatMap((group) => group.items), ...extras()]
  );

  const selected = () =>
    items().find((item) => item.id === active()) ?? items()[0];

  onSettled(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    input?.focus();

    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;

      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  });

  const close = () => {
    requestVersion += 1;
    props.onClose();
  };

  const runSearch = async (rawQuery: string) => {
    setQuery(rawQuery);
    setResults([]);
    setActive("");
    const version = ++requestVersion;

    if (!rawQuery.trim()) {
      setState("idle");

      return;
    }

    setState("searching");

    try {
      const next = await searchDocs(rawQuery);

      if (version !== requestVersion) return;
      setResults(next);
      setState("done");
    } catch {
      if (version !== requestVersion) return;
      setState("error");
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.isComposing || event.keyCode === 229) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const list = items();

      if (!list.length) return;
      const index = list.findIndex((item) => item.id === selected()?.id);

      const next =
        (index + (event.key === "ArrowDown" ? 1 : -1) + list.length) %
        list.length;

      setActive(list[next]!.id);
      dialog
        ?.querySelector<HTMLElement>(`[data-item-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
      event.preventDefault();
    } else if (event.key === "Enter" && event.target === input) {
      const index = items().findIndex((item) => item.id === selected()?.id);
      dialog
        ?.querySelector<HTMLElement>(`[data-item-index="${index}"]`)
        ?.click();
      event.preventDefault();
    } else if (event.key === "Tab") {
      // Only the input and close button are in the tab order. Keep the cycle
      // within the modal even when the browser would focus its own chrome.
      const targets = dialog?.querySelectorAll<HTMLElement>(
        "input, button:not([tabindex='-1'])"
      );

      if (!targets?.length) return;
      const first = targets[0]!;
      const last = targets[targets.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        last.focus();
        event.preventDefault();
      } else if (!event.shiftKey && document.activeElement === last) {
        first.focus();
        event.preventDefault();
      }
    }
  };

  const content = (item: MenuItem) => (
    <span class="flex items-center gap-2.5">
      <Show when={item.icon}>
        {(name) => (
          <DocsIcon name={name()} class="text-muted-foreground size-4" />
        )}
      </Show>
      <Show when={item.swatch}>
        <span
          aria-hidden="true"
          class="mx-0.5 size-3 rounded-full"
          data-swatch
          style={{ background: item.swatch }}
        />
      </Show>
      <span class="min-w-0 flex-1 truncate">{item.title}</span>
      <Show when={item.hint}>
        <kbd class="text-muted-foreground border-border rounded border px-1.5 font-mono text-xs">
          {item.hint}
        </kbd>
      </Show>
      <Show when={item.current}>
        <DocsIcon
          name="Check"
          aria-label="Current theme"
          class="text-muted-foreground size-4"
        />
      </Show>
    </span>
  );

  const renderItem = (item: MenuItem) => {
    const common = {
      class:
        "relative select-none shrink-0 px-2.5 py-2 text-start text-sm overflow-hidden rounded-lg block w-full outline-none",
      get classList() {
        return {
          "bg-accent text-accent-foreground": selected()?.id === item.id,
        };
      },
      tabIndex: -1,
      get "data-item-index"() {
        return items().findIndex((entry) => entry.id === item.id);
      },
      get "data-selected"() {
        return selected()?.id === item.id ? "true" : "false";
      },
      onPointerMove: () => setActive(item.id),
    };

    return (
      <Show
        when={item.url}
        fallback={
          <button
            {...common}
            aria-label={item.title}
            onClick={() => {
              item.select?.();
              close();
            }}
            type="button"
          >
            {content(item)}
          </button>
        }
      >
        <a
          {...common}
          href={item.url}
          onClick={close}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer noopener" : undefined}
        >
          {content(item)}
          <Show when={item.description}>
            <span class="text-muted-foreground line-clamp-2 text-xs">
              {item.description}
            </span>
          </Show>
        </a>
      </Show>
    );
  };

  return (
    <dialog
      aria-label="Search documentation"
      class="bg-popover text-popover-foreground fixed inset-auto top-4 left-1/2 z-100 m-0 w-[calc(100%-1rem)] max-w-screen-sm -translate-x-1/2 overflow-hidden rounded-xl border p-0 shadow-2xl shadow-black/50 backdrop:bg-black/40 backdrop:backdrop-blur-xs md:top-[calc(50%-250px)]"
      data-testid="search-overlay"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === dialog) {
          const rect = dialog.getBoundingClientRect();

          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }
      }}
      onKeyDown={onKeyDown}
      ref={(element) => {
        dialog = element;
      }}
    >
      <div class="flex flex-row items-center gap-2 border-b p-3">
        <SearchIcon class="text-muted-foreground size-5" />
        <input
          aria-label="Search documentation"
          class="placeholder:text-muted-foreground w-0 flex-1 bg-transparent text-lg focus-visible:outline-none"
          data-testid="docs-search-input"
          onInput={(event) => void runSearch(event.currentTarget.value)}
          placeholder="Search"
          ref={(element) => {
            input = element;
          }}
          type="search"
          value={query()}
        />
        <button
          aria-label="Close search"
          class="text-muted-foreground rounded-md border px-2.5 py-1.5 font-mono text-sm"
          onClick={close}
          type="button"
        >
          ESC
        </button>
      </div>
      <div
        class="flex max-h-[460px] w-full flex-col overflow-y-auto p-1"
        data-testid="docs-search-results"
      >
        <Show
          when={state() === "idle"}
          fallback={
            <>
              <For each={resultGroups()}>
                {(group) => (
                  <section aria-label={group.label}>
                    <For each={group.items}>{renderItem}</For>
                  </section>
                )}
              </For>
              <For each={extras()}>{renderItem}</For>
            </>
          }
        >
          <div data-testid="docs-search-groups">
            <For each={menuGroups()}>
              {(group) => (
                <section aria-label={group.label}>
                  <h3 class="text-muted-foreground px-2.5 pt-3 pb-1.5 text-xs font-medium">
                    {group.label}
                  </h3>
                  <For each={group.items}>{renderItem}</For>
                </section>
              )}
            </For>
          </div>
        </Show>
        <Show when={state() === "error"}>
          <p class="text-destructive py-6 text-center text-sm" role="alert">
            Search failed.
          </p>
        </Show>
        <Show when={state() === "done" && items().length === 0}>
          <p class="text-muted-foreground py-12 text-center text-sm">
            No results.
          </p>
        </Show>
      </div>
    </dialog>
  );
};

const OPEN_SEARCH_EVENT = "audiocn-open-search";

export const openSearch = () =>
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));

/** The search dialog, opened with Cmd/Ctrl+K or `openSearch()`. */
export const SiteSearch = () => {
  const [open, setOpen] = createSignal(false);

  onSettled(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    const onSearchRequest = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SEARCH_EVENT, onSearchRequest);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SEARCH_EVENT, onSearchRequest);
    };
  });

  return (
    <Show when={open()}>
      <SearchDialog onClose={() => setOpen(false)} />
    </Show>
  );
};
