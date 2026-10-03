import { Show, createSignal } from "solid-js";

import { cn } from "@/lib/utils";

interface ComponentPreviewProps {
  align?: "center" | "start" | "end";
  className?: string;
  code: string;
  children?: any;
}

export const ComponentPreview = (props: ComponentPreviewProps) => {
  const [tab, setTab] = createSignal<"preview" | "code">("preview");
  const align = () => props.align ?? "center";

  return (
    <div class="not-prose my-6" data-slot="component-preview-tabs">
      <div class="group/tabs flex gap-2 flex-col" data-orientation="horizontal" data-slot="tabs">
        <div
          class="group/tabs-list text-muted-foreground inline-flex h-8 w-fit items-center justify-center gap-1 rounded-none bg-transparent p-[3px]"
          data-slot="tabs-list"
          data-variant="line"
        >
          <button
            class="text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-transparent! px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 after:bg-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:opacity-0 after:transition-opacity data-active:text-foreground data-active:after:opacity-100"
            data-active={tab() === "preview" ? "" : undefined}
            data-slot="tabs-trigger"
            onClick={() => setTab("preview")}
            type="button"
          >
            Preview
          </button>
          <button
            class="text-foreground/60 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-transparent! px-1.5 py-0.5 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 after:bg-foreground after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:opacity-0 after:transition-opacity data-active:text-foreground data-active:after:opacity-100"
            data-active={tab() === "code" ? "" : undefined}
            data-slot="tabs-trigger"
            onClick={() => setTab("code")}
            type="button"
          >
            Code
          </button>
        </div>

        <Show
          when={tab() === "preview"}
          fallback={
            <div class="flex-1 text-sm outline-none" data-slot="tabs-content">
              <pre class="bg-code text-code-foreground max-h-[32rem] overflow-auto rounded-xl border p-4 text-xs">
                <code>{props.code}</code>
              </pre>
            </div>
          }
        >
          <div class="flex-1 text-sm outline-none" data-slot="tabs-content">
            <div
              class={cn(
                "bg-background flex min-h-72 w-full justify-center rounded-xl border p-4 sm:p-10",
                align() === "center" && "items-center",
                align() === "start" && "items-start",
                align() === "end" && "items-end",
                props.className
              )}
              data-slot="component-preview"
            >
              {props.children}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
};
