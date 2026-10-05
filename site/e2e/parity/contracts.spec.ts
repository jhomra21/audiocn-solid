import { expect, test } from "@playwright/test";

import allowlist from "./allowlist.json" with { type: "json" };
import { adaptContent } from "./content-adapters";
import { inspectPage } from "./metrics";

test.afterEach(async ({ page }, info) => {
  if (page.url() === "about:blank") return;
  await info.attach("rendered-metrics", {
    body: JSON.stringify(await inspectPage(page), null, 2),
    contentType: "application/json",
  });
  await info.attach("rendered-page", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});

test("framework prose adapters are exact, route-scoped, and reject stale upstream text", () => {
  const upstream = [
    {
      tag: "p",
      text: "Outside React, createDemoSignal(options) returns the same object.",
    },
  ];

  const local = [
    {
      tag: "p",
      text: "Outside Solid, createDemoSignal(options) returns the same object.",
    },
  ];

  expect(adaptContent("/docs/hooks/use-demo-signal", upstream)).toEqual(local);
  expect(adaptContent("/docs/components/level-meter", upstream)).toEqual(
    upstream
  );
  expect(() =>
    adaptContent("/docs/hooks/use-demo-signal", [
      {
        tag: "p",
        text: "Outside React, createDemoSignal(options) returns a different object.",
      },
    ])
  ).toThrow("Stale prose adapter");
  expect(adaptContent("/docs/hooks/use-demo-signal", upstream)).not.toEqual([]);
});

test("parity exemptions are exact and do not hide mixer or slot differences", () => {
  expect(allowlist.some((entry) => entry.route === "*")).toBe(false);
  expect(
    allowlist.some((entry) => entry.route === "/docs/components/mixer")
  ).toBe(false);

  for (const entry of allowlist) {
    expect(entry.upstream.length).toBeGreaterThan(0);
    expect(entry.reason.length).toBeGreaterThan(0);
    expect([2, 3]).toContain(entry.level);
  }
});

test("an empty preview cannot pass as a rendered example", async ({ page }) => {
  await page.goto("/docs/components/fader");
  const before = await inspectPage(page);
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => preview.replaceChildren());
  const after = await inspectPage(page);
  expect(after.examples).not.toEqual(before.examples);
  expect(after.examples[0].nonempty).toBe(false);
});

test("whitespace wrappers cannot pass as rendered example content", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      preview.innerHTML = "<div>   </div>";
    });
  expect((await inspectPage(page)).examples[0].nonempty).toBe(false);
});

test("removing actual controls changes the example even with slots preserved", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const before = await inspectPage(page);
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) =>
      preview
        .querySelectorAll("input, button, [role='slider']")
        .forEach((control) => control.remove())
    );
  expect((await inspectPage(page)).examples).not.toEqual(before.examples);
});

test("native ranges and ARIA sliders compare by their accessible contract without duplicate hidden inputs", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const before = await inspectPage(page);
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      const thumb = preview.querySelector('[role="slider"]')!;
      const input = document.createElement("input");
      input.type = "range";

      for (const attribute of thumb.attributes) {
        if (
          attribute.name.startsWith("aria-") ||
          attribute.name === "data-slot"
        )
          input.setAttribute(attribute.name, attribute.value);
      }

      thumb.replaceWith(input);
    });
  expect((await inspectPage(page)).examples[0].controls).toEqual(
    before.examples[0].controls
  );
  await page
    .locator('[data-slot="component-preview"] input[type="range"]')
    .first()
    .evaluate((input) => input.remove());
  expect((await inspectPage(page)).examples[0].controls).not.toEqual(
    before.examples[0].controls
  );
});

test("missing prose is detected even when headings and wrappers survive", async ({
  page,
}) => {
  await page.goto("/docs/concepts/decibels");
  const before = await inspectPage(page);
  await page
    .locator(".docs-article p")
    .evaluateAll((paragraphs) =>
      paragraphs.forEach((paragraph) => paragraph.remove())
    );
  expect((await inspectPage(page)).content).not.toEqual(before.content);
});

