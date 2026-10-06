import { fileURLToPath, URL } from "node:url";

import mdx from "@mdx-js/rollup";
import rehypeShiki from "@shikijs/rehype";
import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { routePathFromFile } from "filesystem-routing";
import { fileRoutes } from "filesystem-routing/vite";
import { prerender } from "prerender-crawler/vite";
import rehypeSlug from "rehype-slug";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import remarkToc from "remark-toc";
import { defineConfig } from "vite";

import { codeHighlightOptions } from "./lib/docs/code-highlight.ts";
import { markdownEndpoints } from "./lib/docs/markdown-endpoints.ts";
import { remarkComponentSource } from "./lib/docs/remark-component-source.ts";
import { remarkInstallCommand } from "./lib/docs/remark-install-command.ts";

export default defineConfig(({ mode }) => {
  // `bun run og:build` builds with this mode so the card routes exist only in
  // that throwaway build, never in the release output.
  const socialCapture = mode === "social";

  // `bun run spike:2` and `spike:5` build with this mode so the fixture routes
  // they exercise exist only in that throwaway build.
  const spikeBuild = mode === "spike";

  return {
    plugins: [
      markdownEndpoints(),
      {
        enforce: "pre",
        ...mdx({
          elementAttributeNameCase: "html",
          jsx: true,
          providerImportSource: "@/site/src/mdx-provider",
          stylePropertyNameCase: "css",
          rehypePlugins: [rehypeSlug, [rehypeShiki, codeHighlightOptions]],
          remarkPlugins: [
            remarkFrontmatter,
            remarkMdxFrontmatter,
            remarkGfm,
            remarkInstallCommand,
            remarkComponentSource,
            [remarkToc, { heading: "Contents", maxDepth: 3 }],
          ],
        }),
      },
      solid({
        extensions: [".jsx", ".tsx", ".mdx"],
        ssr: true,
        start: true,
      }),
      fileRoutes({
        codeSplitting: true,
        toPath: (routeFile) =>
          (routeFile.startsWith("/social-preview") && !socialCapture) ||
          (routeFile.startsWith("/spikes") && !spikeBuild)
            ? undefined
            : routePathFromFile(routeFile),
      }),
      tailwindcss(),
      !socialCapture &&
        prerender({
          mode: "static",
          pages: ["/", { filename: "404.html", path: "/404" }],
        }),
    ],
    resolve: {
      alias: {
        "@kobalte/core/dropdown-menu": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/dropdown-menu/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/primitives/create-dom-collection": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/primitives/create-dom-collection/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/context-menu": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/context-menu/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/select": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/select/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/popover": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/popover/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/slider": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/slider/index.jsx",
            import.meta.url
          )
        ),
        "@kobalte/core/tooltip": fileURLToPath(
          new URL(
            "../node_modules/@kobalte/core-solid2/dist/tooltip/index.jsx",
            import.meta.url
          )
        ),
        "@": fileURLToPath(new URL("..", import.meta.url)),
      },
      dedupe: ["solid-js", "@solidjs/web"],
    },
    // Externalized Kobalte primitives resolve the root workspace's Solid 1.
    // Keep their imports in Vite so site dedupe selects Solid 2 during SSR.
    ssr: { noExternal: [/^@solid-primitives\//] },
    build: {
      // Match upstream's color lowering so low-chroma neutral tokens do not
      // contribute a hue to OKLCH pad accent mixes.
      cssMinify: "lightningcss",
      cssTarget: "safari15",
      sourcemap: true,
    },
  };
});
