import { devices, expect, test } from "@playwright/test";

declare global {
  interface Window {
    selectScrollFrames: { scrollY: number; top: number }[];
  }
}

test.use({ ...devices["iPhone 13"], browserName: "webkit" });

for (const path of ["/", "/docs/components/audio-device-select"]) {
  test(`select keeps its page anchor when opened at ${path}`, async ({
    page,
  }, info) => {
    await page.goto(path);
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));

    const trigger =
      path === "/"
        ? page
            .getByRole("article", { name: "Output", exact: true })
            .getByRole("combobox")
        : page.getByRole("combobox", { name: "Shure MV7+" });

    await trigger.scrollIntoViewIfNeeded();
    await expect(trigger).toBeVisible();
    const samples: { scrollY: number; top: number }[] = [];

    for (let repeat = 0; repeat < 5; repeat++) {
      const before = await trigger.evaluate((element) => ({
        scrollY,
        top: element.getBoundingClientRect().top,
      }));

      await trigger.evaluate((element) => {
        const capture = () => {
          const frames = window.selectScrollFrames;

          frames.push({ scrollY, top: element.getBoundingClientRect().top });

          if (frames.length < 30) requestAnimationFrame(capture);
        };

        window.selectScrollFrames = [];
        requestAnimationFrame(capture);
      });
      await trigger.tap();
      await expect(page.getByRole("listbox")).toBeVisible();
      await expect(page.getByRole("option", { selected: true })).toBeFocused();
      await page.waitForFunction(() => window.selectScrollFrames.length === 30);

      const frames = await page.evaluate(() => window.selectScrollFrames);

      samples.push(before, ...frames);
      await info.attach(`opening-${repeat}.json`, {
        body: JSON.stringify({ before, frames }, null, 2),
        contentType: "application/json",
      });
      expect(
        Math.max(...frames.map((frame) => Math.abs(frame.top - before.top)))
      ).toBeLessThan(2);
      expect(
        Math.max(
          ...frames.map((frame) => Math.abs(frame.scrollY - before.scrollY))
        )
      ).toBeLessThan(2);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("listbox")).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(await page.evaluate(() => scrollY)).toBe(before.scrollY);
    }

    await page.screenshot({ path: info.outputPath("select-scroll.png") });
    await info.attach("select-scroll.json", {
      body: JSON.stringify({ path, samples }, null, 2),
      contentType: "application/json",
    });
  });
}
