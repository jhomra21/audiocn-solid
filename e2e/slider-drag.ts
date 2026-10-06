import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";

export const dragSlider = async (
  page: Page,
  thumb: Locator,
  start: "thumb" | "track" = "thumb",
  whileHeld?: () => Promise<void>
) => {
  await thumb.scrollIntoViewIfNeeded();

  const vertical =
    (await thumb.getAttribute("aria-orientation")) === "vertical";

  const track = thumb.locator("..");
  const bounds = await track.boundingBox();
  const thumbBounds = await thumb.boundingBox();

  if (!bounds || !thumbBounds) throw new Error("Slider has no bounds.");

  const x =
    start === "thumb"
      ? thumbBounds.x + thumbBounds.width / 2
      : bounds.x + bounds.width * (vertical ? 0.5 : 0.35);

  const y =
    start === "thumb"
      ? thumbBounds.y + thumbBounds.height / 2
      : bounds.y + bounds.height * (vertical ? 0.65 : 0.5);

  const size = vertical ? bounds.height : bounds.width;

  const values: { x: number; y: number; value: number; text: string | null }[] =
    [];

  const recording = await thumb.evaluateHandle((node) => {
    const events: {
      type: string;
      x: number;
      y: number;
      buttons: number;
      captured: boolean;
      slot: string | null;
    }[] = [];

    const record = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Element)) return;

      events.push({
        type: event.type,
        x: event.clientX,
        y: event.clientY,
        buttons: event.buttons,
        captured: target.hasPointerCapture(event.pointerId),
        slot: target.getAttribute("data-slot"),
      });
    };

    const types = [
      "pointerdown",
      "pointermove",
      "pointerup",
      "gotpointercapture",
      "lostpointercapture",
    ] as const;

    for (const type of types)
      node.ownerDocument.addEventListener(type, record, true);

    return {
      finish: () => {
        for (const type of types)
          node.ownerDocument.removeEventListener(type, record, true);

        return events;
      },
    };
  });

  const read = async (nextX: number, nextY: number) => {
    const value = Number(await thumb.getAttribute("aria-valuenow"));
    values.push({
      x: nextX,
      y: nextY,
      value,
      text: await thumb.getAttribute("aria-valuetext"),
    });
    await whileHeld?.();

    return value;
  };

  await page.mouse.move(x, y);
  await page.mouse.down();

  try {
    const initial = await read(x, y);
    const min = Number(await thumb.getAttribute("aria-valuemin"));
    const max = Number(await thumb.getAttribute("aria-valuemax"));
    const direction = initial > (min + max) / 2 ? -1 : 1;

    const offset = (fraction: number) =>
      direction * size * fraction * (vertical ? -1 : 1);

    for (const fraction of [0.15, 0.3, 0.1]) {
      const previous = values.at(-1)!.value;
      const nextX = vertical ? x : x + offset(fraction);
      const nextY = vertical ? y + offset(fraction) : y;
      await page.mouse.move(nextX, nextY, { steps: 4 });
      await expect
        .poll(async () => Number(await thumb.getAttribute("aria-valuenow")))
        .not.toBe(previous);
      await read(nextX, nextY);
    }

    // Leave both the thumb and track cross-axis bounds while capture is held.
    const previous = values.at(-1)!.value;
    const nextX = vertical ? bounds.x + bounds.width + 50 : x + offset(0.25);
    const nextY = vertical ? y + offset(0.25) : bounds.y + bounds.height + 50;
    await page.mouse.move(nextX, nextY, { steps: 4 });
    await expect
      .poll(async () => Number(await thumb.getAttribute("aria-valuenow")))
      .not.toBe(previous);
    await read(nextX, nextY);
  } finally {
    await page.mouse.up();
  }

  const events = await recording.evaluate((record) => record.finish());
  await recording.dispose();
  expect(
    events.some(
      (event) =>
        event.type === "pointermove" && event.buttons === 1 && event.captured
    )
  ).toBe(true);

  return { start, vertical, bounds, values, events };
};
