// Adapted from audiocn/ui's @ncdai/brand-assets-menu port, see THIRD_PARTY_NOTICES.md.
import { Show, children, createSignal, onCleanup } from "solid-js";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { JSXElement } from "@/lib/solid/jsx-types";
import {
  DownloadIcon,
  FileSvgIcon,
  FilePngIcon,
  TextIcon,
} from "@/site/components/docs/brand-assets-icons";
import assets from "@/site/lib/brand-assets.json";

export const BrandAssetsMenu = (props: {
  children: JSXElement;
  class?: string;
}) => {
  const content = children(() => props.children);
  const [message, setMessage] = createSignal("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let touching = false;
  let touchOpened = false;
  onCleanup(() => clearTimeout(timer));

  const download = (href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
  };

  const copy = async (svg: string) => {
    try {
      await navigator.clipboard.writeText(svg);
      setMessage("Copied as SVG");
    } catch {
      setMessage("Could not copy. Download the brand assets instead.");
    }

    clearTimeout(timer);
    timer = setTimeout(() => setMessage(""), 3000);
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(open) => {
          touchOpened = open && touching;
        }}
      >
        <ContextMenuTrigger
          as="a"
          href="/"
          class={props.class}
          data-brand-assets-trigger
          onKeyDown={(event) => {
            if (
              event.key !== "ContextMenu" &&
              !(event.key === "F10" && event.shiftKey)
            )
              return;
            event.preventDefault();
            const bounds = event.currentTarget.getBoundingClientRect();
            event.currentTarget.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                clientX: bounds.left + bounds.width / 2,
                clientY: bounds.bottom,
              })
            );
          }}
          onTouchStart={() => {
            touching = true;
          }}
          onTouchCancel={() => {
            touching = false;
            touchOpened = false;
          }}
          onTouchEnd={(event) => {
            if (touchOpened) event.preventDefault();
            touching = false;
            touchOpened = false;
          }}
        >
          {content()}
        </ContextMenuTrigger>
        <ContextMenuContent aria-label="Brand assets" class="w-64">
          <ContextMenuGroup>
            <ContextMenuLabel>audiocn</ContextMenuLabel>
            <ContextMenuItem onSelect={() => void copy(assets.logomarkSVG)}>
              <img
                src="/brand/logo.svg"
                class="size-4 dark:invert"
                alt=""
                aria-hidden="true"
              />
              Copy logo as SVG
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => void copy(assets.logotypeSVG)}>
              <TextIcon class="size-4" />
              Copy wordmark as SVG
            </ContextMenuItem>
          </ContextMenuGroup>
          <ContextMenuSeparator />
          <ContextMenuGroup>
            <ContextMenuItem
              onSelect={() => download("/brand/logo.svg", "audiocn-logo.svg")}
            >
              <FileSvgIcon class="size-4" />
              Download logo SVG
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => download("/brand/logo.png", "audiocn-logo.png")}
            >
              <FilePngIcon class="size-4" />
              Download logo PNG
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                download(
                  "/brand/audiocn-brand-assets.zip",
                  "audiocn-brand-assets.zip"
                )
              }
            >
              <DownloadIcon class="size-4" />
              Download brand assets
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      <Show when={message()}>
        <div
          role="status"
          class="bg-popover text-popover-foreground fixed right-4 bottom-4 z-60 rounded-xl border px-4 py-3 text-sm shadow-lg"
        >
          {message()}
        </div>
      </Show>
    </>
  );
};
