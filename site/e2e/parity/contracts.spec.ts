import { expect, test } from "@playwright/test";

import allowlist from "./allowlist.json" with { type: "json" };
import {
  adaptChrome,
  captureSidebarStep,
  collapseSidebar,
  inspectBrandMenu,
  inspectChrome,
  inspectMobileMenu,
  normalizeChrome,
  parseSnapshot,
} from "./chrome";
import { adaptContent } from "./content-adapters";
import {
  adaptHead,
  checkOgImage,
  inspectHead,
  normalizeLocalHead,
  type HeadTag,
} from "./head";
import { inspectPage } from "./metrics";
import { adaptNotFound, inspectNotFound, readNotFound } from "./not-found";
import {
  inventoryDifferences,
  readLocalSitemap,
  sitemapRoutes,
} from "./sitemap";

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

const tag = (key: string, value: string, kind: HeadTag["kind"] = "meta") => ({
  key,
  kind,
  sizes: "",
  type: "",
  value,
});

test("head adapters rewrite only the provable differences and reject stale upstream text", () => {
  const upstream = [
    tag("title", "Knob for React — audiocn", "title"),
    tag("og:site_name", "audiocn"),
    tag("canonical", "https://audiocn.dev/docs/components/knob", "link"),
    tag("og:image", "https://audiocn.dev/og/knob-d3e4fb48b37f.png"),
    {
      ...tag("icon", "/icon.png?icon.2adr47o_2sjc7.png", "link"),
      sizes: "64x64",
    },
  ];

  expect(adaptHead("/docs/components/knob", upstream)).toEqual(
    normalizeLocalHead([
      tag("title", "Knob for Solid — audiocn Solid", "title"),
      tag("og:site_name", "audiocn Solid"),
      tag(
        "canonical",
        "https://audiocn-solid.workers.dev/docs/components/knob",
        "link"
      ),
      tag("og:image", "https://audiocn-solid.workers.dev/og/knob.png"),
      { ...tag("icon", "/icon.png", "link"), sizes: "64x64" },
    ])
  );

  const homeTitle = "audiocn — Audio components for React and shadcn/ui";

  const homeDescription =
    "Copy-and-paste audio components for React and shadcn/ui. Build mixers, players, meters, knobs and waveforms with accessible UI you own.";

  const home = [
    tag("title", homeTitle, "title"),
    tag("og:title", homeTitle),
    tag("twitter:title", homeTitle),
    tag("description", homeDescription),
    tag("og:description", homeDescription),
    tag("twitter:description", homeDescription),
  ];

  expect(adaptHead("/", home).map(({ key, value }) => [key, value])).toEqual([
    [
      "description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    [
      "og:description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    ["og:title", "audiocn Solid — Audio components for Solid"],
    ["title", "audiocn Solid — Audio components for Solid"],
    [
      "twitter:description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    ["twitter:title", "audiocn Solid — Audio components for Solid"],
  ]);
  expect(adaptHead("/docs", home).map(({ value }) => value)).not.toContain(
    "audiocn Solid — Audio components for Solid"
  );
  expect(() =>
    adaptHead("/", [
      tag("title", "audiocn — A different home title", "title"),
      ...home.slice(1),
    ])
  ).toThrow("Stale head adapter");
  expect(() => adaptHead("/", home.slice(0, 5))).toThrow("Stale head adapter");
});

for (const mutation of [
  "removed og tag",
  "changed canonical",
  "dropped icon link",
  "dropped apple-touch-icon",
  "changed twitter card",
  "extra og tag",
  "changed og image size",
  "changed description",
] as const) {
  test(`a ${mutation} remains an observable head difference`, async ({
    page,
  }) => {
    await page.goto("/docs/components/knob");
    const before = normalizeLocalHead(await inspectHead(page));

    await page.evaluate((change) => {
      const head = document.head;

      const meta = (selector: string) =>
        head.querySelector<HTMLElement>(selector);

      if (change === "removed og tag")
        meta('meta[property="og:title"]')?.remove();

      if (change === "changed canonical")
        meta('link[rel="canonical"]')?.setAttribute(
          "href",
          "https://example.com/"
        );

      if (change === "dropped icon link") meta('link[rel="icon"]')?.remove();

      if (change === "dropped apple-touch-icon")
        meta('link[rel="apple-touch-icon"]')?.remove();

      if (change === "changed twitter card")
        meta('meta[name="twitter:card"]')?.setAttribute("content", "summary");

      if (change === "extra og tag") {
        const extra = document.createElement("meta");
        extra.setAttribute("property", "og:video");
        extra.setAttribute("content", "https://example.com/v.mp4");
        head.append(extra);
      }

      if (change === "changed og image size")
        meta('meta[property="og:image:width"]')?.setAttribute("content", "1");

      if (change === "changed description")
        meta('meta[name="description"]')?.setAttribute("content", "Changed");
    }, mutation);

    expect(normalizeLocalHead(await inspectHead(page))).not.toEqual(before);
  });
}

test("an og:image that does not load at 1200 by 630 is detected", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  const tags = await inspectHead(page);

  expect(await checkOgImage(page, tags)).toEqual({
    contentType: "image/png",
    height: 630,
    status: 200,
    width: 1200,
  });

  const declare = (value: string) =>
    tags.map((entry) =>
      entry.key === "og:image" ? { ...entry, value } : entry
    );

  expect(
    await checkOgImage(
      page,
      declare("https://audiocn-solid.workers.dev/og/missing.png")
    )
  ).not.toMatchObject({ contentType: "image/png" });
  expect(
    await checkOgImage(
      page,
      declare("https://audiocn-solid.workers.dev/apple-icon.png")
    )
  ).toMatchObject({ height: 180, width: 180 });
});

test("chrome snapshots keep roles, names, states, hrefs and group labels in order", () => {
  const snapshot = `- navigation:
  - link "audiocn":
    - /url: /
  - button "Search ⌘ K"
  - button "Collapse Sidebar" [expanded]
  - paragraph: Getting started
  - paragraph:
    - text: Built by
  - combobox "Theme": Stone
  - link "205 stars on GitHub":
    - /url: https://github.com/audiocn/ui
    - text: "205"`;

  const items = parseSnapshot("aside", snapshot);

  expect(items).toEqual([
    'aside link "audiocn" -> /',
    'aside button "Search ⌘ K"',
    'aside button "Collapse Sidebar" [expanded]',
    'aside paragraph "Getting started"',
    'aside combobox "Theme"',
    'aside link "205 stars on GitHub" -> https://github.com/audiocn/ui',
  ]);
  expect(adaptChrome(items)).toEqual([
    'aside link "audiocn Solid" -> /',
    'aside button "Search ⌘ K"',
    'aside button "Collapse Sidebar" [expanded]',
    'aside paragraph "Getting started"',
    'aside combobox "Theme"',
    'aside link "N stars on GitHub" -> https://github.com/jhomra21/audiocn-solid',
  ]);
  expect(adaptChrome(['header link "audiocn" -> /docs'])).toEqual([
    'header link "audiocn" -> /docs',
  ]);
  expect(
    normalizeChrome(['header button "0.25 Installation Requirements"'])
  ).toEqual(['header button "Installation Requirements"']);
});

test("removing or renaming a header or sidebar control remains an observable chrome difference", async ({
  page,
}) => {
  await page.goto("/");
  const header = await inspectChrome(page);

  expect(header).toContain('header link "Docs" -> /docs');
  expect(header.some((item) => item.includes("stars on GitHub"))).toBe(true);

  for (const change of [
    () =>
      page
        .locator('header a[href="/docs/blocks"]')
        .evaluate((link) => link.remove()),
    () =>
      page.locator('header a[href="/docs"]').evaluate((link) => {
        link.textContent = "Documentation";
      }),
    () =>
      page
        .locator('header a[href*="github.com"]')
        .evaluate((link) => link.remove()),
    () =>
      page
        .getByRole("button", { name: "Toggle Theme" })
        .first()
        .evaluate((button) => button.setAttribute("aria-label", "Dark")),
    () =>
      page
        .locator('header a[href="/docs"]')
        .evaluate((link) =>
          link.closest("ul")?.append(link.closest("li") ?? link)
        ),
  ]) {
    await page.goto("/");
    await change();
    expect(await inspectChrome(page)).not.toEqual(header);
  }

  await page.goto("/docs/components/knob");
  const sidebar = await inspectChrome(page);

  await page
    .locator('aside a[href="/docs/components/knob"]')
    .evaluate((link) => {
      link.textContent = "Dial";
    });
  expect(await inspectChrome(page)).not.toEqual(sidebar);

  await page.goto("/docs/components/knob");
  await page
    .locator('aside a[href="/docs/hooks/use-level"]')
    .evaluate((link) => link.remove());
  expect(await inspectChrome(page)).not.toEqual(sidebar);

  await page.goto("/docs/components/knob");
  await page
    .locator('aside a[href*="github.com"]')
    .evaluate((link) => link.remove());
  expect(await inspectChrome(page)).not.toEqual(sidebar);

  await page.goto("/docs/components/knob");
  await page.locator("aside p", { hasText: "Hooks" }).evaluate((label) => {
    label.textContent = "Utilities";
  });
  expect(await inspectChrome(page)).not.toEqual(sidebar);
});

test("the mobile menu and drawer contents are part of the chrome inventory", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  const closed = await inspectChrome(page);
  const menu = await inspectMobileMenu(page);

  expect(menu).not.toEqual(closed);
  expect(menu).toContain('header link "Components" -> /docs/components');

  await page.goto("/");
  await page.getByRole("button", { name: "Toggle Menu" }).click();
  await page
    .locator('#site-menu a[href="/docs/blocks"]')
    .evaluate((link) => link.remove());
  expect(await inspectChrome(page)).not.toEqual(menu);

  await page.goto("/docs/components/knob");
  const drawer = await inspectMobileMenu(page);

  expect(drawer).toContain('aside link "Knob" -> /docs/components/knob');

  await page.goto("/docs/components/knob");
  await page.getByRole("button", { name: "Open Sidebar" }).click();
  await page
    .locator('#docs-sidebar-mobile a[href="/docs/hooks/use-level"]')
    .evaluate((link) => link.remove());
  expect(await inspectChrome(page)).not.toEqual(drawer);
});

