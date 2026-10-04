import { Meta, Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { DocsShell } from "@/site/components/docs/docs-shell";
import { NotYetPorted } from "@/site/components/home/not-yet-ported";
import { DOCS_PAGE_METADATA } from "@/site/lib/docs/page-metadata";

export default function UnportedDocsPage() {
  const params = useParams<{ splat: string }>();
  const currentPath = () => `/docs/${params.splat}`;

  const metadata = () =>
    Object.entries(DOCS_PAGE_METADATA).find(
      ([path]) => path === currentPath()
    )?.[1];

  return (
    <Show
      fallback={
        <>
          <Title>Not found - audiocn Solid</Title>
          <main class="p-8">This documentation page was not found.</main>
        </>
      }
      when={metadata()}
    >
      {(page) => (
        <>
          <Title>{page().title} - audiocn Solid</Title>
          <Meta content={page().description} name="description" />
          <DocsShell
            currentPath={currentPath()}
            description={page().description}
            title={page().title}
          >
            <div
              class="grid gap-4"
              data-docs-route-not-yet-ported={currentPath()}
            >
              <p>
                This page has not yet been ported to the Solid documentation.
              </p>
              <NotYetPorted item={page().title} />
              <a
                class="text-primary underline underline-offset-4"
                href={`https://www.audiocn.dev${currentPath()}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                Read the upstream documentation
              </a>
            </div>
          </DocsShell>
        </>
      )}
    </Show>
  );
}
