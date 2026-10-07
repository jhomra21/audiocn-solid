// Adapted from audiocn/ui's @ncdai/brand-assets-menu port, see THIRD_PARTY_NOTICES.md.
import { Portal } from "@solidjs/web";
import { children, createSignal, onCleanup } from "solid-js";

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
import {
  CopyErrorIcon,
  CopyFeedback,
} from "@/site/components/docs/copy-feedback";
import { CheckIcon } from "@/site/components/docs/icons";
import assets from "@/site/lib/brand-assets.json";
import type { CopyFeedbackState } from "@/site/lib/docs/copy-feedback";
import { createCopyFeedback } from "@/site/lib/docs/copy-feedback";

export const BrandAssetsMenu = (props: {
  children: JSXElement;
  class?: string;
}) => {
  const content = children(() => props.children);
  const [message, setMessage] = createSignal("");

  const [displayState, setDisplayState] =
    createSignal<CopyFeedbackState>("idle");

  const [lastResult, setLastResult] = createSignal<"done" | "error">("done");
  const [copyState, copy] = createCopyFeedback(() => currentSvg);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let currentSvg: string | undefined;
  let request = 0;
  let touching = false;
  let touchOpened = false;
  onCleanup(() => {
    request += 1;
    clearTimeout(timer);
  });

  const download = (href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.click();
  };

  const copySvg = async (svg: string) => {
    const copyRequest = ++request;
    currentSvg = svg;
    setDisplayState("idle");
    await copy();

    if (copyRequest !== request) return;

    const result = copyState() === "error" ? "error" : "done";
    setLastResult(result);
    setDisplayState(result);
    setMessage(
      result === "done"
        ? "Copied as SVG"
        : "Could not copy. Download the brand assets instead."
    );
    clearTimeout(timer);
    timer = setTimeout(() => {
      setMessage("");
      setDisplayState("idle");
    }, 3000);
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
            <ContextMenuItem onSelect={() => void copySvg(assets.logomarkSVG)}>
              <img
                src="/brand/logo.svg"
                class="size-4 dark:invert"
                alt=""
                aria-hidden="true"
              />
              Copy logo as SVG
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => void copySvg(assets.logotypeSVG)}>
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
      <Portal>
        <div
          role="status"
          class="bg-popover text-popover-foreground fixed right-4 bottom-4 z-60 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-lg transition-[opacity,visibility] delay-150 duration-150 data-[visible=false]:pointer-events-none data-[visible=false]:invisible data-[visible=false]:opacity-0 data-[visible=true]:delay-0 [&_svg]:size-5"
          data-visible={message() ? "true" : "false"}
        >
          <CopyFeedback
            state={displayState}
            renderIcon={(state) =>
              (state === "idle" ? lastResult() : state) === "done" ? (
                <CheckIcon />
              ) : (
                <CopyErrorIcon />
              )
            }
          />
          {message()}
        </div>
      </Portal>
    </>
  );
};