test("brand menu items remain part of the chrome inventory", async ({
  page,
}) => {
  await page.goto("/");
  const items = await inspectBrandMenu(page);

  expect(items).toContain('menu menuitem "Download logo SVG"');

  await page
    .getByRole("link", { name: /^audiocn/ })
    .first()
    .click({ button: "right" });
  await page
    .getByRole("menuitem", { name: "Download logo SVG" })
    .evaluate((item) => {
      item.textContent = "Download logo";
    });
  expect(
    parseSnapshot("menu", await page.getByRole("menu").ariaSnapshot())
  ).not.toEqual(items);
});

test("sitemap inventory compares origin-independent public routes", async () => {
  expect(
    sitemapRoutes(
      `<urlset><url><loc>https://audiocn.dev</loc></url><url><loc>https://audiocn.dev/docs/</loc></url><url><loc>https://audiocn.dev/contributors</loc></url></urlset>`
    )
  ).toEqual(["/", "/contributors", "/docs"]);

  const local = sitemapRoutes(await readLocalSitemap());

  expect(local).toContain("/");
  expect(local).toContain("/contributors");
  expect(inventoryDifferences(local, [...local])).toEqual({
    extra: [],
    missing: [],
  });
  expect(inventoryDifferences(local, [...local, "/docs/extra"])).toEqual({
    extra: ["/docs/extra"],
    missing: [],
  });
  expect(inventoryDifferences(local, local.slice(1))).toEqual({
    extra: [],
    missing: ["/"],
  });
});

