import { fileURLToPath, URL } from "node:url";

import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { prerender } from "prerender-crawler/vite";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import { defineConfig } from "vite";

import { remarkInstallCommand } from "./lib/docs/remark-install-command.ts";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        elementAttributeNameCase: "html",
        jsx: true,
        providerImportSource: "@/site/src/mdx-provider",
        stylePropertyNameCase: "css",
        rehypePlugins: [
          rehypeSlug,
          [
            rehypeShiki,
            {
              themes: {
                dark: "github-dark-high-contrast",
                light: "github-light",
              },
            },
          ],
        ],
        remarkPlugins: [
          remarkFrontmatter,
          remarkMdxFrontmatter,
          remarkGfm,
          remarkInstallCommand,
          [remarkToc, { heading: "Contents", maxDepth: 3 }],
        ],
      }),
    },
    solid({
      extensions: [".jsx", ".tsx", ".mdx"],
      ssr: true,
      start: true,
    }),
    fileRoutes({ codeSplitting: false }),
    tailwindcss(),
    prerender({ mode: "static" }),
  ],
  resolve: {
    alias: {
      "@kobalte/core/slider": fileURLToPath(
        new URL("../node_modules/@kobalte/core-solid2/dist/slider/index.jsx", import.meta.url)
      ),
      "@": fileURLToPath(new URL("..", import.meta.url)),
    },
    dedupe: ["solid-js", "@solidjs/web"],
  },
  build: {
    sourcemap: true,
  },
});
