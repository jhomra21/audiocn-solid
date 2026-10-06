import { For, Show } from "solid-js";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageMeta } from "@/site/components/docs/page-meta";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { SiteHeader } from "@/site/components/docs/site-header";
import { getContributorStats } from "@/site/lib/contributors";
import contributorData from "@/site/lib/contributors.json";
import { siteConfig } from "@/site/lib/site";

const format = new Intl.NumberFormat("en-US");

const contributors: {
  login: string;
  avatarUrl: string;
  profileUrl: string;
  contributions: number;
}[] = contributorData;

const stats = getContributorStats(contributors);

const repositoryUrl = `https://github.com/${siteConfig.githubRepo}`;

const SectionHeading = (props: { aside: string; title: string }) => (
  <div class="flex flex-col gap-3">
    <div class="flex items-baseline justify-between gap-3">
      <h2 class="text-muted-foreground font-mono text-xs font-semibold uppercase">
        {props.title}
      </h2>
      <p class="text-foreground truncate font-mono text-xs font-semibold">
        {props.aside}
      </p>
    </div>
    <Separator />
  </div>
);

export default function ContributorsPage() {
  return (
    <>
      <PageMeta
        description="Meet the people who build audiocn Solid, audio components built the shadcn way."
        pathname="/contributors"
        title="Contributors"
      />
      <SiteHeader />
      <main class="mx-auto w-full max-w-4xl px-4 pt-12 pb-24 sm:px-6 sm:pt-16">
        <header class="flex flex-col items-center gap-4 pb-12 text-center">
          <img
            src="/brand/logo.svg"
            alt=""
            class="size-16 dark:invert"
            height="64"
            width="64"
          />
          <h1 class="font-heading text-4xl font-medium">Contributors</h1>
          <p class="text-muted-foreground max-w-xl text-balance">
            audiocn is built in the open. Every meter, fader and block exists
            because someone sent a pull request. These are the people behind
            them.
          </p>
        </header>
        <div class="flex flex-col gap-12">
          <Show when={contributors.length}>
            <section aria-label="Contribution totals">
              <dl class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <For
                  each={[
                    {
                      label: "Contributors",
                      value: stats.totalContributors,
                    },
                    { label: "Commits", value: stats.totalContributions },
                  ]}
                >
                  {(stat) => (
                    <div class="rounded-xl border p-6 text-center">
                      <dt class="text-muted-foreground font-mono text-xs font-semibold uppercase">
                        {stat.label}
                      </dt>
                      <dd class="font-heading mt-2 text-4xl font-medium tabular-nums">
                        {format.format(stat.value)}
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </section>
          </Show>
          <section aria-label="Contributor list">
            <SectionHeading
              aside={siteConfig.githubRepo}
              title="Everyone who shipped"
            />
            <Show
              when={contributors.length}
              fallback={
                <div class="mt-4 rounded-xl border border-dashed p-8 text-center">
                  <p class="text-muted-foreground">
                    The contributor list is unavailable right now. It refreshes
                    when this static site is rebuilt. Open the repository
                    directly to see the latest contributors.
                  </p>
                </div>
              }
            >
              <ul class="grid gap-3 pt-4 sm:grid-cols-2">
                <For each={contributors}>
                  {(contributor, index) => (
                    <li class="flex min-w-0">
                      <a
                        class="group hover:border-foreground/40 hover:bg-muted/40 flex h-full w-full items-center gap-4 rounded-xl border p-4 transition-colors"
                        href={contributor.profileUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <span class="text-muted-foreground font-mono text-xs tabular-nums">
                          {String(index() + 1).padStart(2, "0")}
                        </span>
                        <img
                          alt=""
                          class="shrink-0 rounded-full border"
                          height="48"
                          width="48"
                          src={contributor.avatarUrl}
                          loading="lazy"
                        />
                        <span class="flex min-w-0 flex-1 flex-col gap-1">
                          <span class="font-heading truncate font-medium group-hover:underline group-hover:underline-offset-4">
                            {contributor.login}
                          </span>
                          <span>
                            <Badge variant="secondary">
                              {format.format(contributor.contributions)}{" "}
                              {contributor.contributions === 1
                                ? "commit"
                                : "commits"}
                            </Badge>
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          class="text-muted-foreground shrink-0"
                        >
                          ↗
                        </span>
                        <span class="sr-only">
                          {contributor.login} on GitHub
                        </span>
                      </a>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>
          <section aria-label="How to contribute">
            <SectionHeading aside="Open source" title="Join them" />
            <div class="mt-4 rounded-xl border p-8 text-center">
              <p class="text-muted-foreground mx-auto max-w-md">
                Every component ships with tests and a docs page, so a first
                contribution can be as small as one example or one fix. Pick an
                issue, or open one describing the component you wish audiocn
                had.
              </p>
              <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                <a
                  class={buttonVariants()}
                  href={repositoryUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  View the repository
                </a>
                <a
                  class={buttonVariants({ variant: "outline" })}
                  href={`${repositoryUrl}/issues`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Browse open issues
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
