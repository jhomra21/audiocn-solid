import { join } from "node:path";

import { defineConfig } from "@playwright/test";

const artifacts = join(import.meta.dirname, "../artifacts");

const run = process.env.HOME_ROUTING_FAULT ?? "baseline";

// The home tile contract against an isolated preview on its own port, with
// an optional in-memory fault from e2e/home-routing.vite.config.ts.
export default defineConfig({
  globalTimeout: 180_000,
  // Whole-home RAF work can take longer than virtual time on a busy host.
  // Meter deadlines remain controlled by runFor, not this wall-clock budget.
  timeout: 60_000,
  // Parallel site suites clean site/test-results; keep this lane outside it.
  outputDir: join(artifacts, "home-tile-browser", run),
  reporter: [
    ["line"],
    [
      "json",
      { outputFile: join(artifacts, `home-tile-contract-${run}-result.json`) },
    ],
  ],
  testDir: "./e2e",
  testMatch: "home-audio-routing.spec.ts",
  use: {
    // Timer-driven fake audio output keeps the audio clock independent of the host speakers.
    launchOptions: { args: ["--disable-audio-output"] },
    baseURL: "http://127.0.0.1:4398",
    viewport: { height: 900, width: 1280 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "bunx vite build --config e2e/home-routing.vite.config.ts && bunx vite preview --config e2e/home-routing.vite.config.ts --host 127.0.0.1 --port 4398 --strictPort",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    url: "http://127.0.0.1:4398",
  },
  workers: 1,
});
