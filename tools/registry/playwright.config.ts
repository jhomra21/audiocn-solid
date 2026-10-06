import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "consumer.spec.ts",
  use: {
    launchOptions: { args: ["--disable-audio-output"] },
  },
});
