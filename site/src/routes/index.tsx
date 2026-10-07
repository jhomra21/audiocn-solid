import { buttonVariants } from "@/components/ui/button";
import { InstallCommand } from "@/site/components/docs/mdx-components";
import { PageMeta } from "@/site/components/docs/page-meta";
import { SiteFooter } from "@/site/components/docs/site-footer";
import { SiteHeader } from "@/site/components/docs/site-header";
import { HeroThreads } from "@/site/components/home/hero-threads";
import { ShowcaseGrid } from "@/site/components/home/showcase-grid";
import { ThemeSwatches } from "@/site/components/home/theme-swatches";
import { siteConfig } from "@/site/lib/site";

const componentCount = 23;

export default function Home() {
  return (
    <>
      <PageMeta pathname="/" title={siteConfig.name} />

      <SiteHeader />

      <main class="w-full flex-1">
        <section class="relative isolate overflow-hidden px-4 pt-16 pb-24 sm:px-6 lg:pt-24 lg:pb-32">
          <div
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-150 mask-b-from-60% lg:bottom-4"
          >
            <HeroThreads />
          </div>
          <div class="mx-auto flex max-w-7xl flex-col items-center gap-6 text-center">
            <a
              class="home-hero-pill text-muted-foreground hover:text-foreground hover:bg-muted/60 focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors outline-none focus-visible:ring-3"
              href="/docs/components"
            >
              Audio components for shadcn/ui
              <svg
                aria-hidden="true"
                class="home-hero-pill-arrow size-3 transition-transform"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </a>
            <h1 class="font-heading max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              Audio UI, mixed and mastered.
            </h1>
            <p class="text-muted-foreground max-w-2xl text-base text-balance sm:text-lg">
              Meters, faders, knobs, visualizers and a complete mixer for Solid.
              Built the shadcn way, so you own every line.
            </p>
            <div class="flex flex-wrap justify-center gap-3">
              <a
                class={buttonVariants({ size: "lg" })}
                data-slot="button"
                href="/docs"
              >
                Get started
              </a>
              <a
                class={buttonVariants({ size: "lg", variant: "outline" })}
                data-slot="button"
                href="/docs/components"
              >
                Browse components
              </a>
            </div>
            <div class="w-full max-w-md text-left">
              <InstallCommand
                command={`npx shadcn@latest add ${siteConfig.registryNamespace}/mixer`}
              />
            </div>
          </div>
        </section>

        <div class="mx-auto flex w-full max-w-7xl flex-col px-4 pb-24 sm:px-6">
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-muted-foreground text-sm">
              Everything here is live. Drag a fader, turn a knob, hit a pad.
            </p>
            <ThemeSwatches />
          </div>

          <ShowcaseGrid />

          <div class="mt-12 flex justify-center">
            <a
              class={buttonVariants({ size: "lg", variant: "outline" })}
              data-slot="button"
              href="/docs/components"
            >
              Browse all {componentCount} components
              <svg
                aria-hidden="true"
                class="size-4"
                data-icon="inline-end"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
