import { fileURLToPath, URL } from "node:url";

import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL("./app/solid2", import.meta.url)),
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "@kobalte/core/slider": fileURLToPath(
        new URL("./node_modules/@kobalte/core-solid2/dist/slider/index.jsx", import.meta.url)
      ),
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  server: {
    port: 4174,
  },
});
