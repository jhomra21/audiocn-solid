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

const installReportPath = join(root, "artifacts", "registry-install.json");

const artifactPath = join(root, "artifacts", "fader-e2e.json");

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

const waitForServer = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Preview has not bound the port yet.
    }

    await Bun.sleep(100);
  }

  throw new Error(`Timed out waiting for ${url}.`);
};

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
    const port = 5001 + index;
    const baseUrl = `http://127.0.0.1:${port}`;

    const screenshot = join(
      root,
      "artifacts",
      `fader-${runtime.runtime}.png`
    );

    await writeFile(join(runtime.fixture, "src", "App.tsx"), appSource);

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
          viewport: { height: 700, width: 900 },
        });

        const consoleFailures: string[] = [];

        page.on("console", (message) => {
          if (message.type() === "warning" || message.type() === "error") {
            consoleFailures.push(
              `${message.type()}: ${message.text()}`
            );
          }
        });

        page.on("pageerror", (error) => {
          consoleFailures.push(`pageerror: ${error.message}`);
        });

        await page.goto(baseUrl);

        const thumb = page.getByRole("slider", { name: "Gain" });
        const value = page.getByTestId("fader-value");
        const reason = page.getByTestId("fader-reason");
        const committed = page.getByTestId("fader-committed");

        await expect(thumb).toBeVisible();
        await expect(thumb).toHaveAttribute(
          "aria-valuetext",
          "−12.0 dB"
        );

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

        await page
          .locator('[data-slot="fader-value"]')
          .click();
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
        await thumb.dispatchEvent("wheel", {
          deltaY: -100,
        });
        await expect(value).toHaveText("0.5");
        await expect(reason).toHaveText("wheel");
        await expect(committed).toHaveText("0.5");

        await thumb.press("Home");
        await expect(value).toHaveText("-Infinity");
        await expect(thumb).toHaveAttribute("aria-valuetext", "Silent");

        await thumb.press("ArrowRight");
        await expect(value).toHaveText("-60");

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
  report.error = error instanceof Error ? error.message : String(error);

  throw error;
} finally {
  await writeFile(
    artifactPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
}
