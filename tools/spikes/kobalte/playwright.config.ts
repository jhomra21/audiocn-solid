import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tools/spikes/kobalte",
  testMatch: "spike.spec.ts",
  use: {
    baseURL: process.env.KOBALTE_BASE_URL,
    viewport: {
      height: 900,
      width: 1280,
    },
  },
});
