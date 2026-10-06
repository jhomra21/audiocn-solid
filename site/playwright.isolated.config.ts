import { defineConfig } from "@playwright/test";

// Dev SSR stalls in the current Solid 2 toolchain. Build and serve isolated
// static output until that toolchain issue is resolved, leaving dist/ alone.
export default defineConfig({
  testDir: "./e2e",
  use: {
    launchOptions: { args: ["--disable-audio-output"] },
    baseURL: "http://127.0.0.1:4400",
    viewport: { height: 900, width: 1280 },
  },
  webServer: {
    command:
      "bunx vite build --config vite.isolated.config.ts && bun run scripts/build-docs-markdown.ts /tmp/audiocn-search-ai/site/dist/client && bunx vite preview --config vite.isolated.config.ts --host 127.0.0.1 --port 4400 --strictPort",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4400",
  },
});
