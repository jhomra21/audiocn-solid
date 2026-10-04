import { Meta, Title } from "@solidjs/meta";
import { For, Show, createSignal } from "solid-js";

import { searchDocs } from "@/site/lib/search";
import type { SearchDocument } from "@/site/lib/search-schema";

type SearchState = "idle" | "searching" | "done" | "error";

export default function SearchSpikePage() {
  const [query, setQuery] = createSignal("");
  const [results, setResults] = createSignal<SearchDocument[]>([]);
  const [state, setState] = createSignal<SearchState>("idle");

  const runSearch = async () => {
    setState("searching");

    try {
      setResults(await searchDocs(query()));
      setState("done");
    } catch {
      setResults([]);
      setState("error");
    }
  };

  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    void runSearch();
  };

  return (
    <>
      <Title>Static search spike - audiocn Solid</Title>
      <Meta
        content="Static documentation search built and loaded entirely from prerendered files."
        name="description"
      />

      <main class="mx-auto grid min-h-screen w-full max-w-3xl gap-8 px-6 py-16">
        <h1 class="font-heading text-4xl font-semibold">Static search spike</h1>

        <dialog
          aria-labelledby="search-title"
          class="bg-background text-foreground relative m-0 grid w-full gap-4 rounded-xl border p-6"
          open
        >
          <h2 class="font-heading text-2xl font-semibold" id="search-title">
            Search docs
          </h2>

          <form class="flex gap-2" onSubmit={submit}>
            <label class="sr-only" for="docs-search">
              Search documentation
            </label>
            <input
              class="bg-background min-w-0 flex-1 rounded-md border px-3 py-2"
              data-testid="search-input"
              id="docs-search"
              onInput={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search documentation"
              type="search"
              value={query()}
            />
            <button
              class="rounded-md border px-4 py-2"
              data-testid="search-submit"
              type="submit"
            >
              Search
            </button>
          </form>

          <Show when={state() === "searching"}>
            <p role="status">Searching...</p>
          </Show>

          <Show when={state() === "error"}>
            <p role="alert">Search failed.</p>
          </Show>

          <Show when={state() === "done"}>
            <div aria-live="polite" data-testid="search-results">
              <Show fallback={<p>No results.</p>} when={results().length > 0}>
                <ul class="grid gap-3">
                  <For each={results()}>
                    {(result) => (
                      <li>
                        <a class="underline" href={result.url}>
                          {result.title}
                        </a>
                        <p>{result.description}</p>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </Show>
        </dialog>
      </main>
    </>
  );
}
