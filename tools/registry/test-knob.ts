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
  "knob-e2e.json"
);

const appSource = `import { createSignal } from "solid-js";

import {
  Knob,
  KnobCap,
  KnobDial,
  KnobLabel,
  KnobPointer,
  KnobRange,
  KnobScale,
  KnobTrack,
  KnobValue,
} from "@/components/ui/knob";

const formatGain = (value: number) =>
  value.toFixed(1) + " dB";

const formatHz = (value: number) =>
  value >= 1000
    ? (value / 1000).toFixed(1) + " kHz"
    : Math.round(value) + " Hz";

export default function App() {
  const [value, setValue] = createSignal(0);
  const [reason, setReason] = createSignal("none");
  const [committed, setCommitted] = createSignal("none");

  return (
    <main style="display: flex; gap: 72px; align-items: flex-start; padding: 64px">
      <Knob
        allowWheel
        fineStep={0.1}
        format={formatGain}
        largeStep={6}
        max={24}
        min={-24}
        onValueChange={(next, details) => {
          setValue(next);
          setReason(details.reason);
        }}
        onValueCommitted={(next) => setCommitted(String(next))}
        origin={0}
        resetValue={0}
        sensitivity={200}
        step={1}
        value={value()}
      >
        <KnobDial>
          <KnobTrack />
          <KnobRange />
          <KnobPointer />
        </KnobDial>
        <KnobValue />
        <KnobLabel>Gain</KnobLabel>
      </Knob>

      <Knob
        defaultValue={1000}
        format={formatHz}
        max={20_000}
        min={20}
        scale="log"
        size="lg"
        step={1}
      >
        <KnobDial>
          <KnobScale
            labelEvery={5}
            majorEvery={5}
            ticks={10}
          />
          <KnobCap />
        </KnobDial>
        <KnobValue />
        <KnobLabel>Frequency</KnobLabel>
      </Knob>

      <output data-testid="knob-value">{String(value())}</output>
      <output data-testid="knob-reason">{reason()}</output>
      <output data-testid="knob-committed">{committed()}</output>
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
    const port = 5021 + index;
    const baseUrl = `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `knob-${runtime.runtime}.png`
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
          viewport: { height: 720, width: 1000 },
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

        const knob = page.getByRole("slider", {
          name: "Gain",
        });

        const value = page.getByTestId("knob-value");

        const reason = page.getByTestId("knob-reason");

        const committed = page.getByTestId("knob-committed");

        await expect(knob).toBeVisible();
        await expect(knob).toHaveAttribute(
          "aria-valuetext",
          "0.0 dB"
        );

        await knob.focus();
        await knob.press("ArrowRight");
        await expect(value).toHaveText("1");
        await expect(reason).toHaveText("keyboard");
        await expect(committed).toHaveText("1");

        await knob.press("Shift+ArrowRight");
        await expect(value).toHaveText("7");
        await expect(committed).toHaveText("7");

        await knob.press("Alt+ArrowLeft");
        await expect(value).toHaveText("6.9");
        await expect(committed).toHaveText("6.9");

        await knob.dblclick();
        await expect(value).toHaveText("0");
        await expect(reason).toHaveText("reset");
        await expect(committed).toHaveText("0");

        await knob.focus();
        await knob.press("Enter");

        const input = page.getByRole("textbox", {
          name: "Value",
        });

        await expect(input).toBeVisible();
        await input.fill("12.3");
        await input.press("Enter");
        await expect(value).toHaveText("12.3");
        await expect(reason).toHaveText("input");
        await expect(committed).toHaveText("12.3");

        await knob.focus();
        await knob.dispatchEvent("wheel", {
          deltaY: -100,
        });
        await expect(value).toHaveText("13");
        await expect(reason).toHaveText("wheel");
        await expect(committed).toHaveText("13");

        await knob.dblclick();
        await expect(value).toHaveText("0");

        const box = await knob.boundingBox();

        if (!box) {
          throw new Error(
            `Missing knob bounds for ${runtime.runtime}.`
          );
        }

        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2
        );
        await page.mouse.down();
        await page.mouse.move(
          box.x + box.width / 2,
          box.y + box.height / 2 - 40
        );
        await page.mouse.up();

        await expect(value).toHaveText("10");
        await expect(reason).toHaveText("drag");
        await expect(committed).toHaveText("10");

        const frequency = page.getByRole("slider", {
          name: "Frequency",
        });

        await expect(frequency).toHaveAttribute(
          "aria-valuetext",
          "1.0 kHz"
        );

        const frequencyRoot = page
          .locator('[data-slot="knob"]')
          .filter({ has: page.getByText("Frequency", { exact: true }) });

        await expect(
          frequencyRoot.locator('[data-slot="knob-tick"]')
        ).toHaveCount(11);

        await expect(
          frequencyRoot.locator('[data-slot="knob-scale-label"]')
        ).toHaveCount(3);

        await expect(
          frequencyRoot.locator('[data-slot="knob-cap"]')
        ).toHaveCount(1);

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
