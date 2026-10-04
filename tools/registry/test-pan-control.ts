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

const root = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const installReportPath = join(
  root,
  "artifacts",
  "registry-install.json"
);

const artifactPath = join(
  root,
  "artifacts",
  "pan-control-e2e.json"
);

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

const installReport: InstallReport =
  JSON.parse(
    await readFile(
      installReportPath,
      "utf8"
    )
  );

if (!installReport.pass) {
  throw new Error(
    "Registry install report did not pass."
  );
}

const report: AcceptanceReport = {
  pass: false,
  runtimes: [],
};

await mkdir(
  dirname(artifactPath),
  { recursive: true }
);

try {
  for (
    const [
      index,
      runtime,
    ] of
    installReport.runtimes.entries()
  ) {
    const port =
      5031 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `pan-control-${runtime.runtime}.png`
    );

    await writeFile(
      join(
        runtime.fixture,
        "src",
        "App.tsx"
      ),
      appSource
    );

    await run(
      "bun",
      ["run", "typecheck"],
      runtime.fixture
    );

    await run(
      "bun",
      ["run", "build"],
      runtime.fixture
    );

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
      await waitForServer(
        baseUrl
      );

      const browser =
        await chromium.launch();

      try {
        const page =
          await browser.newPage({
            viewport: {
              height: 620,
              width: 900,
            },
          });

        const consoleFailures:
          string[] = [];

        page.on(
          "console",
          (message) => {
            if (
              message.type() ===
                "warning" ||
              message.type() ===
                "error"
            ) {
              consoleFailures.push(
                `${message.type()}: ${message.text()}`
              );
            }
          }
        );

        page.on(
          "pageerror",
          (error) => {
            consoleFailures.push(
              `pageerror: ${error.message}`
            );
          }
        );

        await page.goto(
          baseUrl
        );

        const slider =
          page.getByRole(
            "slider",
            {
              name: "Pan",
            }
          );

        const value =
          page.getByTestId(
            "pan-value"
          );

        const committed =
          page.getByTestId(
            "pan-committed"
          );

        const visible =
          page.getByTestId(
            "visible-pan"
          );

        await expect(
          slider
        ).toBeVisible();

        await expect(
          slider
        ).toHaveAttribute(
          "aria-valuetext",
          "30% left"
        );

        await expect(
          visible
        ).toHaveText("L30");

        await slider.focus();

        await slider.press(
          "ArrowRight"
        );

        await expect(
          value
        ).toHaveText("-0.25");

        await expect(
          committed
        ).toHaveText("-0.25");

        await slider.press(
          "Shift+ArrowRight"
        );

        await expect(
          value
        ).toHaveText("0");

        await expect(
          slider
        ).toHaveAttribute(
          "aria-valuetext",
          "Center"
        );

        await expect(
          visible
        ).toHaveText("C");

        await slider.press(
          "End"
        );

        await expect(
          value
        ).toHaveText("1");

        await expect(
          slider
        ).toHaveAttribute(
          "aria-valuetext",
          "100% right"
        );

        await slider.dblclick();

        await expect(
          value
        ).toHaveText("0");

        await expect(
          committed
        ).toHaveText("0");

        await slider.press(
          "End"
        );

        const track =
          page.locator(
            '[data-slot="pan-control"]'
          );

        const trackBox =
          await track.boundingBox();

        const thumbBox =
          await slider.boundingBox();

        if (
          !trackBox ||
          !thumbBox
        ) {
          throw new Error(
            `Missing pan bounds for ${runtime.runtime}.`
          );
        }

        await page.mouse.move(
          thumbBox.x +
            thumbBox.width / 2,
          thumbBox.y +
            thumbBox.height / 2
        );

        await page.mouse.down();

        await page.mouse.move(
          trackBox.x +
            trackBox.width *
              0.52,
          thumbBox.y +
            thumbBox.height / 2
        );

        await page.mouse.up();

        await expect(
          value
        ).toHaveText("0");

        await expect(
          committed
        ).toHaveText("0");

        await expect(
          page.getByTestId(
            "parse-left"
          )
        ).toHaveText("-0.3");

        await expect(
          page.getByTestId(
            "parse-center"
          )
        ).toHaveText("0");

        await expect(
          page.getByTestId(
            "parse-right"
          )
        ).toHaveText("0.15");

        await expect(
          page.getByTestId(
            "describe-right"
          )
        ).toHaveText(
          "30% right"
        );

        expect(
          consoleFailures
        ).toEqual([]);

        await page.screenshot({
          fullPage: true,
          path: screenshot,
        });

        report.runtimes.push({
          committed:
            await committed.textContent(),
          consoleFailures,
          finalValue:
            await value.textContent(),
          runtime:
            runtime.runtime,
          screenshot:
            screenshot.slice(
              root.length + 1
            ),
        });
      } finally {
        await browser.close();
      }
    } finally {
      preview.kill(
        "SIGTERM"
      );

      if (
        preview.exitCode ===
        null
      ) {
        await once(
          preview,
          "close"
        );
      }
    }
  }

  report.pass = true;
} catch (error) {
  report.error =
    error instanceof Error
      ? error.message
      : String(error);

  throw error;
} finally {
  await writeFile(
    artifactPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
}
