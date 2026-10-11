import { resolve } from "node:path";

import { defineConfig } from "@playwright/test";

// AUDIOCN_UPSTREAM_SOURCE=/path/to/pinned/react bunx playwright test --config tools/compare/playwright.config.ts
export default defineConfig({
  testDir: ".",
  testMatch: "paired.spec.ts",
  workers: 1,
  timeout: 30_000,
  use: { viewport: { width: 1280, height: 800 } },
  webServer: {
    command: "bun run tools/compare/fixture-server.ts",
    cwd: resolve(import.meta.dirname, "../.."),
    url: "http://127.0.0.1:4502",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  outputDir: "../../artifacts/react-solid-fidelity/paired-owner-results",
  reporter: [
    ["list"],
    [
      "json",
      {
        outputFile:
          "../../artifacts/react-solid-fidelity/paired-owner-results.json",
      },
    ],
  ],
});
