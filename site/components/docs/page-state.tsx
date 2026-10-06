import { Meta, Title } from "@solidjs/meta";
import { httpStatus } from "@solidjs/web";
import type { JSX } from "@solidjs/web";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { omitProps } from "@/lib/solid/props";
import { PageMeta } from "@/site/components/docs/page-meta";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { siteConfig } from "@/site/lib/site";

interface PageStateProps extends JSX.HTMLAttributes<HTMLElement> {
  title: string;
  description: string;
}

export const PageState = (props: PageStateProps) => (
  <main
    class="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16"
    {...omitProps(props, ["children", "description", "title"])}
  >
    <Empty>
      <EmptyHeader>
        <EmptyTitle>
          <h1>{props.title}</h1>
        </EmptyTitle>
        <EmptyDescription>{props.description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div class="flex flex-wrap justify-center gap-3">{props.children}</div>
      </EmptyContent>
    </Empty>
  </main>
);

/**
 * `unavailable` marks an unknown docs path so acceptance runs can flag it.
 * Like upstream's not-found route, it inherits the root metadata and adds noindex.
 */
export const NotFoundPage = (props: { unavailable?: string }) => (
  <>
    <PageMeta pathname="/" title={siteConfig.name} />
    <Meta content="noindex" name="robots" />
    <PageState
      data-docs-route-unavailable={props.unavailable}
      description="This page doesn't exist. Browse the documentation to find components, hooks and blocks."
      title="Page not found"
    >
      <a class={buttonVariants()} data-slot="button" href="/docs">
        Browse documentation
      </a>
      <a
        class={buttonVariants({ variant: "outline" })}
        data-slot="button"
        href="/"
      >
        Go home
      </a>
    </PageState>
    <SiteFooter />
  </>
);

export const ErrorPage = (props: { error: unknown }) => {
  // A failed render must fail the prerender instead of shipping an error page.
  httpStatus(500);

  return (
    <>
      <Title>{`Something went wrong — ${siteConfig.name}`}</Title>
      <PageState
        data-docs-ssr-error={String(props.error)}
        description="This page couldn't load. Try again, or return to the documentation."
        title="Something went wrong"
      >
        {/* A failed dynamic import stays failed for the lifetime of the document, so only a reload can retry it. */}
        <Button onClick={() => location.reload()}>Try again</Button>
        <a
          class={buttonVariants({ variant: "outline" })}
          data-slot="button"
          href="/docs"
        >
          Browse documentation
        </a>
      </PageState>
      <SiteFooter />
    </>
  );
};
