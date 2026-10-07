import { expect, test } from "@playwright/test";
import type { Locator } from "@playwright/test";

const observeCopyFeedback = (copy: Locator) =>
  copy.evaluate((button) => {
    const phases = new Set<string>();

    const frames: Record<
      string,
      { filter: string; opacity: number; transform: string }
    > = {};

    const sample = () => {
      for (const icon of button.querySelectorAll<HTMLElement>(
        "[data-copy-icon]"
      )) {
        const state = icon.dataset.copyIcon!;
        phases.add(
          `${state}:${icon.dataset.copyPhase}:${icon.dataset.copyMotion}`
        );

        const style = getComputedStyle(icon);
        const opacity = Number(style.opacity);

        if (
          !frames[state] &&
          style.filter.includes("blur") &&
          opacity > 0 &&
          opacity < 1 &&
          style.transform !== "none"
        ) {
          frames[state] = {
            filter: style.filter,
            opacity,
            transform: style.transform,
          };
        }
      }

      button.setAttribute(
        "data-observed-copy-phases",
        JSON.stringify([...phases])
      );
      button.setAttribute("data-observed-copy-frames", JSON.stringify(frames));
    };

    const observer = new MutationObserver(sample);
    observer.observe(button, {
      attributes: true,
      attributeFilter: [
        "data-copy-phase",
        "data-copy-motion",
        "data-copy-icon",
      ],
      childList: true,
      subtree: true,
    });

    const frame = () => {
      if (!button.isConnected) {
        observer.disconnect();

        return;
      }

      sample();
      requestAnimationFrame(frame);
    };

    frame();
  });

test("home hydrates its server markup and activates native controls", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const hydrationWarnings: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());

    if (
      /Hydration (key miss|tag mismatch|completed with)/.test(message.text())
    ) {
      hydrationWarnings.push(message.text());
    }
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const trigger = page.getByRole("button", { name: "Toggle Menu" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-menu")).toBeVisible();
  await trigger.focus();
  await page.keyboard.press("Escape");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Open Search" }).click();
  await expect(
    page.getByRole("dialog", { name: "Search documentation" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", {
      name: "Audio UI, mixed and mastered.",
    })
  ).toBeVisible();
  await testInfo.attach("native-hydration", {
    body: JSON.stringify({ errors, hydrationWarnings }),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  expect(hydrationWarnings).toEqual([]);
});

test("home install command gives animated, audible success and error feedback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const frequencies: number[] = [];
    const starts: number[] = [];

    const audio = {
      frequencies,
      starts,
    };

    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: number[]) => {
        document.documentElement.dataset.copyHapticPattern = pattern.join(",");

        return true;
      },
    });

    const OriginalAudioContext = window.AudioContext;

    if (!OriginalAudioContext) return;

    const createOscillator = OriginalAudioContext.prototype.createOscillator;
    OriginalAudioContext.prototype.createOscillator = function () {
      const oscillator = createOscillator.call(this);

      const setFrequency = oscillator.frequency.setValueAtTime.bind(
        oscillator.frequency
      );

      oscillator.frequency.setValueAtTime = (value, when) => {
        audio.frequencies.push(value);
        document.documentElement.dataset.copyAudioFrequencies =
          audio.frequencies.join(",");

        return setFrequency(value, when);
      };

      const rampFrequency =
        oscillator.frequency.exponentialRampToValueAtTime.bind(
          oscillator.frequency
        );

      oscillator.frequency.exponentialRampToValueAtTime = (value, when) => {
        audio.frequencies.push(value);
        document.documentElement.dataset.copyAudioFrequencies =
          audio.frequencies.join(",");

        return rampFrequency(value, when);
      };

      const start = oscillator.start.bind(oscillator);
      oscillator.start = (when?: number) => {
        audio.frequencies.push(oscillator.frequency.value);
        document.documentElement.dataset.copyAudioFrequencies =
          audio.frequencies.join(",");
        audio.starts.push(when ?? this.currentTime);
        document.documentElement.dataset.copyAudioStarts =
          audio.starts.join(",");
        start(when);
      };

      return oscillator;
    };
  });

  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {},
      },
    });
  });

  const copy = page.locator(
    '[data-docs-component="install-command"] button[aria-live="polite"]'
  );

  await observeCopyFeedback(copy);
  await copy.click();
  await expect(
    page.getByRole("button", { name: "Copied install command" })
  ).toBeVisible();
  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /done:enter:spring/
  );
  await expect(copy).toHaveAttribute("data-observed-copy-frames", /"done":/);

  const frame = JSON.parse(
    (await copy.getAttribute("data-observed-copy-frames"))!
  ).done;

  expect(frame.filter).toContain("blur");
  expect(frame.opacity).toBeGreaterThan(0);
  expect(frame.opacity).toBeLessThan(1);
  expect(frame.transform).not.toBe("none");
  expect(
    (await page.locator("html").getAttribute("data-copy-audio-frequencies"))
      ?.split(",")
      .map(Number)
  ).toEqual(expect.arrayContaining([523, 784]));
  expect(
    (await page.locator("html").getAttribute("data-copy-audio-starts"))
      ?.split(",")
      .map(Number)
  ).toHaveLength(2);
  await expect(page.locator("html")).toHaveAttribute(
    "data-copy-haptic-pattern",
    "30,60,40"
  );
  await page.screenshot({
    path: "artifacts/homepage-install-command-success.png",
  });
  await expect(copy).toHaveAccessibleName("Copy install command", {
    timeout: 2500,
  });

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("clipboard denied");
        },
      },
    });
  });
  await copy.click();
  await expect(page.getByRole("button", { name: "Copy failed" })).toBeVisible();
  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /error:enter:spring/
  );
  expect(
    (await page.locator("html").getAttribute("data-copy-audio-frequencies"))
      ?.split(",")
      .map(Number)
  ).toEqual(expect.arrayContaining([280, 180]));
  await expect(page.locator("html")).toHaveAttribute(
    "data-copy-haptic-pattern",
    "40,40,40,40,40"
  );
});

