import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  describePan,
  formatPan,
  PanControl,
  parsePan,
} from "@/components/ui/pan-control";

export default function App() {
  const [value, setValue] = createSignal(-0.3);
  const [committed, setCommitted] = createSignal("none");

  return (
    <main style="display: grid; gap: 24px; padding: 48px; width: 520px">
      <div style="display: flex; justify-content: space-between">
        <span>Pan</span>
        <span data-testid="visible-pan">{formatPan(value())}</span>
      </div>

      <PanControl
        largeStep={0.25}
        onValueChange={setValue}
        onValueCommitted={(next) => setCommitted(String(next))}
        step={0.05}
        value={value()}
      />

      <output data-testid="pan-value">{String(value())}</output>
      <output data-testid="pan-committed">{committed()}</output>
      <output data-testid="parse-left">{String(parsePan("L30"))}</output>
      <output data-testid="parse-center">{String(parsePan("Center"))}</output>
      <output data-testid="parse-right">{String(parsePan("R15"))}</output>
      <output data-testid="describe-right">{describePan(0.3)}</output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page, runtime) => {
    const slider = page.getByRole("slider", { name: "Pan" });
    const value = page.getByTestId("pan-value");
    const committed = page.getByTestId("pan-committed");
    const visible = page.getByTestId("visible-pan");

    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("aria-valuetext", "30% left");
    await expect(visible).toHaveText("L30");

    await slider.focus();
    await slider.press("ArrowRight");
    await expect(value).toHaveText("-0.25");
    await expect(committed).toHaveText("-0.25");

    await slider.press("Shift+ArrowRight");
    await expect(value).toHaveText("0");
    await expect(slider).toHaveAttribute("aria-valuetext", "Center");
    await expect(visible).toHaveText("C");

    await slider.press("End");
    await expect(value).toHaveText("1");
    await expect(slider).toHaveAttribute("aria-valuetext", "100% right");

    await slider.dblclick();
    await expect(value).toHaveText("0");
    await expect(committed).toHaveText("0");

    await slider.press("End");

    const trackBox = await page
      .locator('[data-slot="pan-control"]')
      .boundingBox();

    const thumbBox = await slider.boundingBox();

    if (!trackBox || !thumbBox) {
      throw new Error(`Missing pan bounds for ${runtime}.`);
    }

    await page.mouse.move(
      thumbBox.x + thumbBox.width / 2,
      thumbBox.y + thumbBox.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      trackBox.x + trackBox.width * 0.52,
      thumbBox.y + thumbBox.height / 2
    );
    await page.mouse.up();

    await expect(value).toHaveText("0");
    await expect(committed).toHaveText("0");

    await expect(page.getByTestId("parse-left")).toHaveText("-0.3");
    await expect(page.getByTestId("parse-center")).toHaveText("0");
    await expect(page.getByTestId("parse-right")).toHaveText("0.15");
    await expect(page.getByTestId("describe-right")).toHaveText("30% right");

    return {
      committed: await committed.textContent(),
      finalValue: await value.textContent(),
    };
  },
  name: "pan-control",
  port: 5031,
  viewport: { height: 620, width: 900 },
});
