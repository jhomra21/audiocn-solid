import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://127.0.0.1:4180",
    viewport: { height: 900, width: 1280 },
  },
  webServer: {
    command: "bun run preview -- --host 127.0.0.1 --port 4180",
    reuseExistingServer: false,
    url: "http://127.0.0.1:4180",
  },
});
