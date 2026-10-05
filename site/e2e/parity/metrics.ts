import type { Page } from "@playwright/test";

interface PageMetrics {
  content: { tag: string; text: string }[];
  examples: {
    controls: { label: string; role: string; tag: string; type: string }[];
    media: { canvas: number; images: number; svg: number };
    nonempty: boolean;
    slots: Record<string, number>;
  }[];
  registeredExamples: string[];
  gaps: string[];
  headings: { level: number; text: string }[];
  slots: Record<string, number>;
  overflow: number;
  layout: {
    articleWidth: number;
    headingFontSize: string;
    previews: { height: number; width: number; x: number; y: number }[];
  };
}

export const inspectPage = async (page: Page): Promise<PageMetrics> =>
  page.locator("body").evaluate((body) => {
    const main = body.querySelector("main") ?? body;
    const title = main.querySelector("h1");

    const headings = [...main.querySelectorAll("h1, h2, h3")].flatMap(
      (heading) => {
        if (heading.closest("aside")) {
          return [];
        }

        const text = (heading.textContent ?? "")
          .replace("Copy Anchor Link", "")
          .trim();

        return {
          level: Number(heading.tagName.slice(1)),
          text,
        };
      }
    );

    const countSlots = (root: Element) => {
      const counts: Record<string, number> = {};

      for (const element of [root, ...root.querySelectorAll("[data-slot]")]) {
        if (!element.hasAttribute("data-slot")) continue;
        const slot = element.getAttribute("data-slot") ?? "";
        counts[slot] = (counts[slot] ?? 0) + 1;
      }

      return Object.fromEntries(
        Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
      );
    };

    return {
      content: [...main.querySelectorAll("p, li, th, td")].flatMap((element) =>
        element.closest(
          '[data-slot="component-preview"], [role="tabpanel"], aside, nav'
        )
          ? []
          : [
              {
                tag: element.tagName.toLowerCase(),
                text: element.textContent?.replace(/\s+/g, " ").trim() ?? "",
              },
            ]
      ),
      examples: [
        ...main.querySelectorAll('[data-slot="component-preview"]'),
      ].map((preview) => ({
        controls: [
          ...preview.querySelectorAll(
            'button, input, select, [role="slider"], [role="switch"]'
          ),
        ].map((control) => ({
          label:
            control.getAttribute("aria-label") ??
            control.getAttribute("title") ??
            (control.tagName === "BUTTON"
              ? (control.textContent?.trim() ?? "")
              : ""),
          role: control.getAttribute("role") ?? "",
          tag: control.tagName.toLowerCase(),
          type: control.getAttribute("type") ?? "",
        })),
        media: {
          canvas: preview.querySelectorAll("canvas").length,
          images: preview.querySelectorAll("img").length,
          svg: preview.querySelectorAll("svg").length,
        },
        nonempty:
          preview.children.length > 0 &&
          !preview.querySelector(
            "[data-not-yet-ported], [data-docs-ssr-error]"
          ) &&
          (Boolean(preview.textContent?.trim()) ||
            preview.querySelector(
              "[data-slot], canvas, svg, img, input, button"
            ) !== null),
        slots: countSlots(preview),
      })),
      registeredExamples: [...main.querySelectorAll("[data-example]")].map(
        (preview) => preview.getAttribute("data-example") ?? ""
      ),
      gaps: [
        ...main.querySelectorAll(
          "[data-not-yet-ported], [data-docs-ssr-error], [data-docs-route-not-yet-ported], [data-route-not-yet-ported], [data-docs-route-unavailable]"
        ),
      ].map(
        (marker) =>
          marker.getAttribute("data-not-yet-ported") ??
          marker.getAttribute("data-docs-ssr-error") ??
          (marker.hasAttribute("data-docs-route-unavailable")
            ? `Unavailable route ${marker.getAttribute("data-docs-route-unavailable")}`
            : null) ??
          "Unported page"
      ),
      headings,
      slots: countSlots(main),
      overflow: Math.max(
        0,
        document.documentElement.scrollWidth - window.innerWidth
      ),
      layout: {
        articleWidth: Math.round(
          (main.querySelector("article") ?? main).getBoundingClientRect().width
        ),
        headingFontSize: title ? getComputedStyle(title).fontSize : "",
        previews: [
          ...main.querySelectorAll('[data-slot="component-preview"]'),
        ].map((preview) => {
          const { height, width, x, y } = preview.getBoundingClientRect();

          return {
            height: Math.round(height),
            width: Math.round(width),
            x: Math.round(x),
            y: Math.round(y),
          };
        }),
      },
    };
  });