test("not-found adapters are exact and a broken not-found page remains observable", async ({
  page,
}) => {
  const homeTitle = "audiocn — Audio components for React and shadcn/ui";

  const homeDescription =
    "Copy-and-paste audio components for React and shadcn/ui. Build mixers, players, meters, knobs and waveforms with accessible UI you own.";

  const upstream = {
    actions: [{ href: "/docs", name: "Browse documentation" }],
    head: [
      tag("title", homeTitle, "title"),
      tag("robots", "noindex"),
      tag("og:title", homeTitle),
      tag("twitter:title", homeTitle),
      tag("description", homeDescription),
      tag("og:description", homeDescription),
      tag("twitter:description", homeDescription),
      tag("canonical", "https://audiocn.dev", "link"),
    ],
    heading: "Page not found",
    status: 404,
  };

  const adapted = adaptNotFound(upstream);

  expect(adapted.status).toBe(200);
  expect(adapted.head.map(({ key, value }) => [key, value])).toEqual([
    ["canonical", "https://audiocn-solid.workers.dev"],
    [
      "description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    [
      "og:description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    ["og:title", "audiocn Solid — Audio components for Solid"],
    ["robots", "noindex"],
    ["title", "audiocn Solid — Audio components for Solid"],
    [
      "twitter:description",
      "Copy-and-paste audio components for Solid. Build mixers, players, meters, knobs and waveforms with accessible UI you own.",
    ],
    ["twitter:title", "audiocn Solid — Audio components for Solid"],
  ]);
  expect(() => adaptNotFound({ ...upstream, status: 410 })).toThrow(
    "Stale not-found adapter"
  );
  expect(() =>
    adaptNotFound({
      ...upstream,
      head: [
        tag("title", "Page not found", "title"),
        ...upstream.head.slice(1),
      ],
    })
  ).toThrow("Stale head adapter");

  const missing = "/parity-contract-missing-page";
  const before = await inspectNotFound(page, missing);
  const headValue = (key: string) => before.head.find((t) => t.key === key);

  expect(before).toMatchObject({ heading: "Page not found", status: 200 });
  expect(before.actions.map(({ name }) => name)).toEqual([
    "Browse documentation",
    "Go home",
  ]);
  expect(
    [
      "title",
      "robots",
      "canonical",
      "og:url",
      "og:site_name",
      "twitter:card",
    ].map((key) => [key, headValue(key)?.value])
  ).toEqual([
    ["title", "audiocn Solid — Audio components for Solid"],
    ["robots", "noindex"],
    ["canonical", "https://audiocn-solid.workers.dev"],
    ["og:url", "https://audiocn-solid.workers.dev"],
    ["og:site_name", "audiocn Solid"],
    ["twitter:card", "summary_large_image"],
  ]);

  for (const change of [
    () =>
      page.locator("main h1").evaluate((h1) => {
        h1.textContent = "Missing";
      }),
    () => page.locator('main a[href="/"]').evaluate((link) => link.remove()),
    () =>
      page
        .locator('main a[href="/docs"]')
        .evaluate((link) => link.setAttribute("href", "/")),
    () =>
      page
        .locator('meta[name="robots"]')
        .evaluate((meta) => meta.setAttribute("content", "index")),
    () => page.evaluate(() => (document.title = "Page not found")),
    () =>
      page
        .locator('link[rel="canonical"]')
        .evaluate((link) => link.setAttribute("href", "/404")),
    () =>
      page
        .locator('meta[property="og:title"]')
        .evaluate((meta) => meta.remove()),
  ]) {
    await inspectNotFound(page, missing);
    await change();
    const { actions, head, heading } = await readNotFound(page);

    expect({ actions, head, heading }).not.toEqual({
      actions: before.actions,
      head: before.head,
      heading: before.heading,
    });
  }
});

test("collapsed sidebar attributes, controls and peek remain observable differences", async ({
  page,
}) => {
  await page.goto("/docs/components/knob");
  await collapseSidebar(page);
  const collapsed = await captureSidebarStep(page);

  expect(collapsed.sidebar).toMatchObject({
    aside: { collapsed: "true", hovered: "false", inert: true },
    layoutCollapsed: "true",
    panelInert: false,
  });
  expect(
    collapsed.sidebar.triggers.map(({ expanded, inert, label }) => [
      label,
      expanded,
      inert,
    ])
  ).toEqual([
    ["Collapse Sidebar", "false", true],
    ["Collapse Sidebar", "false", false],
  ]);
  expect(collapsed.chrome).toContain('div button "Open Search"');

  for (const mutate of [
    () =>
      page.evaluate(() => {
        document.querySelector<HTMLElement>("#nd-sidebar")!.inert = false;
      }),
    () =>
      page.evaluate(() => {
        document
          .querySelector('[data-sidebar-panel] [aria-controls="nd-sidebar"]')
          ?.setAttribute("aria-label", "Expand Sidebar");
      }),
    () =>
      page.evaluate(() => {
        document
          .querySelector('[data-sidebar-panel] [aria-controls="nd-sidebar"]')
          ?.setAttribute("aria-expanded", "true");
      }),
    () =>
      page.evaluate(() => {
        document.querySelector("[data-sidebar-panel]")?.remove();
      }),
    () =>
      page.evaluate(() => {
        document
          .querySelector("#nd-sidebar")
          ?.setAttribute("data-hovered", "true");
      }),
    () =>
      page.evaluate(() => {
        document
          .querySelector("#nd-sidebar")
          ?.setAttribute("style", "left: 40px");
      }),
  ]) {
    await page.goto("/docs/components/knob");
    await collapseSidebar(page);
    await mutate();
    expect(await captureSidebarStep(page)).not.toEqual(collapsed);
  }

  await page.goto("/docs/components/knob");
  await collapseSidebar(page);
  await captureSidebarStep(page);
  await page.mouse.move(5, 400);
  await page.locator('aside[data-hovered="true"]').waitFor();
  const peek = await captureSidebarStep(page);

  expect(peek.sidebar).toMatchObject({
    aside: { hovered: "true", inert: false, x: 8 },
    panelInert: true,
  });
  expect(peek).not.toEqual(collapsed);
});
