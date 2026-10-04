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
  focused: string;
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
  "mixer-e2e.json"
);

const appSource = `import {
  ChannelStrip,
  ChannelStripFader,
  ChannelStripTitle,
} from "@/components/ui/channel-strip";
import {
  Fader,
  FaderThumb,
  FaderTrack,
} from "@/components/ui/fader";
import {
  Mixer,
  MixerChannels,
  MixerEmpty,
  MixerHeader,
  MixerMaster,
  MixerSeparator,
  MixerTitle,
  useMixerContext,
} from "@/components/ui/mixer";
import { useAudioConfig } from "@/hooks/use-audio-config";

const ContextProbe = () => {
  const mixer = useMixerContext();
  const config = useAudioConfig();

  return (
    <output data-testid="mixer-context">
      {mixer.orientation}|{config.orientation}|{config.size}|{String(config.disabled)}|{config.minDb}|{config.maxDb}
    </output>
  );
};

const Strip = (props: { name: string }) => (
  <ChannelStrip>
    <ChannelStripTitle>{props.name}</ChannelStripTitle>
    <ChannelStripFader>
      <Fader aria-label={props.name + " volume"}>
        <FaderTrack>
          <FaderThumb />
        </FaderTrack>
      </Fader>
    </ChannelStripFader>
  </ChannelStrip>
);

export default function App() {
  return (
    <main style="display: grid; gap: 40px; padding: 48px; min-height: 760px">
      <Mixer
        disabled
        maxDb={3}
        minDb={-72}
        orientation="vertical"
        size="sm"
      >
        <MixerHeader>
          <MixerTitle>Console</MixerTitle>
        </MixerHeader>

        <MixerChannels>
          <Strip name="A" />
          <Strip name="B" />
        </MixerChannels>

        <MixerSeparator />

        <MixerMaster>
          <ChannelStrip variant="master">
            <ChannelStripTitle>Master</ChannelStripTitle>
          </ChannelStrip>
        </MixerMaster>

        <ContextProbe />
      </Mixer>

      <Mixer>
        <MixerTitle>Empty mixer</MixerTitle>
        <MixerChannels />
        <MixerEmpty>Nothing here</MixerEmpty>
      </Mixer>
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
      5081 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `mixer-${runtime.runtime}.png`
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
              width: 1100,
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

        const mixer =
          page.getByRole(
            "group",
            {
              name: "Console",
            }
          );

        await expect(
          mixer
        ).toHaveAttribute(
          "data-orientation",
          "vertical"
        );

        await expect(
          mixer
        ).toHaveAttribute(
          "data-size",
          "sm"
        );

        await expect(
          page.getByTestId(
            "mixer-context"
          )
        ).toHaveText(
          "vertical|vertical|sm|true|-72|3"
        );

        const sliders =
          mixer.getByRole(
            "slider"
          );

        await expect(
          sliders
        ).toHaveCount(2);

        const first =
          sliders.nth(0);

        const second =
          sliders.nth(1);

        await first.focus();

        await first.press(
          "Control+ArrowRight"
        );

        await expect(
          second
        ).toBeFocused();

        await second.press(
          "Control+ArrowLeft"
        );

        await expect(
          first
        ).toBeFocused();

        await expect(
          mixer.locator(
            '[data-slot="mixer-separator"]'
          )
        ).toHaveClass(
          /h-full/
        );

        await expect(
          mixer.locator(
            '[data-slot="mixer-master"]'
          )
        ).toContainText(
          "Master"
        );

        const empty =
          page.getByRole(
            "group",
            {
              name:
                "Empty mixer",
            }
          );

        await expect(
          empty.locator(
            '[data-slot="mixer-channels"]'
          )
        ).toBeHidden();

        await expect(
          empty.locator(
            '[data-slot="mixer-empty"]'
          )
        ).toBeVisible();

        expect(
          consoleFailures
        ).toEqual([]);

        await page.screenshot({
          fullPage: true,
          path: screenshot,
        });

        report.runtimes.push({
          consoleFailures,
          focused:
            await page.evaluate(
              () => {
                const active =
                  document.activeElement;

                return active instanceof
                  HTMLElement
                  ? active.getAttribute(
                      "aria-label"
                    ) ?? ""
                  : "";
              }
            ),
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