test("copy swaps exactly one icon through success, failure, and reset", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });

  const copy = page.locator(
    '[data-docs-component="install-command"] button[aria-live="polite"]'
  );

  const idleIcon = copy.locator('[data-copy-icon="idle"]');
  const doneIcon = copy.locator('[data-copy-icon="done"]');
  const errorIcon = copy.locator('[data-copy-icon="error"]');

  await observeCopyFeedback(copy);
  await expect(idleIcon).toHaveAttribute("data-copy-phase", "static");
  await copy.click();
  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /done:enter:spring/
  );
  await expect(copy).toHaveAttribute("data-observed-copy-phases", /idle:exit:/);
  await page.screenshot({ path: "artifacts/copy-icon-enter-success.png" });
  await expect(doneIcon).toHaveAttribute("data-copy-phase", "static", {
    timeout: 800,
  });
  await expect(idleIcon).toHaveCount(0);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("clipboard denied");
        },
      },
    });
  });
  await copy.click();
  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /error:enter:spring/
  );
  await expect(copy).toHaveAttribute("data-observed-copy-phases", /done:exit:/);
  await page.screenshot({ path: "artifacts/copy-icon-enter-error.png" });
  await expect(errorIcon).toHaveAttribute("data-copy-phase", "static", {
    timeout: 800,
  });
  await expect(doneIcon).toHaveCount(0);

  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /idle:enter:spring/,
    {
      timeout: 1800,
    }
  );
  await expect(copy).toHaveAttribute(
    "data-observed-copy-phases",
    /error:exit:/
  );
  await expect(idleIcon).toHaveAttribute("data-copy-phase", "static", {
    timeout: 800,
  });
  await expect(errorIcon).toHaveCount(0);
});

test("copy icon motion can be interrupted and cleaned up on navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });

  const copy = page.locator(
    '[data-docs-component="install-command"] button[aria-live="polite"]'
  );

  await copy.click();
  await expect(copy.locator('[data-copy-icon="idle"]')).toHaveAttribute(
    "data-copy-phase",
    "exit"
  );

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("clipboard denied");
        },
      },
    });
  });
  await copy.click();
  await expect(copy.locator('[data-copy-icon="error"]')).toHaveAttribute(
    "data-copy-phase",
    "enter"
  );
  await expect(copy.locator('[data-copy-icon="idle"]')).toHaveCount(0);
  await expect(copy.locator('[data-copy-icon="done"]')).toHaveCount(0);
  await expect(copy.locator('[data-copy-icon="error"]')).toHaveAttribute(
    "data-copy-phase",
    "static",
    { timeout: 800 }
  );

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await copy.click();
  await expect(copy.locator('[data-copy-icon="done"]')).toHaveAttribute(
    "data-copy-phase",
    "enter"
  );
  await page.getByRole("link", { name: "Browse components" }).click();
  await expect(page).toHaveURL("/docs/components");
});

