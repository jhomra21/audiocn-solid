import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

/** Native browser audio: deliberately no timer-driven fake output flags. */
export default defineConfig({
  ...base,
  testMatch: ["safari-audio.spec.ts", "footer.spec.ts"],
  outputDir: "test-results/ios-safari-audio-fix",
  use: {
    ...base.use,
    launchOptions: {},
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  workers: 1,
});