for (const mutation of ["label", "role", "number"] as const) {
  test(`changing a control's ${mutation} remains an observable difference`, async ({
    page,
  }) => {
    await page.goto("/docs/components/parameter-slider");
    const before = await inspectPage(page);
    await page
      .locator('[data-slot="component-preview"]')
      .first()
      .evaluate((preview, change) => {
        if (change === "number")
          preview
            .querySelector('[data-slot="parameter-slider-input"]')
            ?.setAttribute("type", "checkbox");
        else
          preview
            .querySelector('[role="slider"]')
            ?.setAttribute(
              change === "label" ? "aria-label" : "role",
              change === "label" ? "Wrong gain" : "img"
            );
      }, mutation);
    expect((await inspectPage(page)).examples[0].controls).not.toEqual(
      before.examples[0].controls
    );
  });
}

test("presentation slot changes and horizontal overflow remain observable", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const before = await inspectPage(page);
  await page.locator("main").evaluate((main) => {
    main.setAttribute("data-slot", "parity-contract-slot");
    main.style.minWidth = "2000px";
  });
  const after = await inspectPage(page);
  expect(after.slots).not.toEqual(before.slots);
  expect(after.overflow).toBeGreaterThan(0);
  expect(after.layout).not.toEqual(before.layout);
});

test("unavailable examples and placeholder routes remain explicit gaps after ports are complete", async ({
  page,
}) => {
  await page.goto("/docs/components/volume-control");
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      const marker = document.createElement("div");
      marker.dataset.notYetPorted = "Example volume-control-popover";
      preview.replaceChildren(marker);
    });
  expect((await inspectPage(page)).gaps).toContain(
    "Example volume-control-popover"
  );
  await page.goto("/docs/hooks/use-demo-signal");
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      const marker = document.createElement("div");
      marker.dataset.notYetPorted = "Example frame-source-demo";
      preview.replaceChildren(marker);
    });
  expect((await inspectPage(page)).gaps).toContain("Example frame-source-demo");
  await page.goto("/docs/components/bar-visualizer");
  await page.locator("main").evaluate((main) => {
    const marker = document.createElement("div");
    marker.setAttribute(
      "data-docs-route-not-yet-ported",
      "/docs/components/bar-visualizer"
    );
    main.append(marker);
  });
  expect((await inspectPage(page)).gaps).toContain("Unported page");
  await page.goto("/docs/hooks/use-level");
  await page.locator("main").evaluate((main) => {
    const marker = document.createElement("div");
    marker.setAttribute(
      "data-docs-route-not-yet-ported",
      "/docs/hooks/use-level"
    );
    main.append(marker);
  });
  expect((await inspectPage(page)).gaps).toContain("Unported page");
});

test("unknown docs routes expose an unavailable marker rather than an empty successful page", async ({
  page,
}) => {
  await page.goto("/docs/parity-not-found");
  await expect(page.locator("[data-docs-route-unavailable]")).toHaveAttribute(
    "data-docs-route-unavailable",
    "/docs/parity-not-found"
  );
});

test("SSR errors cannot pass as rendered examples", async ({ page }) => {
  await page.goto("/docs/components/fader");
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      preview.innerHTML =
        '<div data-docs-ssr-error="fader-demo">Render failed</div>';
    });
  const metrics = await inspectPage(page);
  expect(metrics.gaps).toContain("fader-demo");
  expect(metrics.examples[0].nonempty).toBe(false);
});

test("missing component slots cannot pass as a rendered example", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  const before = await inspectPage(page);
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) =>
      preview
        .querySelectorAll("[data-slot]")
        .forEach((element) => element.removeAttribute("data-slot"))
    );
  expect((await inspectPage(page)).examples).not.toEqual(before.examples);
});

test("an unported marker is an explicit gap, even inside a preview wrapper", async ({
  page,
}) => {
  await page.goto("/docs/components/fader");
  await page
    .locator('[data-slot="component-preview"]')
    .first()
    .evaluate((preview) => {
      const marker = document.createElement("div");
      marker.setAttribute("data-not-yet-ported", "Example fader-demo");
      marker.textContent = "Not yet ported";
      preview.replaceChildren(marker);
    });
  expect(await inspectPage(page)).toMatchObject({
    gaps: ["Example fader-demo"],
  });
});
