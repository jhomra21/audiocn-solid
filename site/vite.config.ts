import { fileURLToPath, URL } from "node:url";

import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { prerender } from "prerender-crawler/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    solid({
      extensions: [".jsx", ".tsx"],
      ssr: true,
      start: true,
    }),
    fileRoutes({ codeSplitting: false }),
    tailwindcss(),
    prerender({ mode: "static" }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("..", import.meta.url)),
    },
    dedupe: ["solid-js", "@solidjs/web"],
  },
  build: {
    sourcemap: true,
  },
});
