import * as TooltipPrimitive from "@kobalte/core/tooltip";
import { createSignal, onCleanup } from "solid-js";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import stars from "@/site/lib/github-stars.json";
import { siteConfig } from "@/site/lib/site";

import "./github-stars.css";

const compactCount = new Intl.NumberFormat("en-US", {
  compactDisplay: "short",
  notation: "compact",
})
  .format(stars.stargazersCount)
  .toLowerCase();

const fullCount = new Intl.NumberFormat("en-US").format(stars.stargazersCount);

/**
 * GitHub star count with a compact label and the full count in a tooltip.
 * The count is a build-time snapshot, see `scripts/build-github-stars.ts`.
 * Adapted from https://chanhdai.com/components/github-stars.
 */
export const GitHubStars = () => {
  let trigger: HTMLElement | undefined;
  let exitTimer: ReturnType<typeof setTimeout> | undefined;
  const [retained, setRetained] = createSignal(false);

  const onOpenChange = (open: boolean) => {
    clearTimeout(exitTimer);

    if (open) {
      setRetained(true);
    } else {
      exitTimer = setTimeout(() => setRetained(false), 150);
    }
  };

  onCleanup(() => clearTimeout(exitTimer));

  return (
    <TooltipPrimitive.Root
      forceMount={retained()}
      onOpenChange={onOpenChange}
      openDelay={0}
    >
      <TooltipPrimitive.Trigger
        aria-label={`${fullCount} stars on GitHub`}
        as="a"
        class={cn(buttonVariants({ variant: "ghost" }), "gap-1.5 pr-1.5 pl-2")}
        data-slot="button"
        href={`https://github.com/${siteConfig.githubRepo}`}
        rel="noopener noreferrer"
        target="_blank"
        ref={(node) => {
          trigger = node;
        }}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path
            d="M12 0C5.37 0 0 5.372 0 11.997 0 17.3 3.438 21.795 8.205 23.38c.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.609-4.042-1.609C4.422 17.77 3.633 17.4 3.633 17.4c-1.087-.744.084-.73.084-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.417-1.304.76-1.604-2.665-.3-5.466-1.332-5.466-5.929 0-1.31.465-2.38 1.235-3.219-.135-.303-.54-1.523.105-3.175 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.006 2.04.138 3 .404 2.28-1.551 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.608-2.805 5.623-5.475 5.918.42.36.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.284 0 .315.21.69.825.57C20.565 21.79 24 17.291 24 11.997 24 5.372 18.627 0 12 0"
            fill="currentColor"
          />
        </svg>
        <span class="text-muted-foreground text-xs/none tabular-nums">
          {compactCount}
        </span>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal mount={trigger?.closest("dialog") ?? undefined}>
        <TooltipPrimitive.Content class="github-stars-tooltip bg-foreground text-background z-50 inline-flex w-fit max-w-xs origin-(--kb-tooltip-content-transform-origin) items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs">
          {fullCount} stars
          <TooltipPrimitive.Arrow />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};
