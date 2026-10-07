import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __finalInteractionAudios: HTMLAudioElement[];
    __finalInteractionMediaListeners: () => number;
  }
}

test.setTimeout(30_000);

test("knobs ignore drags from the corners of their box", async ({ page }) => {
  await page.goto("/docs/components/knob#drag-directions");
  const dial = page.getByRole("slider", { exact: true, name: "Vertical" });

  await dial.scrollIntoViewIfNeeded();

  const box = await dial.boundingBox();

  if (!box) {
    throw new Error("The knob is not visible.");
  }

  const drag = async (x: number, y: number) => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 50, { steps: 8 });
    await page.mouse.up();
  };

  const left = box.x + 2;
  const right = box.x + box.width - 2;
  const top = box.y + 2;
  const bottom = box.y + box.height - 2;

  const expectIgnored = async (x: number, y: number) => {
    await drag(x, y);
    await expect(dial).not.toBeFocused();
    await expect(dial).toHaveAttribute("aria-valuenow", "0");
  };

  await expectIgnored(left, top);
  await expectIgnored(right, top);
  await expectIgnored(left, bottom);
  await expectIgnored(right, bottom);
  await drag(box.x + box.width / 2, bottom);
  await expect(dial).toHaveAttribute("aria-valuenow", "12");
});

test("playing music waveform owns its held preview until release or cancellation", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const audios: HTMLAudioElement[] = [];
    window.__finalInteractionAudios = audios;
    window.Audio = new Proxy(window.Audio, {
      construct(target, args) {
        const audio = new target(args[0]);
        audios.push(audio);

        return audio;
      },
    });
  });
  await page.goto("/docs/blocks/music-player");
  const player = page.locator('[data-slot="audio-player"]').first();
  const waveform = player.locator('[data-slot="waveform"]');
  await expect(page.locator('[data-slot="waveform-skeleton"]')).toHaveCount(0);
  await player.scrollIntoViewIfNeeded();
  const box = (await waveform.boundingBox())!;

  const position = () =>
    waveform.evaluate((node) =>
      Number(node.style.getPropertyValue("--waveform-position"))
    );

  const hold = async () => {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2);
  };

  await hold();
  await expect.poll(position).toBeCloseTo(0.75, 2);
  await page.mouse.up();
  await player.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(player).toHaveAttribute("data-playing", "");
  await waveform.press("Home");
  await hold();
  await page.waitForTimeout(100);
  const held = [await position()];

  const playback = [
    await page.evaluate(
      () =>
        window.__finalInteractionAudios.find((audio) => !audio.paused)
          ?.currentTime ?? 0
    ),
  ];

  await page.waitForTimeout(250);
  held.push(await position());
  playback.push(
    await page.evaluate(
      () =>
        window.__finalInteractionAudios.find((audio) => !audio.paused)
          ?.currentTime ?? 0
    )
  );
  expect(held[0]).toBeCloseTo(0.75, 2);
  expect(held[1]).toBeCloseTo(0.75, 2);
  expect(playback[1]).toBeGreaterThan(playback[0]);
  await page.screenshot({ path: info.outputPath("playing-waveform-held.png") });
  await page.mouse.up();
  await expect.poll(position).toBeGreaterThanOrEqual(0.74);
  await expect(waveform).toHaveAttribute("aria-valuenow", "14");

  await waveform.press("Home");
  await hold();
  await waveform.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(waveform).not.toHaveAttribute("data-dragging", "");
  await expect.poll(position).toBeLessThan(0.2);
  expect(errors).toEqual([]);
  await info.attach("held-values", {
    body: JSON.stringify({
      held,
      playback,
      cancelled: await position(),
      errors,
    }),
    contentType: "application/json",
  });
});

test("mobile docs drawer contains focus and cleans up every dismissal path", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const listeners = new Map<EventListenerOrEventListenerObject, string>();
    const add = MediaQueryList.prototype.addEventListener;
    const remove = MediaQueryList.prototype.removeEventListener;
    MediaQueryList.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ) {
      listeners.set(listener, type);

      return add.call(this, type, listener, options);
    };

    MediaQueryList.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ) {
      listeners.delete(listener);

      return remove.call(this, type, listener, options);
    };

    window.__finalInteractionMediaListeners = () => listeners.size;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/knob");

  const opener = page.getByRole("button", {
    exact: true,
    name: "Open Sidebar",
  });

  const drawer = page.locator("#docs-sidebar-mobile");

  const focusInside = () =>
    drawer.evaluate((node) => node.contains(document.activeElement));

  const focusPath: string[] = [];
  const overflow = await page.evaluate(() => document.body.style.overflow);

  const listenersBefore = await page.evaluate(() =>
    window.__finalInteractionMediaListeners()
  );

  for (let cycle = 0; cycle < 6; cycle++) {
    await opener.focus();
    await page.keyboard.press("Enter");
    await expect(drawer).toBeVisible();
    expect(await focusInside()).toBe(true);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden"
    );
    await page
      .locator('header button[aria-label="Open Search"]')
      .first()
      .evaluate((node) => node.focus());
    expect(await focusInside()).toBe(true);
    const targets = drawer.locator("a[href], button, select");
    await targets.first().focus();
    await page.keyboard.press("Shift+Tab");
    await expect(targets.last()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(targets.first()).toBeFocused();

    for (const key of ["Shift+Tab", ...Array<string>(8).fill("Tab")]) {
      await page.keyboard.press(key);
      expect(await focusInside()).toBe(true);
      focusPath.push(
        await page.evaluate(
          () =>
            document.activeElement?.getAttribute("aria-label") ??
            document.activeElement?.textContent?.trim() ??
            ""
        )
      );
    }

    await expect(
      page.getByRole("dialog", { name: "Search documentation" })
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      overflow
    );
    expect(
      await page.evaluate(() => window.__finalInteractionMediaListeners())
    ).toBe(listenersBefore);
  }

  await opener.click();
  await drawer
    .getByRole("button", { exact: true, name: "Close Sidebar" })
    .click();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.mouse.click(15, 150);
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await drawer.getByRole("link", { exact: true, name: "Installation" }).click();
  await expect(page).toHaveURL(/\/docs\/installation$/);
  await expect(drawer).toHaveCount(0);
  await opener.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(drawer).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    overflow
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(opener).toHaveAttribute("aria-expanded", "false");
  await opener.click();
  await page.screenshot({ path: info.outputPath("mobile-drawer.png") });
  await page.keyboard.press("Escape");
  await info.attach("focus-path", {
    body: JSON.stringify({ focusPath, overflow, listenersBefore }),
    contentType: "application/json",
  });
});
