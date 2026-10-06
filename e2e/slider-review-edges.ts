import { mkdir, readFile, writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

export const runSliderReviewEdges = (runtime: string) => {
  const evidence: unknown[] = [];

  test.describe("slider review edges", () => {
    test.afterEach(async () => {
      const path = new URL(
        "../artifacts/slider-review-edge-fixes.json",
        import.meta.url
      );

      const report = await readFile(path, "utf8").then(
        (text) => JSON.parse(text),
        () => ({})
      );

      const stage = process.env.SLIDER_EDGE_STAGE ?? "green";
      report[`${stage}-${runtime}`] = [
        ...(report[`${stage}-${runtime}`] ?? []),
        ...evidence.splice(0),
      ];
      await mkdir(new URL("../artifacts/", import.meta.url), {
        recursive: true,
      });
      await writeFile(path, JSON.stringify(report, null, 2));
    });

    for (const locale of ["ar-EG", "he-IL"]) {
      test.describe(locale, () => {
        // Kobalte's default I18nContext reads navigator.language and derives
        // direction with getReadingDirection; document.dir alone is not used.
        test.use({ locale });

        for (const inverted of [false, true]) {
          for (const start of ["thumb", "track"] as const) {
            test(`RTL ${locale} inverted=${inverted} ${start} follows pointer`, async ({
              page,
            }) => {
              await page.goto("/controls");
              expect(await page.evaluate(() => navigator.language)).toBe(
                locale
              );

              const root = page.getByTestId(
                inverted ? "rtl-slider-inverted" : "rtl-slider"
              );

              const thumb = root.locator('[data-slot="fader-thumb"]');
              const track = root.locator('[data-slot="fader-track"]');
              await thumb.scrollIntoViewIfNeeded();
              const bounds = await track.boundingBox();
              const thumbBounds = await thumb.boundingBox();

              if (!bounds || !thumbBounds)
                throw new Error("Slider has no bounds.");

              const x =
                start === "thumb"
                  ? thumbBounds.x + thumbBounds.width / 2
                  : bounds.x + bounds.width * 0.35;

              const y =
                start === "thumb"
                  ? thumbBounds.y + thumbBounds.height / 2
                  : bounds.y + bounds.height / 2;

              const values: {
                pointerX: number;
                value: number;
                center: number;
              }[] = [];

              await track.evaluate((node) => {
                node.addEventListener(
                  "pointerdown",
                  (event) => {
                    if (event.target instanceof Element) {
                      node.setAttribute(
                        "data-test-down-slot",
                        event.target.getAttribute("data-slot") ?? ""
                      );
                    }
                  },
                  { capture: true, once: true }
                );
              });
              await page.mouse.move(x, y);
              await page.mouse.down();

              try {
                const pointerTarget = await track.getAttribute(
                  "data-test-down-slot"
                );

                expect(pointerTarget).toBe(
                  start === "thumb" ? "fader-thumb" : "fader-track"
                );

                const before = Number(
                  await thumb.getAttribute("aria-valuenow")
                );

                const initialRect = await thumb.boundingBox();

                if (!initialRect) throw new Error("Slider has no bounds.");
                const initialCenter = initialRect.x + initialRect.width / 2;

                for (const delta of [0.15, 0.3, 0.1]) {
                  const previous = values.at(-1)?.value ?? before;
                  await page.mouse.move(x + bounds.width * delta, y, {
                    steps: 4,
                  });
                  await expect
                    .poll(async () =>
                      Number(await thumb.getAttribute("aria-valuenow"))
                    )
                    .not.toBe(previous);

                  const value = Number(
                    await thumb.getAttribute("aria-valuenow")
                  );

                  const rect = await thumb.boundingBox();
                  const center = rect ? rect.x + rect.width / 2 : NaN;
                  values.push({
                    pointerX: x + bounds.width * delta,
                    value,
                    center,
                  });
                }

                evidence.push({
                  locale,
                  inverted,
                  start,
                  pointerTarget,
                  before,
                  initialCenter,
                  values,
                });

                for (const sample of values) {
                  expect(sample.value).toBeCloseTo(
                    before +
                      ((sample.pointerX - x) / bounds.width) *
                        (inverted ? 1 : -1),
                    2
                  );
                  expect(
                    Math.abs(
                      sample.center - (initialCenter + sample.pointerX - x)
                    )
                  ).toBeLessThan(bounds.width * 0.015);

                  if (inverted) expect(sample.value).toBeGreaterThan(before);
                  else expect(sample.value).toBeLessThan(before);
                }
              } finally {
                await page.mouse.up();
              }
            });
          }
        }
      });
    }

    test("same-turn final seek move and release commits the final media position once", async ({
      page,
    }) => {
      await page.goto("/audio-player");
      await expect(page.getByTestId("player-ready")).toHaveText("ready");

      const thumb = page
        .getByRole("group", { name: "Demo player", exact: true })
        .locator('[data-slot="audio-player-seek-thumb"]');

      const media = page.getByTestId("seek-media").locator("audio");
      await media.evaluate((node: HTMLAudioElement) => {
        const events: { type: string; currentTime: number }[] = [];

        for (const type of ["seeked", "timeupdate"]) {
          node.addEventListener(type, (event) => {
            events.push({ type: event.type, currentTime: node.currentTime });
            node.setAttribute("data-test-media-events", JSON.stringify(events));
          });
        }
      });
      await thumb.press("ArrowRight");
      await expect
        .poll(async () =>
          Number(
            await media.evaluate((node: HTMLAudioElement) => node.currentTime)
          )
        )
        .toBeGreaterThan(0);

      const before: number[] = JSON.parse(
        (await page.getByTestId("seek-calls").textContent()) ?? "[]"
      );

      const bounds = await thumb.boundingBox();
      const track = await thumb.locator("..").boundingBox();

      if (!bounds || !track) throw new Error("Seek has no bounds.");
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      await thumb.evaluate((node) => {
        node.addEventListener(
          "pointerdown",
          (event) => {
            if (event instanceof PointerEvent)
              node.setAttribute(
                "data-test-pointer-id",
                String(event.pointerId)
              );
          },
          { once: true }
        );
      });
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + track.width * 0.1, y, { steps: 4 });
      const beforeFinal = Number(await thumb.getAttribute("aria-valuenow"));
      const duration = Number(await thumb.getAttribute("aria-valuemax"));
      const expected = Math.round((beforeFinal + duration * 0.2) * 100) / 100;

      const paired = await thumb.evaluate(
        (node, point) => {
          const pointerId = Number(node.getAttribute("data-test-pointer-id"));
          const captured = node.hasPointerCapture(pointerId);
          node.dispatchEvent(
            new PointerEvent("pointermove", {
              bubbles: true,
              pointerId,
              pointerType: "mouse",
              buttons: 1,
              clientX: point.x,
              clientY: point.y,
            })
          );
          node.dispatchEvent(
            new PointerEvent("pointerup", {
              bubbles: true,
              pointerId,
              pointerType: "mouse",
              buttons: 0,
              clientX: point.x,
              clientY: point.y,
            })
          );

          return { captured };
        },
        { x: x + track.width * 0.3, y }
      );

      await page.mouse.up();
      await expect
        .poll(
          async () =>
            JSON.parse(
              (await page.getByTestId("seek-calls").textContent()) ?? "[]"
            ).length
        )
        .toBe(before.length + 1);

      const calls: number[] = JSON.parse(
        (await page.getByTestId("seek-calls").textContent()) ?? "[]"
      );

      const currentTime = await media.evaluate(
        (node: HTMLAudioElement) => node.currentTime
      );

      await expect
        .poll(async () => {
          const events: { type: string; currentTime: number }[] = JSON.parse(
            (await media.getAttribute("data-test-media-events")) ?? "[]"
          );

          return events.some(
            (event) =>
              event.type === "seeked" &&
              Math.abs(event.currentTime - currentTime) < 0.05
          );
        })
        .toBe(true);

      const mediaEvents = JSON.parse(
        (await media.getAttribute("data-test-media-events")) ?? "[]"
      );

      evidence.push({
        kind: "same-turn-seek",
        paired,
        beforeFinal,
        expected,
        calls,
        currentTime,
        mediaEvents,
      });
      expect(paired.captured).toBe(true);
      expect(calls.at(-1)).toBeCloseTo(expected, 1);
      expect(currentTime).toBeCloseTo(expected, 1);
      await thumb.press("Home");
      await expect(thumb).toHaveAttribute("aria-valuenow", "0");
      await media.evaluate((node: HTMLAudioElement) => {
        node.currentTime = 3;
      });
      await expect(thumb).toHaveAttribute("aria-valuenow", "3");
      await thumb.press("ArrowRight");
      await expect(thumb).toHaveAttribute("aria-valuenow", "8");

      const updatedCalls: number[] = JSON.parse(
        (await page.getByTestId("seek-calls").textContent()) ?? "[]"
      );

      expect(updatedCalls.slice(before.length)).toEqual([calls.at(-1), 0, 8]);
    });
  });
};
