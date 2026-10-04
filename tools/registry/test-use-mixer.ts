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
  persistedGain: string;
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
  "use-mixer-e2e.json"
);

const appSource = `import { createSignal } from "solid-js";

import {
  useMixer,
} from "@/hooks/use-mixer";
import type {
  MixerState,
} from "@/hooks/use-mixer";

const initialControlled: MixerState = {
  channels: [
    {
      gainDb: 0,
      id: "controlled",
      monitor: false,
      muted: false,
      pan: 0,
      solo: false,
    },
  ],
  master: {
    gainDb: 0,
    muted: false,
  },
};

export default function App() {
  const mixer = useMixer({
    channels: [
      { id: "a" },
      { id: "b" },
    ],
    master: {
      gainDb: -3,
    },
  });

  const persisted = useMixer({
    channels: [
      { id: "persist" },
    ],
    persistKey: "audiocn-solid-use-mixer-e2e",
  });

  const [controlledState, setControlledState] =
    createSignal(initialControlled);

  const controlled = useMixer({
    get state() {
      return controlledState();
    },
    onStateChange: setControlledState,
  });

  const a = () => mixer.channel("a");
  const b = () => mixer.channel("b");
  const persistedChannel = () =>
    persisted.channel("persist");
  const controlledChannel = () =>
    controlled.channel("controlled");

  return (
    <main style="display: grid; gap: 12px; padding: 48px">
      <button onClick={() => mixer.setGain("a", -12)}>gain</button>
      <button onClick={() => mixer.setPan("a", 2)}>pan</button>
      <button onClick={() => mixer.setMuted("a", true)}>mute-a</button>
      <button onClick={() => mixer.setSolo("b", true)}>solo-b</button>
      <button onClick={() => mixer.setSolo("a", true, { exclusive: true })}>solo-a-exclusive</button>
      <button onClick={() => mixer.setMonitor("a", true)}>monitor</button>
      <button onClick={() => mixer.setMasterGain(-8)}>master-gain</button>
      <button onClick={() => mixer.setMasterMuted(true)}>master-mute</button>
      <button onClick={() => mixer.addChannel({ id: "c", gainDb: -6 })}>add-c</button>
      <button onClick={() => mixer.removeChannel("c")}>remove-c</button>
      <button onClick={() => mixer.reset()}>reset</button>
      <button onClick={() => persisted.setGain("persist", -9)}>persist-gain</button>
      <button onClick={() => controlled.setPan("controlled", -0.75)}>controlled-pan</button>

      <output data-testid="a">
        {a()?.gainDb}|{a()?.pan}|{String(a()?.muted)}|{String(a()?.solo)}|{String(a()?.monitor)}
      </output>
      <output data-testid="b">
        {String(b()?.solo)}
      </output>
      <output data-testid="audible">
        {String(mixer.isAudible("a"))}|{String(mixer.isAudible("b"))}|{String(mixer.isDimmed("a"))}|{String(mixer.isDimmed("b"))}
      </output>
      <output data-testid="master">
        {mixer.master.gainDb}|{String(mixer.master.muted)}
      </output>
      <output data-testid="count">
        {mixer.channels.length}
      </output>
      <output data-testid="persisted-gain">
        {persistedChannel()?.gainDb}
      </output>
      <output data-testid="controlled-pan">
        {controlledChannel()?.pan}
      </output>
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
      5091 + index;

    const baseUrl =
      `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `use-mixer-${runtime.runtime}.png`
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

        const a =
          page.getByTestId("a");

        const b =
          page.getByTestId("b");

        const audible =
          page.getByTestId(
            "audible"
          );

        const master =
          page.getByTestId(
            "master"
          );

        await expect(
          a
        ).toHaveText(
          "0|0|false|false|false"
        );

        await expect(
          master
        ).toHaveText(
          "-3|false"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "gain",
          })
          .click();

        await expect(
          a
        ).toHaveText(
          "-12|0|false|false|false"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "pan",
          })
          .click();

        await expect(
          a
        ).toHaveText(
          "-12|1|false|false|false"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "solo-b",
          })
          .click();

        await expect(
          b
        ).toHaveText("true");

        await expect(
          audible
        ).toHaveText(
          "false|true|true|false"
        );

        await page
          .getByRole("button", {
            exact: true,
            name:
              "solo-a-exclusive",
          })
          .click();

        await expect(
          a
        ).toHaveText(
          "-12|1|false|true|false"
        );

        await expect(
          b
        ).toHaveText("false");

        await page
          .getByRole("button", {
            exact: true,
            name: "mute-a",
          })
          .click();

        await expect(
          audible
        ).toHaveText(
          "false|false|false|true"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "monitor",
          })
          .click();

        await expect(
          a
        ).toHaveText(
          "-12|1|true|true|true"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "master-gain",
          })
          .click();

        await page
          .getByRole("button", {
            exact: true,
            name: "master-mute",
          })
          .click();

        await expect(
          master
        ).toHaveText(
          "-8|true"
        );

        await page
          .getByRole("button", {
            exact: true,
            name: "add-c",
          })
          .click();

        await expect(
          page.getByTestId(
            "count"
          )
        ).toHaveText("3");

        await page
          .getByRole("button", {
            exact: true,
            name: "remove-c",
          })
          .click();

        await expect(
          page.getByTestId(
            "count"
          )
        ).toHaveText("2");

        await page
          .getByRole("button", {
            exact: true,
            name:
              "controlled-pan",
          })
          .click();

        await expect(
          page.getByTestId(
            "controlled-pan"
          )
        ).toHaveText("-0.75");

        await page
          .getByRole("button", {
            exact: true,
            name:
              "persist-gain",
          })
          .click();

        await expect(
          page.getByTestId(
            "persisted-gain"
          )
        ).toHaveText("-9");

        await page.reload();

        await expect(
          page.getByTestId(
            "persisted-gain"
          )
        ).toHaveText("-9");

        await page
          .getByRole("button", {
            exact: true,
            name: "reset",
          })
          .click();

        await expect(
          page.getByTestId(
            "a"
          )
        ).toHaveText(
          "0|0|false|false|false"
        );

        await expect(
          page.getByTestId(
            "master"
          )
        ).toHaveText(
          "-3|false"
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
          persistedGain:
            await page
              .getByTestId(
                "persisted-gain"
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
