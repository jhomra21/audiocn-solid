import { fileURLToPath, URL } from "node:url";

import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./app/solid2", import.meta.url)),
  plugins: [solid(), tailwindcss()],
  resolve: {
    dedupe: ["solid-js", "@solidjs/web"],
    alias: {
      "@kobalte/core/primitives/create-dom-collection": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid2/dist/primitives/create-dom-collection/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/context-menu": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid2/dist/context-menu/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/select": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid2/dist/select/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/popover": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid2/dist/popover/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/slider": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid2/dist/slider/index.jsx",
          import.meta.url
        )
      ),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  server: {
    port: 4174,
  },
});
