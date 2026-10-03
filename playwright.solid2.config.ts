import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "solid2.spec.ts",
  outputDir: "test-results/solid2",
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "bunx vite --config vite.solid2.config.ts --host 127.0.0.1",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
  },
});
