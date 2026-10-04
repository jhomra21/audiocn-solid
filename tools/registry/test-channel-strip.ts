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
  "channel-strip-e2e.json"
);

const appSource = `import { createSignal } from "solid-js";

import {
  ChannelStrip,
  ChannelStripActions,
  ChannelStripControls,
  ChannelStripDescription,
  ChannelStripFader,
  ChannelStripHeader,
  ChannelStripIcon,
  ChannelStripMeter,
  ChannelStripNotice,
  ChannelStripStatus,
  ChannelStripText,
  ChannelStripTitle,
  ChannelStripValue,
  useChannelStrip,
} from "@/components/ui/channel-strip";
import { useAudioConfig } from "@/hooks/use-audio-config";

const StateProbe = () => {
  const strip = useChannelStrip();

  return (
    <output data-testid="strip-state">
      {strip.orientation}|{String(strip.muted)}|{String(strip.solo)}|{String(strip.dimmed)}
    </output>
  );
};

const ConfigProbe = () => {
  const config = useAudioConfig();

  return (
    <output data-testid="config-state">
      {config.orientation}|{String(config.dimmed)}|{String(config.disabled)}|{config.size}
    </output>
  );
};

export default function App() {
  const [clipping, setClipping] = createSignal(false);

  return (
    <main style="display: grid; gap: 32px; padding: 48px; width: 760px">
      <button onClick={() => setClipping((value) => !value)}>
        Toggle clipping
      </button>

      <ChannelStrip
        accent="oklch(0.7 0.2 160)"
        disabled
        muted
        orientation="vertical"
        selected
        size="lg"
        solo
        variant="card"
      >
        <ChannelStripHeader>
          <ChannelStripIcon>*</ChannelStripIcon>
          <ChannelStripText>
            <ChannelStripTitle>Mic</ChannelStripTitle>
            <ChannelStripDescription>Input 1</ChannelStripDescription>
          </ChannelStripText>
          <ChannelStripStatus tone="live">Live</ChannelStripStatus>
          <ChannelStripActions>Actions</ChannelStripActions>
        </ChannelStripHeader>

        <ChannelStripMeter>
          <div
            aria-label="Fake meter"
            data-clipping={clipping() ? "" : undefined}
            data-slot="level-meter"
          />
        </ChannelStripMeter>

        <ChannelStripFader>Fader</ChannelStripFader>
        <ChannelStripValue>−6.0 dB</ChannelStripValue>
        <ChannelStripControls>Controls</ChannelStripControls>
        <ChannelStripNotice variant="warning">Peak warning</ChannelStripNotice>

        <StateProbe />
        <ConfigProbe />
      </ChannelStrip>

      <ChannelStrip>
        <ChannelStripTitle>Aux</ChannelStripTitle>
      </ChannelStrip>
    </main>
  );
}
`;

const run = async (
  command: string,
  args: string[],
  cwd: string
): Promise<void> => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  const [code] = await once(child, "close");

  if (code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${String(code)}.`
    );
  }
};

const waitForServer = async (
  url: string
): Promise<void> => {
  for (
    let attempt = 0;
    attempt < 80;
    attempt += 1
  ) {
    try {
      const response =
        await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Preview has not bound the port yet.
    }

    await Bun.sleep(100);
  }

  throw new Error(
    `Timed out waiting for ${url}.`
  );
};

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
      5071 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `channel-strip-${runtime.runtime}.png`
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
              height: 900,
              width: 1000,
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

        const mic =
          page.getByRole(
            "group",
            {
              name: "Mic",
            }
          );

        await expect(
          mic
        ).toHaveAttribute(
          "data-orientation",
          "vertical"
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-muted",
          ""
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-solo",
          ""
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-selected",
          ""
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-disabled",
          ""
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-size",
          "lg"
        );

        await expect(
          mic
        ).toHaveAttribute(
          "data-variant",
          "card"
        );

        await expect(
          mic
        ).toHaveAttribute(
          "style",
          /--channel-accent/
        );

        await expect(
          page.getByTestId(
            "strip-state"
          )
        ).toHaveText(
          "vertical|true|true|false"
        );

        await expect(
          page.getByTestId(
            "config-state"
          )
        ).toHaveText(
          "vertical|true|true|lg"
        );

        await expect(
          mic.locator(
            '[data-slot="channel-strip-status"]'
          )
        ).toHaveAttribute(
          "data-tone",
          "live"
        );

        await expect(
          mic.locator(
            '[data-slot="channel-strip-notice"]'
          )
        ).toHaveText(
          "Peak warning"
        );

        await expect(
          mic
        ).not.toHaveAttribute(
          "data-clipping"
        );

        await page
          .getByRole(
            "button",
            {
              name:
                "Toggle clipping",
            }
          )
          .click();

        await expect(
          mic
        ).toHaveAttribute(
          "data-clipping",
          ""
        );

        await page
          .getByRole(
            "button",
            {
              name:
                "Toggle clipping",
            }
          )
          .click();

        await expect(
          mic
        ).not.toHaveAttribute(
          "data-clipping"
        );

        const layout =
          mic.locator(
            '[data-slot="channel-strip-layout"]'
          );

        await expect(
          layout
        ).toContainText(
          "Fader"
        );

        const aux =
          page.getByRole(
            "group",
            {
              name: "Aux",
            }
          );

        await expect(
          aux
        ).toHaveClass(
          /@container\/channel-strip/
        );

        expect(
          consoleFailures
        ).toEqual([]);

        await page.screenshot({
          fullPage: true,
          path: screenshot,
        });

        report.runtimes.push({
          consoleFailures,
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
