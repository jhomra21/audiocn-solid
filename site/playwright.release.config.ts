import { defineConfig } from "@playwright/test";

import base from "./playwright.config";

export default defineConfig({
  ...base,
  testIgnore: [
    "ai-dev.spec.ts",
    "home-audio-routing.spec.ts",
    "parity/parity.spec.ts",
    "parity/search.spec.ts",
    "spike-2.spec.ts",
    "spike-5.spec.ts",
  ],
  workers: 1,
});
