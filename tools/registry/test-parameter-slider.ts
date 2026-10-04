import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  ParameterSlider,
  ParameterSliderControl,
  ParameterSliderDescription,
  ParameterSliderHeader,
  ParameterSliderInput,
  ParameterSliderLabel,
  ParameterSliderMarks,
  ParameterSliderReset,
  ParameterSliderValue,
} from "@/components/ui/parameter-slider";

const frequencyMarks = [
  { label: "20", value: 20 },
  { label: "200", value: 200 },
  { label: "2k", value: 2000 },
  { label: "20k", value: 20_000 },
];

const formatHz = (hz: number) =>
  hz >= 1000
    ? \`\${(hz / 1000).toFixed(hz >= 10_000 ? 0 : 1)} kHz\`
    : \`\${Math.round(hz)} Hz\`;

export default function App() {
  const [value, setValue] = createSignal(0);
  const [reason, setReason] = createSignal("none");
  const [committed, setCommitted] = createSignal("none");

  return (
    <main style="display: grid; gap: 48px; padding: 48px; width: 560px">
      <ParameterSlider
        largeStep={50}
        max={1000}
        min={-1000}
        onValueChange={(next, details) => {
          setValue(next);
          setReason(details.reason);
        }}
        onValueCommitted={(next) => setCommitted(String(next))}
        origin={0}
        resetValue={0}
        step={5}
        unit="ms"
        value={value()}
      >
        <ParameterSliderHeader>
          <ParameterSliderLabel>Sync offset</ParameterSliderLabel>
          <ParameterSliderReset />
          <ParameterSliderInput />
        </ParameterSliderHeader>
        <ParameterSliderControl />
        <ParameterSliderDescription>
          Delays the microphone to line up with your camera.
        </ParameterSliderDescription>
      </ParameterSlider>

      <ParameterSlider
        defaultValue={1000}
        format={formatHz}
        marks={frequencyMarks}
        max={20_000}
        min={20}
        scale="log"
        step={1}
      >
        <ParameterSliderHeader>
          <ParameterSliderLabel>High-pass filter</ParameterSliderLabel>
          <ParameterSliderValue />
        </ParameterSliderHeader>
        <ParameterSliderControl />
        <ParameterSliderMarks />
      </ParameterSlider>

      <output data-testid="parameter-value">{String(value())}</output>
      <output data-testid="parameter-reason">{reason()}</output>
      <output data-testid="parameter-committed">{committed()}</output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page, runtime) => {
    const slider = page.getByRole("slider", { name: "Sync offset" });
    const input = page.getByRole("spinbutton", { name: "Sync offset" });
    const value = page.getByTestId("parameter-value");
    const reason = page.getByTestId("parameter-reason");
    const committed = page.getByTestId("parameter-committed");

    await expect(slider).toBeVisible();
    await expect(slider).toHaveAttribute("aria-valuetext", "0 ms");
    await expect(input).toHaveValue("0");

    await slider.focus();
    await slider.press("ArrowRight");
    await expect(value).toHaveText("5");
    await expect(reason).toHaveText("keyboard");
    await expect(committed).toHaveText("5");

    await slider.press("Shift+ArrowRight");
    await expect(value).toHaveText("55");
    await expect(committed).toHaveText("55");

    await slider.dblclick();
    await expect(value).toHaveText("0");
    await expect(reason).toHaveText("reset");
    await expect(committed).toHaveText("0");

    await input.fill("125");
    await input.press("Enter");
    await expect(value).toHaveText("125");
    await expect(reason).toHaveText("input");
    await expect(committed).toHaveText("125");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(value).toHaveText("0");
    await expect(reason).toHaveText("reset");
    await expect(committed).toHaveText("0");

    const box = await page
      .locator('[data-slot="parameter-slider-unit"]')
      .first()
      .boundingBox();

    if (!box) {
      throw new Error(`Missing unit bounds for ${runtime}.`);
    }

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2);
    await page.mouse.up();

    await expect(value).toHaveText("50");
    await expect(reason).toHaveText("input");
    await expect(committed).toHaveText("50");

    const frequency = page.getByRole("group", { name: "High-pass filter" });

    await expect(
      frequency.locator('[data-slot="parameter-slider-value"]')
    ).toHaveText("1.0 kHz");
    await expect(
      frequency.locator('[data-slot="parameter-slider-marks"] > span')
    ).toHaveCount(4);

    return {
      committed: await committed.textContent(),
      finalValue: await value.textContent(),
    };
  },
  name: "parameter-slider",
  port: 5011,
  viewport: { height: 760, width: 960 },
});
