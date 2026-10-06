import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "ai-dev.spec.ts",
  globalTimeout: 180_000,
  timeout: 25_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4400",
    navigationTimeout: 15_000,
    launchOptions: { args: ["--disable-audio-output"] },
  },
  webServer: {
    command:
      process.env.AUDIOCN_AI_NATIVE === "1"
        ? "bun run dev -- --host 127.0.0.1 --port 4400 --strictPort --force"
        : "bunx vite --config vite.isolated.config.ts",
    url: "http://127.0.0.1:4400/docs/components/knob.md",
    timeout: 30_000,
    reuseExistingServer: false,
  },
});
