import type { JSX } from "@solidjs/web";

import { cn } from "@/lib/utils";

interface ShowcaseCardProps {
  children?: JSX.Element;
  class?: string;
  href: string;
  label: string;
}

export const ShowcaseCard = (props: ShowcaseCardProps) => (
  <article
    aria-label={props.label}
    class={cn(
      "bg-card text-card-foreground flex min-w-0 flex-col gap-4 rounded-xl border p-4",
      props.class
    )}
    data-slot="showcase-card"
  >
    <a
      class="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -m-1 flex w-fit items-center gap-1 rounded-sm p-1 font-mono text-xs tracking-wider uppercase transition-colors outline-none focus-visible:ring-3"
      href={props.href}
    >
      {props.label}
      <span class="sr-only"> docs</span>
      <span aria-hidden="true">↗</span>
    </a>
    <div class="flex min-h-28 min-w-0 flex-1 flex-col items-center justify-center">
      {props.children}
    </div>
  </article>
);