test("mobile menu overlays content and dismisses through keyboard and outside interaction", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const heading = page.getByRole("heading", {
    name: "Audio UI, mixed and mastered.",
  });

  const trigger = page.locator('button[aria-controls="site-menu"]');
  const initial = await heading.boundingBox();

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#site-menu")).toBeVisible();
  expect((await heading.boundingBox())?.y).toBe(initial?.y);

  await expect(trigger).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#site-menu")).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page.locator("#site-menu")).toBeVisible();

  const outsidePoint = await page.evaluate(() => {
    const menu = document.querySelector("#site-menu");

    if (!(menu instanceof HTMLElement)) {
      throw new Error("Site menu is missing.");
    }

    const candidates = [
      { x: window.innerWidth - 8, y: window.innerHeight - 8 },
      { x: 8, y: window.innerHeight - 8 },
      { x: Math.floor(window.innerWidth / 2), y: window.innerHeight - 8 },
    ];

    const point = candidates.find(({ x, y }) => {
      const target = document.elementFromPoint(x, y);

      return target !== null && !menu.contains(target);
    });

    if (!point) {
      throw new Error("No point outside the site menu is available.");
    }

    return point;
  });

  await page.mouse.click(outsidePoint.x, outsidePoint.y);
  await expect(page.locator("#site-menu")).toBeHidden();

  await trigger.click();
  await page.locator("main a").first().focus();
  await expect(page.locator("#site-menu")).toBeHidden();
});

test("mobile menu closes across the desktop breakpoint without hidden focus", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const trigger = page.locator('button[aria-controls="site-menu"]');
  await trigger.focus();
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");

  const menuTheme = page.locator("#site-menu").getByTestId("appearance-toggle");
  await menuTheme.focus();
  await expect(menuTheme).toBeFocused();

  await page.setViewportSize({ height: 844, width: 1280 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#site-menu")).toBeHidden();
  await expect(page.locator(".site-desktop-search")).toBeFocused();
  await expect(page.getByRole("button", { name: "Toggle Menu" })).toBeHidden();

  await page.setViewportSize({ height: 844, width: 390 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#site-menu")).toBeHidden();
  await expect(trigger).not.toBeFocused();

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ height: 844, width: 1280 });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator(".site-desktop-search")).not.toBeFocused();
});

test("tablet menu does not duplicate primary navigation", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Toggle Menu" }).click();

  const menu = page.locator("#site-menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("link", { name: "Docs" })).toBeHidden();
  await expect(menu.getByRole("link", { name: "Components" })).toBeHidden();
  await expect(menu.getByRole("link", { name: "Blocks" })).toBeHidden();
});

test("homepage arrows match upstream size and hover motion", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/");

  const pill = page.getByRole("link", {
    name: "Audio components for shadcn/ui",
  });

  const arrow = pill.locator("svg");
  await expect(arrow).toHaveCSS("width", "12px");
  await expect(arrow).toHaveCSS("height", "12px");
  const x = (await arrow.boundingBox())?.x ?? 0;
  await pill.hover();
  await expect(arrow).toHaveCSS("transform", "matrix(1, 0, 0, 1, 2, 0)");
  expect((await arrow.boundingBox())?.x).toBeCloseTo(x + 2, 0);
  await page.screenshot({ path: "artifacts/homepage-pill-hover.png" });

  const browseAll = page.getByRole("link", {
    name: "Browse all 23 components",
  });

  const browseArrow = browseAll.locator('[data-icon="inline-end"]');
  await expect(browseArrow).toHaveCSS("width", "16px");
  await expect(browseAll).toHaveCSS("padding-right", "12px");
  await page.screenshot({ path: "artifacts/homepage-browse-all-arrow.png" });
  await browseArrow.click();
  await expect(page).toHaveURL("/docs/components");
});

test("desktop header search trigger matches upstream compact chrome", async ({
  page,
}) => {
  await page.goto("/");

  const search = page.getByRole("button", { name: /Search/ }).first();
  await expect(search).toHaveText(/Search/);
  await expect(search.locator("kbd")).toHaveCount(2);
  await expect(search).toHaveCSS("width", "240px");
  await expect(search).toHaveCSS("height", "36px");
  expect(
    await search.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).borderTopLeftRadius)
    )
  ).toBeGreaterThan(1_000_000);
  await page.screenshot({ path: "artifacts/homepage-search-trigger.png" });
});

test("mobile header keeps search as a compact icon control", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/");

  const search = page.getByRole("button", { name: "Open Search" });
  await expect(search).toBeVisible();
  await expect(search).toHaveCSS("width", "34px");
  await expect(search).toHaveCSS("height", "34px");
  await page.screenshot({
    path: "artifacts/homepage-search-trigger-mobile.png",
  });
});

test("copy feedback honors reduced-motion preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });

  await page
    .locator(
      '[data-docs-component="install-command"] button[aria-live="polite"]'
    )
    .click();

  const doneIcon = page.locator('[data-copy-icon="done"]');
  await expect(doneIcon).toHaveAttribute("data-copy-motion", "reduced-motion");
  await expect(doneIcon).toHaveAttribute("data-copy-phase", "static", {
    timeout: 1000,
  });
  await expect(doneIcon).toHaveCSS("opacity", "1");
});
