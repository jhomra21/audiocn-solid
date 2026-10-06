import { expect, test } from "@playwright/test";

// Mirrors upstream components/home/showcase-grid.tsx at 59411f5: the grid is
// the wide cards, then the left column, then the right column.
const CARDS = [
  ["Mixer", "/docs/components/mixer"],
  ["Waveform", "/docs/components/waveform"],
  ["Music player", "/docs/blocks/music-player"],
  ["Sound pads", "/docs/components/sound-pad"],
  ["Bar visualizer", "/docs/components/bar-visualizer"],
  ["Knobs", "/docs/components/knob"],
  ["Spectrum", "/docs/components/spectrum"],
  ["Volume dial", "/docs/components/knob#volume-dial"],
  ["Live waveform", "/docs/components/live-waveform"],
  ["Level meters", "/docs/components/level-meter"],
  ["Channel controls", "/docs/components/channel-toggle"],
  ["Faders", "/docs/components/fader"],
  ["Output", "/docs/components/audio-device-select"],
  ["Audio player", "/docs/components/audio-player"],
] as const;

test("home showcase lists the volume dial instead of parameter sliders", async ({
  page,
}) => {
  await page.goto("/");

  const cards = page.locator('[data-slot="showcase-card"]');

  await expect(cards).toHaveCount(CARDS.length);

  const actual = await cards.evaluateAll((nodes) =>
    nodes.map((node) => [
      node.getAttribute("aria-label"),
      node.querySelector("a")?.getAttribute("href"),
    ])
  );

  expect(actual).toEqual(CARDS.map(([label, href]) => [label, href]));

  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator('[data-slot="skeleton"]')).toHaveCount(0);
  }

  await expect(
    page.getByRole("article", { name: "Parameter sliders" })
  ).toHaveCount(0);
  await expect(page.locator('[data-slot="parameter-slider"]')).toHaveCount(0);

  const card = page.getByRole("article", { name: "Volume dial" });
  const dial = card.getByRole("slider", { name: "Volume" });

  await expect(dial).toHaveAttribute("aria-valuenow", "33");
  await expect(card.locator('[data-slot="knob-cap"]')).toHaveAttribute(
    "data-variant",
    "default"
  );
  await expect(card.locator('[data-slot="knob-tick"]')).toHaveCount(101);
  await expect(card.locator('[data-slot="knob"]')).toHaveCSS(
    "--knob-size",
    "11rem"
  );
});

test.describe("prerendered home without scripts", () => {
  test.use({ javaScriptEnabled: false });

  test("the volume dial tile reserves its square", async ({ page }) => {
    await page.goto("/");

    const skeleton = page
      .getByRole("article", { name: "Volume dial" })
      .locator('[data-slot="skeleton"]');

    await expect(skeleton).toHaveCount(1);

    const box = await skeleton.boundingBox();

    expect(box?.width).toBe(176);
    expect(box?.height).toBe(176);
  });
});
