import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __rejectFirstCopy: () => void;
    __copyAudioEvents: string[];
    __tooltipTransitions: number;
    __viewTransitionCalls: number;
  }
}

test("requests playback before the first copy awaits the clipboard", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: string[] = [];

    const audioSession = {
      get type() {
        return "auto";
      },
      set type(type: string) {
        events.push(`session:${type}`);
      },
    };

    Object.defineProperty(navigator, "audioSession", {
      configurable: true,
      value: audioSession,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          events.push("clipboard");
          Object.defineProperty(window, "__copyAudioEvents", { value: events });
        },
      },
    });
  });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  await page.locator("[data-brand-assets-trigger]").first().focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();

  await expect(page.getByRole("status")).toContainText("Copied as SVG");
  expect(await page.evaluate(() => window.__copyAudioEvents)).toEqual([
    "session:playback",
    "clipboard",
  ]);
});

test("brand copy reports success and clipboard failure in a viewport toast", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.clipboardText = text;
        },
      },
    });
  });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const brand = page.locator("[data-brand-assets-trigger]").first();
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();

  const success = page.getByRole("status");
  await expect(success).toContainText("Copied as SVG");
  await expect(page.locator("html")).toHaveAttribute(
    "data-clipboard-text",
    /viewBox="0 0 128 128"/
  );
  await expect(success.locator("svg")).toHaveCount(1);
  await expect(success.locator("svg")).toHaveCSS("width", "20px");
  await expect(success.locator("svg")).toHaveCSS("height", "20px");
  await expect
    .poll(() =>
      success.evaluate((node) => {
        const rect = node.getBoundingClientRect();

        return rect.top >= 0 && window.innerHeight - rect.bottom;
      })
    )
    .toBe(16);
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/brand-copy-success.png",
  });
  await expect(page.getByRole("menu")).toHaveCount(0);

  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error("clipboard denied")),
      },
    });
  });
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy wordmark as SVG" }).click();

  const error = page.getByRole("status");
  await expect(error).toContainText(
    "Could not copy. Download the brand assets instead."
  );
  await expect(error.locator("svg")).toHaveCount(1);
  await expect(error.locator("svg")).toHaveCSS("width", "20px");
  await expect(error.locator("svg")).toHaveCSS("height", "20px");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page).toHaveURL("/");
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/brand-copy-error.png",
  });
});

test("brand copy status stays in the mobile viewport", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async () => {} },
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const brand = page.locator("[data-brand-assets-trigger]").first();
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();

  const status = page.getByRole("status");
  await expect(status).toContainText("Copied as SVG");
  await expect(status.locator("svg")).toHaveCount(1);
  await expect(status.locator("svg")).toHaveCSS("width", "20px");
  await expect
    .poll(() =>
      status.evaluate((node) => {
        const rect = node.getBoundingClientRect();

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          window.innerWidth - rect.right === 16 &&
          window.innerHeight - rect.bottom === 16
        );
      })
    )
    .toBe(true);
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/brand-copy-mobile.png",
  });
});

test("brand copy reuses success/error haptics and ignores stale clipboard results", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const patterns: string[] = [];
    let rejectFirst: ((error: Error) => void) | undefined;
    let writes = 0;

    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (pattern: number[]) => {
        patterns.push(pattern.join(","));
        document.documentElement.dataset.copyHaptics = patterns.join("|");

        return true;
      },
    });
    Object.defineProperty(window, "__rejectFirstCopy", {
      value: () => rejectFirst?.(new Error("late clipboard failure")),
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => {
          writes += 1;

          if (writes === 1) {
            return new Promise<void>((_, reject) => {
              rejectFirst = reject;
            });
          }

          return writes === 2
            ? Promise.resolve()
            : Promise.reject(new Error("clipboard denied"));
        },
      },
    });
  });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const brand = page.locator("[data-brand-assets-trigger]").first();
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.waitForTimeout(250);
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy wordmark as SVG" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Copied as SVG");
  await expect(page.locator("html")).toHaveAttribute(
    "data-copy-haptics",
    "30,60,40"
  );
  await page.evaluate(() => window.__rejectFirstCopy());
  await expect(page.getByRole("status")).toContainText("Copied as SVG");
  await expect(page.locator("html")).toHaveAttribute(
    "data-copy-haptics",
    "30,60,40"
  );
  await page.waitForTimeout(250);
  await brand.focus();
  await page.keyboard.press("Shift+F10");
  await page.getByRole("menuitem", { name: "Copy logo as SVG" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Could not copy. Download the brand assets instead."
  );
  await expect(page.locator("html")).toHaveAttribute(
    "data-copy-haptics",
    "30,60,40|40,40,40,40,40"
  );
});

