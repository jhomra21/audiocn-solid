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
  finalVolume: string;
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
  "volume-control-e2e.json"
);

const appSource = `import { createSignal } from "solid-js";

import {
  VolumeControl,
  VolumeControlMute,
  VolumeControlSlider,
  VolumeControlValue,
} from "@/components/ui/volume-control";

export default function App() {
  const [volume, setVolume] = createSignal(0.25);
  const [muted, setMuted] = createSignal(false);
  const [committed, setCommitted] = createSignal("none");
  const [restored, setRestored] = createSignal("none");

  return (
    <main style="display: grid; gap: 36px; padding: 48px; width: 560px">
      <VolumeControl
        muted={muted()}
        onMutedChange={setMuted}
        onValueChange={setVolume}
        onValueCommitted={(next) => setCommitted(String(next))}
        value={volume()}
      >
        <VolumeControlMute />
        <VolumeControlSlider />
        <VolumeControlValue />
      </VolumeControl>

      <VolumeControl
        defaultValue={0}
        onValueChange={(next) => setRestored(String(next))}
      />

      <VolumeControl
        defaultValue={0.25}
        orientation="vertical"
      >
        <VolumeControlMute />
        <VolumeControlSlider />
        <VolumeControlValue />
      </VolumeControl>

      <output data-testid="volume">{String(volume())}</output>
      <output data-testid="muted">{String(muted())}</output>
      <output data-testid="committed">{committed()}</output>
      <output data-testid="restored">{restored()}</output>
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
      5051 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `volume-control-${runtime.runtime}.png`
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
              height: 760,
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

        const groups =
          page.getByRole(
            "group",
            {
              name: "Volume",
            }
          );

        const main =
          groups.nth(0);

        const zero =
          groups.nth(1);

        const vertical =
          groups.nth(2);

        const slider =
          main.getByRole(
            "slider",
            {
              name: "Volume",
            }
          );

        const mute =
          main.getByRole(
            "button",
            {
              name: "Mute",
            }
          );

        const value =
          main.locator(
            '[data-slot="volume-control-value"]'
          );

        await expect(
          slider
        ).toHaveAttribute(
          "aria-valuetext",
          "25%"
        );

        await expect(
          value
        ).toHaveText("50%");

        await expect(
          main
        ).toHaveAttribute(
          "data-level",
          "low"
        );

        await slider.focus();

        await slider.press(
          "ArrowRight"
        );

        await expect(
          page.getByTestId(
            "volume"
          )
        ).toHaveText("0.3025");

        await expect(
          page.getByTestId(
            "committed"
          )
        ).toHaveText("0.3025");

        await mute.click();

        await expect(
          page.getByTestId(
            "muted"
          )
        ).toHaveText("true");

        await expect(
          slider
        ).toHaveAttribute(
          "aria-valuetext",
          "Muted"
        );

        await expect(
          value
        ).toHaveText("0%");

        await expect(
          main
        ).toHaveAttribute(
          "data-level",
          "muted"
        );

        await main
          .getByRole(
            "button",
            {
              name: "Unmute",
            }
          )
          .click();

        await expect(
          page.getByTestId(
            "muted"
          )
        ).toHaveText("false");

        await slider.press(
          "Home"
        );

        await expect(
          page.getByTestId(
            "volume"
          )
        ).toHaveText("0");

        await slider.press(
          "End"
        );

        await expect(
          page.getByTestId(
            "volume"
          )
        ).toHaveText("1");

        await slider.press(
          "Home"
        );

        const track =
          main.locator(
            '[data-slot="volume-control-slider"]'
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
            `Missing volume bounds for ${runtime.runtime}.`
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
              0.5,
          thumbBox.y +
            thumbBox.height / 2
        );

        await page.mouse.up();

        await expect(
          page.getByTestId(
            "volume"
          )
        ).toHaveText("0.25");

        await expect(
          page.getByTestId(
            "committed"
          )
        ).toHaveText("0.25");

        const zeroMute =
          zero.getByRole(
            "button",
            {
              name: "Mute",
            }
          );

        await zeroMute.click();

        await zero
          .getByRole(
            "button",
            {
              name: "Unmute",
            }
          )
          .click();

        await expect(
          page.getByTestId(
            "restored"
          )
        ).toHaveText("1");

        await expect(
          vertical
        ).toHaveAttribute(
          "data-orientation",
          "vertical"
        );

        await expect(
          vertical.getByRole(
            "slider",
            {
              name: "Volume",
            }
          )
        ).toHaveAttribute(
          "aria-valuetext",
          "25%"
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
            await page
              .getByTestId(
                "committed"
              )
              .textContent(),
          consoleFailures,
          finalVolume:
            await page
              .getByTestId(
                "volume"
              )
              .textContent(),
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
