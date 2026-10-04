import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";

import { run, waitForServer } from "./runner";

interface InstallRuntime {
  fixture: string;
  runtime: "solid1" | "solid2";
}

interface InstallReport {
  pass: boolean;
  runtimes: InstallRuntime[];
}

interface RuntimeEvidence {
  committed: string;
  consoleFailures: string[];
  finalValue: string;
  runtime: InstallRuntime["runtime"];
  screenshot: string;
}

interface AcceptanceReport {
  pass: boolean;
  runtimes: RuntimeEvidence[];
  error?: string;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const installReportPath = join(
  root,
  "artifacts",
  "registry-install.json"
);

const artifactPath = join(
  root,
  "artifacts",
  "parameter-slider-e2e.json"
);

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

const installReport: InstallReport = JSON.parse(
  await readFile(installReportPath, "utf8")
);

if (!installReport.pass) {
  throw new Error("Registry install report did not pass.");
}

const report: AcceptanceReport = {
  pass: false,
  runtimes: [],
};

await mkdir(dirname(artifactPath), { recursive: true });

try {
  for (const [index, runtime] of installReport.runtimes.entries()) {
    const port = 5011 + index;
    const baseUrl = `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `parameter-slider-${runtime.runtime}.png`
    );

    await writeFile(
      join(runtime.fixture, "src", "App.tsx"),
      appSource
    );

    await run("bun", ["run", "typecheck"], runtime.fixture);
    await run("bun", ["run", "build"], runtime.fixture);

    const preview = spawn(
      "bunx",
      [
        "vite",
        "preview",
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: runtime.fixture,
        env: process.env,
        stdio: "inherit",
      }
    );

    try {
      await waitForServer(baseUrl);

      const browser = await chromium.launch();

      try {
        const page = await browser.newPage({
          viewport: { height: 760, width: 960 },
        });

        const consoleFailures: string[] = [];

        page.on("console", (message) => {
          if (
            message.type() === "warning" ||
            message.type() === "error"
          ) {
            consoleFailures.push(
              `${message.type()}: ${message.text()}`
            );
          }
        });

        page.on("pageerror", (error) => {
          consoleFailures.push(
            `pageerror: ${error.message}`
          );
        });

        await page.goto(baseUrl);

        const slider = page.getByRole("slider", {
          name: "Sync offset",
        });

        const input = page.getByRole("spinbutton", {
          name: "Sync offset",
        });

        const value = page.getByTestId("parameter-value");

        const reason = page.getByTestId("parameter-reason");

        const committed = page.getByTestId(
          "parameter-committed"
        );

        await expect(slider).toBeVisible();
        await expect(slider).toHaveAttribute(
          "aria-valuetext",
          "0 ms"
        );
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

        await page
          .getByRole("button", { name: "Reset" })
          .click();
        await expect(value).toHaveText("0");
        await expect(reason).toHaveText("reset");
        await expect(committed).toHaveText("0");

        const unit = page
          .locator('[data-slot="parameter-slider-unit"]')
          .first();

        const box = await unit.boundingBox();

        if (!box) {
          throw new Error(
            `Missing unit bounds for ${runtime.runtime}.`
          );
        }

        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width / 2 + 40,
          box.y + box.height / 2
        );
        await page.mouse.up();

        await expect(value).toHaveText("50");
        await expect(reason).toHaveText("input");
        await expect(committed).toHaveText("50");

        const frequency = page.getByRole("group", {
          name: "High-pass filter",
        });

        await expect(
          frequency.locator(
            '[data-slot="parameter-slider-value"]'
          )
        ).toHaveText("1.0 kHz");
        await expect(
          frequency.locator(
            '[data-slot="parameter-slider-marks"] > span'
          )
        ).toHaveCount(4);

        expect(consoleFailures).toEqual([]);

        await page.screenshot({
          fullPage: true,
          path: screenshot,
        });

        report.runtimes.push({
          committed: await committed.textContent(),
          consoleFailures,
          finalValue: await value.textContent(),
          runtime: runtime.runtime,
          screenshot: screenshot.slice(root.length + 1),
        });
      } finally {
        await browser.close();
      }
    } finally {
      preview.kill("SIGTERM");

      if (preview.exitCode === null) {
        await once(preview, "close");
      }
    }
  }

  report.pass = true;
} catch (error) {
  report.error =
    error instanceof Error ? error.message : String(error);

  throw error;
} finally {
  await writeFile(
    artifactPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
}
