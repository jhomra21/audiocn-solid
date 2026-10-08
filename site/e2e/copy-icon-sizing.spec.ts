import { expect, test } from "@playwright/test";

test("install command and code copy icons match upstream sizes", async ({
  page,
}, testInfo) => {
  const measurements: Array<{
    route: string;
    viewportWidth: number;
    kind: "install-command" | "code-block";
    width: number;
    height: number;
    computedWidth: string;
  }> = [];

  for (const viewportWidth of [390, 1280]) {
    for (const route of [
      "/",
      "/docs/installation",
      "/docs/components/sound-pad",
    ]) {
      await page.setViewportSize({ width: viewportWidth, height: 900 });
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);

      const installCopies = page.getByRole("button", {
        name: "Copy install command",
      });

      const installMeasurements = await installCopies
        .locator('[data-copy-icon="idle"] svg')
        .evaluateAll((svgs) =>
          svgs.map((svg) => {
            const bounds = svg.getBoundingClientRect();

            return {
              width: bounds.width,
              height: bounds.height,
              computedWidth: getComputedStyle(svg).width,
            };
          })
        );

      expect(installMeasurements.length).toBeGreaterThan(0);

      for (const installIcon of installMeasurements) {
        expect(installIcon.width).toBe(14);
        expect(installIcon.height).toBe(14);
        expect(installIcon.computedWidth).toBe("14px");
        measurements.push({
          route,
          viewportWidth,
          kind: "install-command",
          ...installIcon,
        });
      }

      if (route === "/docs/components/sound-pad") {
        const codeCopy = page.getByRole("button", { name: "Copy Text" });
        const codeIcons = codeCopy.locator('[data-copy-icon="idle"] svg');

        const codeMeasurements = await codeIcons.evaluateAll((svgs) =>
          svgs.map((svg) => {
            const bounds = svg.getBoundingClientRect();

            return {
              width: bounds.width,
              height: bounds.height,
              computedWidth: getComputedStyle(svg).width,
            };
          })
        );

        expect(codeMeasurements.length).toBeGreaterThan(0);

        for (const codeIcon of codeMeasurements) {
          expect(codeIcon.width).toBe(16);
          expect(codeIcon.height).toBe(16);
          expect(codeIcon.computedWidth).toBe("16px");
          measurements.push({
            route,
            viewportWidth,
            kind: "code-block",
            ...codeIcon,
          });
        }
      }
    }
  }

  await testInfo.attach("icon-copy-feedback-parity.json", {
    body: JSON.stringify(
      {
        sourceCommit: "4234aa114b8696e2704db7825c1289cf74d1e4f2",
        upstreamRules: {
          installCommand: {
            source: "components/code-block-command.tsx:191",
            class: "[&_svg:not([class*='size-'])]:size-3.5",
            sizePx: 14,
          },
          genericCopy: {
            source: "components/copy-button.tsx",
            sizePx: 16,
          },
        },
        baseline: {
          portInstallCommandSizePx: 16,
          upstreamInstallCommandSizePx: 14,
          genericCodeCopySizePx: 16,
        },
        measurements,
        testCommand:
          "bunx playwright test --config site/playwright.config.ts e2e/copy-icon-sizing.spec.ts",
      },
      null,
      2
    ),
    contentType: "application/json",
  });
});
