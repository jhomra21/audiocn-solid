import type { JSX } from "@solidjs/web";

import { cn } from "@/lib/utils";
import { DocsIcon } from "@/site/components/docs/phosphor-icons";

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
      class="group/label text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -m-1 flex w-fit items-center gap-1 rounded-sm p-1 font-mono text-xs tracking-wider uppercase transition-colors outline-none focus-visible:ring-3"
      href={props.href}
    >
      {props.label}
      <span class="sr-only"> docs</span>
      <DocsIcon
        name="ArrowUpRight"
        class="size-3 transition-transform group-hover/label:translate-x-0.5 group-hover/label:-translate-y-0.5"
      />
    </a>
    <div class="flex min-w-0 flex-1 flex-col items-center justify-center">
      {props.children}
    </div>
  </article>
);
