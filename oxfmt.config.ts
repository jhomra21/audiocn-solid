import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  printWidth: 80,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "**/dist/**",
    "**/artifacts/**",
    "**/test-results/**",
    "**/playwright-report/**",
    "site/public/r/**",
    "site/public/search-index.json",
    "tools/oxlint/anti-slop/**",
  ],
});
