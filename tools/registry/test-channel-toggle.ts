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
  consoleFailures: string[];
  muted: string;
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
  "channel-toggle-e2e.json"
);

const appSource = `import { createSignal } from "solid-js";

import {
  ChannelToggle,
  MonitorToggle,
  MuteToggle,
  SoloToggle,
} from "@/components/ui/channel-toggle";
import { AudioConfigProvider } from "@/hooks/use-audio-config";

export default function App() {
  const [muted, setMuted] = createSignal(false);
  const [eventType, setEventType] = createSignal("none");

  return (
    <main style="display: grid; gap: 20px; padding: 48px; width: 420px">
      <div style="display: flex; gap: 8px">
        <MuteToggle
          onPressedChange={(next, event) => {
            setMuted(next);
            setEventType(event.type);
          }}
          pressed={muted()}
        >
          M
        </MuteToggle>

        <SoloToggle defaultPressed>
          S
        </SoloToggle>

        <MonitorToggle>
          I
        </MonitorToggle>
      </div>

      <AudioConfigProvider value={{ disabled: true }}>
        <ChannelToggle aria-label="Inherited disabled">
          D
        </ChannelToggle>
      </AudioConfigProvider>

      <output data-testid="muted">{String(muted())}</output>
      <output data-testid="event-type">{eventType()}</output>
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
      5041 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `channel-toggle-${runtime.runtime}.png`
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
              height: 520,
              width: 760,
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

        const mute =
          page.getByRole(
            "button",
            {
              name: "Mute",
            }
          );

        const solo =
          page.getByRole(
            "button",
            {
              name: "Solo",
            }
          );

        const monitor =
          page.getByRole(
            "button",
            {
              name: "Monitor",
            }
          );

        const inherited =
          page.getByRole(
            "button",
            {
              name:
                "Inherited disabled",
            }
          );

        await expect(
          mute
        ).toHaveAttribute(
          "aria-pressed",
          "false"
        );

        await mute.click();

        await expect(
          mute
        ).toHaveAttribute(
          "aria-pressed",
          "true"
        );

        await expect(
          mute
        ).toHaveAttribute(
          "data-pressed",
          ""
        );

        await expect(
          page.getByTestId(
            "muted"
          )
        ).toHaveText("true");

        await expect(
          page.getByTestId(
            "event-type"
          )
        ).toHaveText("click");

        await mute.click();

        await expect(
          mute
        ).toHaveAttribute(
          "aria-pressed",
          "false"
        );

        await expect(
          mute
        ).not.toHaveAttribute(
          "data-pressed"
        );

        await expect(
          solo
        ).toHaveAttribute(
          "aria-pressed",
          "true"
        );

        await expect(
          solo
        ).toHaveAttribute(
          "data-tone",
          "solo"
        );

        await expect(
          monitor
        ).toHaveAttribute(
          "data-tone",
          "monitor"
        );

        await expect(
          inherited
        ).toBeDisabled();

        expect(
          consoleFailures
        ).toEqual([]);

        await page.screenshot({
          fullPage: true,
          path: screenshot,
        });

        report.runtimes.push({
          consoleFailures,
          muted:
            await page
              .getByTestId(
                "muted"
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
