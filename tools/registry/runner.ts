import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const artifacts = join(root, "artifacts");

export const run = async (
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

export const waitForServer = async (url: string): Promise<void> => {
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

type Runtime = "solid1" | "solid2";

type Evidence = Record<string, string | string[] | null>;

interface InstallReport {
  pass: boolean;
  runtimes: { fixture: string; runtime: Runtime }[];
}

interface AcceptanceReport {
  pass: boolean;
  runtimes: Evidence[];
  error?: string;
}

export interface AcceptanceTest {
  appSource: string;
  /** Drives the loaded page and returns extra evidence for the runtime's report entry. */
  check: (page: Page, runtime: Runtime) => Promise<Evidence>;
  name: string;
  port: number;
  viewport: { height: number; width: number };
}

/** Builds each installed fixture with `appSource`, previews it in Chromium, and writes `artifacts/<name>-e2e.json`. */
export const runAcceptance = async (test: AcceptanceTest): Promise<void> => {
  const artifactPath = join(artifacts, `${test.name}-e2e.json`);

  const installReport: InstallReport = JSON.parse(
    await readFile(join(artifacts, "registry-install.json"), "utf8")
  );

  if (!installReport.pass) {
    throw new Error("Registry install report did not pass.");
  }

  const report: AcceptanceReport = {
    pass: false,
    runtimes: [],
  };

  await mkdir(artifacts, { recursive: true });

  try {
    for (const [
      index,
      { fixture, runtime },
    ] of installReport.runtimes.entries()) {
      const port = test.port + index;
      const baseUrl = `http://127.0.0.1:${port}`;
      const screenshot = join(artifacts, `${test.name}-${runtime}.png`);

      await writeFile(join(fixture, "src", "App.tsx"), test.appSource);
      await run("bun", ["run", "typecheck"], fixture);
      await run("bun", ["run", "build"], fixture);

      const preview = spawn(
        "bunx",
        ["vite", "preview", "--host", "127.0.0.1", "--port", String(port)],
        {
          cwd: fixture,
          env: process.env,
          stdio: "inherit",
        }
      );

      try {
        await waitForServer(baseUrl);

        const browser = await chromium.launch();

        try {
          const page = await browser.newPage({ viewport: test.viewport });
          const consoleFailures: string[] = [];

          page.on("console", (message) => {
            if (message.type() === "warning" || message.type() === "error") {
              consoleFailures.push(`${message.type()}: ${message.text()}`);
            }
          });

          page.on("pageerror", (error) => {
            consoleFailures.push(`pageerror: ${error.message}`);
          });

          await page.goto(baseUrl);

          const evidence = await test.check(page, runtime);

          expect(consoleFailures).toEqual([]);

          await page.screenshot({
            fullPage: true,
            path: screenshot,
          });

          // Sorted keys keep report entries in a stable order regardless of which evidence a test returns.
          report.runtimes.push(
            Object.fromEntries(
              Object.entries({
                ...evidence,
                consoleFailures,
                runtime,
                screenshot: screenshot.slice(root.length + 1),
              }).sort(([a], [b]) => (a < b ? -1 : 1))
            )
          );
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
    await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  }
};
