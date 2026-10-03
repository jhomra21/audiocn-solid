import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "solid1.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "bun run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