test("appearance click uses native view transition and falls back directly", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let calls = 0;
    const startViewTransition = document.startViewTransition.bind(document);

    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void) => {
        calls += 1;

        return startViewTransition(update);
      },
    });
    Object.defineProperty(window, "__viewTransitionCalls", {
      configurable: true,
      get: () => calls,
    });
  });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle Theme" }).first();

  const initial = await page
    .locator("html")
    .evaluate((node) => node.classList.contains("dark"));

  await toggle.click();
  await expect(page.locator("html")).toHaveClass(
    initial ? /^(?!.*\bdark\b)/ : /\bdark\b/
  );
  await expect
    .poll(() => page.evaluate(() => window.__viewTransitionCalls))
    .toBe(1);
  await expect(toggle.locator("svg[data-active]")).toHaveCount(1);
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/appearance-view-transition.png",
  });

  await page.evaluate(() => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
  });
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(
    initial ? /\bdark\b/ : /^(?!.*\bdark\b)/
  );
  await expect
    .poll(() => page.evaluate(() => window.__viewTransitionCalls))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("audiocn-appearance")))
    .toBe(initial ? "dark" : "light");
  await expect(toggle.locator("svg[data-active]")).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: (update: () => void) => {
        window.__viewTransitionCalls += 1;
        update();

        return {
          ready: Promise.resolve(),
          finished: Promise.resolve(),
          updateCallbackDone: Promise.resolve(),
        };
      },
    });
  });
  await toggle.click();
  await expect(page.locator("html")).toHaveClass(
    initial ? /^(?!.*\bdark\b)/ : /\bdark\b/
  );
  await expect
    .poll(() => page.evaluate(() => window.__viewTransitionCalls))
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("audiocn-appearance")))
    .toBe(initial ? "light" : "dark");
});

test("GitHub tooltip has real reduced-motion-aware entry and exit animations", async ({
  page,
}) => {
  await page.goto("/");

  const link = page
    .locator("header")
    .getByRole("link", { name: /stars on GitHub/ });

  const tooltip = page.locator(".github-stars-tooltip");

  await expect(tooltip).toHaveCount(0);
  await page.evaluate(() => {
    window.__tooltipTransitions = 0;
    document.addEventListener("transitionrun", (event) => {
      if (
        event.target instanceof Element &&
        event.target.matches(".github-stars-tooltip")
      ) {
        window.__tooltipTransitions += 1;
      }
    });
  });
  await link.hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await expect(tooltip).toContainText("stars");
  await expect(tooltip).toHaveCSS("transition-duration", "0.15s, 0.15s, 0.15s");
  await expect
    .poll(() => page.evaluate(() => window.__tooltipTransitions))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/github-tooltip-entry.png",
  });

  await page.keyboard.press("Escape");
  await expect
    .poll(() => page.evaluate(() => window.__tooltipTransitions))
    .toBeGreaterThan(1);
  await expect(tooltip).toHaveCount(0);
  await page.screenshot({
    path: "../artifacts/chrome-microfeedback/github-tooltip-exit.png",
  });
});

test("heading copy feedback preserves the upstream heading and button geometry", async ({
  page,
}) => {
  for (const route of [
    "/docs/components/sound-pad",
    "/docs/blocks/system-audio-mixer",
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);

    const geometry = await page
      .locator(".docs-article h2[data-docs-heading]")
      .evaluateAll((headings) =>
        headings.map((heading) => ({
          heading: heading.getBoundingClientRect().height,
          link: heading.querySelector("a")!.getBoundingClientRect().height,
          button: heading.querySelector("button")!.getBoundingClientRect()
            .height,
        }))
      );

    for (const { heading, link, button } of geometry) {
      expect(heading).toBe(link);
      expect(button).toBe(24);
    }
  }
});

test("GitHub tooltip remains visible without motion when reduced motion is requested", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => window._$HY?.done);

  const link = page
    .locator("header")
    .getByRole("link", { name: /stars on GitHub/ });

  await link.focus();
  const tooltip = page.locator(".github-stars-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toHaveCSS("transition-duration", "0s");
});
