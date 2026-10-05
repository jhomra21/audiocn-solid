import { fileURLToPath, URL } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "@kobalte/core/select": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid1/dist/select/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/popover": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid1/dist/popover/index.jsx",
          import.meta.url
        )
      ),
      "@kobalte/core/slider": fileURLToPath(
        new URL(
          "./node_modules/@kobalte/core-solid1/dist/slider/index.jsx",
          import.meta.url
        )
      ),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  server: {
    port: 4173,
  },
});
