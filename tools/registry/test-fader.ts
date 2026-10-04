import { expect } from "@playwright/test";

import { runAcceptance } from "./runner";

const appSource = `import { createSignal } from "solid-js";

import {
  Fader,
  FaderRange,
  FaderReset,
  FaderThumb,
  FaderTrack,
  FaderValue,
} from "@/components/ui/fader";

export default function App() {
  const [value, setValue] = createSignal(-12);
  const [reason, setReason] = createSignal("none");
  const [committed, setCommitted] = createSignal("none");

  return (
    <main style="padding: 48px; width: 480px">
      <Fader
        allowWheel
        aria-label="Gain"
        onValueChange={(next, details) => {
          setValue(next);
          setReason(details.reason);
        }}
        onValueCommitted={(next) => setCommitted(String(next))}
        resetValue={0}
        silenceAtMin
        value={value()}
      >
        <FaderTrack>
          <FaderRange />
          <FaderThumb />
        </FaderTrack>
        <div style="display: flex; gap: 8px; margin-top: 16px">
          <FaderValue editable />
          <FaderReset />
        </div>
      </Fader>

      <output data-testid="fader-value">{String(value())}</output>
      <output data-testid="fader-reason">{reason()}</output>
      <output data-testid="fader-committed">{committed()}</output>
    </main>
  );
}
`;

await runAcceptance({
  appSource,
  check: async (page) => {
    const thumb = page.getByRole("slider", { name: "Gain" });
    const value = page.getByTestId("fader-value");
    const reason = page.getByTestId("fader-reason");
    const committed = page.getByTestId("fader-committed");

    await expect(thumb).toBeVisible();
    await expect(thumb).toHaveAttribute("aria-valuetext", "−12.0 dB");

    await thumb.focus();
    await thumb.press("ArrowRight");
    await expect(value).toHaveText("-11.5");
    await expect(reason).toHaveText("keyboard");
    await expect(committed).toHaveText("-11.5");

    await thumb.press("Shift+ArrowRight");
    await expect(value).toHaveText("-5.5");
    await expect(committed).toHaveText("-5.5");

    await thumb.press("Alt+ArrowLeft");
    await expect(value).toHaveText("-5.6");
    await expect(committed).toHaveText("-5.6");

    await thumb.dblclick();
    await expect(value).toHaveText("0");
    await expect(reason).toHaveText("reset");
    await expect(committed).toHaveText("0");

    await page.locator('[data-slot="fader-value"]').click();

    const input = page.getByRole("textbox", { name: "Value in dB" });

    await input.fill("-24");
    await input.press("Enter");
    await expect(value).toHaveText("-24");
    await expect(reason).toHaveText("input");
    await expect(committed).toHaveText("-24");

    await page.getByRole("button", { name: "Reset" }).click();
    await expect(value).toHaveText("0");
    await expect(reason).toHaveText("reset");
    await expect(committed).toHaveText("0");

    await thumb.focus();
    await thumb.dispatchEvent("wheel", { deltaY: -100 });
    await expect(value).toHaveText("0.5");
    await expect(reason).toHaveText("wheel");
    await expect(committed).toHaveText("0.5");

    await thumb.press("Home");
    await expect(value).toHaveText("-Infinity");
    await expect(thumb).toHaveAttribute("aria-valuetext", "Silent");

    await thumb.press("ArrowRight");
    await expect(value).toHaveText("-60");

    return {
      committed: await committed.textContent(),
      finalValue: await value.textContent(),
    };
  },
  name: "fader",
  port: 5001,
  viewport: { height: 700, width: 900 },
});
