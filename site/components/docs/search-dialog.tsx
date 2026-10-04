import { For, Show, createSignal } from "solid-js";

import { searchDocs } from "@/site/lib/search";
import type { SearchDocument } from "@/site/lib/search-schema";

type SearchState = "error" | "idle" | "searching" | "done";

interface SearchDialogProps {
  onClose: () => void;
  open: boolean;
}

export const SearchDialog = (props: SearchDialogProps) => {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchDocument[]>([]);
  const [state, setState] = createSignal<SearchState>("idle");
  let requestVersion = 0;

  const runSearch = async (rawQuery: string) => {
    const nextQuery = rawQuery.trim();

    setQuery(rawQuery);
    requestVersion += 1;

    const currentVersion = requestVersion;

    if (!nextQuery) {
      setResults([]);
      setState("idle");

      return;
    }

    setState("searching");

    try {
      const nextResults = await searchDocs(nextQuery);

      if (currentVersion !== requestVersion) {
        return;
      }

      setResults(nextResults);
      setState("done");
    } catch {
      if (currentVersion !== requestVersion) {
        return;
      }

      setResults([]);
      setState("error");
    }
  };

  const close = () => {
    requestVersion += 1;
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-100 flex items-start justify-center bg-black/40 px-4 pt-[12vh] backdrop-blur-sm"
        data-testid="search-overlay"
        onClick={(event) => {
          if (event.currentTarget === event.target) {
            close();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            close();
          }
        }}
      >
        <section
          aria-labelledby="docs-search-title"
          aria-modal="true"
          class="bg-background text-foreground grid max-h-[70vh] w-full max-w-2xl grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-xl border shadow-2xl"
          role="dialog"
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2
              class="font-heading text-base font-semibold"
              id="docs-search-title"
            >
              Search documentation
            </h2>
            <button
              aria-label="Close search"
              class="text-muted-foreground hover:text-foreground rounded-md px-2 py-1 text-sm"
              onClick={close}
              type="button"
            >
              Esc
            </button>
          </div>

          <label class="border-b p-3">
            <span class="sr-only">Search documentation</span>
            <input
              autofocus
              class="bg-background w-full border-0 px-1 py-2 text-sm outline-none"
              data-testid="docs-search-input"
              onInput={(event) => {
                void runSearch(event.currentTarget.value);
              }}
              placeholder="Search docs..."
              type="search"
              value={query()}
            />
          </label>

          <div class="overflow-y-auto p-2" data-testid="docs-search-results">
            <Show when={state() === "searching"}>
              <p class="text-muted-foreground px-3 py-6 text-center text-sm">
                Searching...
              </p>
            </Show>

            <Show when={state() === "error"}>
              <p class="text-destructive px-3 py-6 text-center text-sm" role="alert">
                Search failed.
              </p>
            </Show>

            <Show when={state() === "idle"}>
              <p class="text-muted-foreground px-3 py-6 text-center text-sm">
                Search page titles and documentation content.
              </p>
            </Show>

            <Show when={state() === "done" && results().length === 0}>
              <p class="text-muted-foreground px-3 py-6 text-center text-sm">
                No results.
              </p>
            </Show>

            <Show when={results().length > 0}>
              <ul class="grid gap-1">
                <For each={results()}>
                  {(result) => (
                    <li>
                      <a
                        class="hover:bg-muted focus-visible:ring-ring/50 grid gap-1 rounded-lg px-3 py-2 outline-none focus-visible:ring-3"
                        href={result.url}
                      >
                        <strong class="text-sm font-medium">{result.title}</strong>
                        <span class="text-muted-foreground line-clamp-2 text-xs">
                          {result.description}
                        </span>
                      </a>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </section>
      </div>
    </Show>
  );
};
