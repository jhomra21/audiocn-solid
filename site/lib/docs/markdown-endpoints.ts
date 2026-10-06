import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";

import type { Plugin } from "vite";

import { renderPageMarkdown } from "./page-markdown";
import metadata from "./page-metadata.json" with { type: "json" };

/** Live Markdown in dev; static MIME parity in preview; deployment uses _headers. */
export const markdownEndpoints = (): Plugin => {
  let root = "";

  const paths = new Map(
    metadata.flatMap((page) => [
      [`${page.url}.md`, page],
      [`/llms.mdx${page.url.slice("/docs".length)}`, page],
    ])
  );

  const middleware =
    (live: boolean) =>
    (
      request: IncomingMessage,
      response: ServerResponse,
      next: (error?: Error) => void
    ) => {
      const path = new URL(request.url ?? "/", "http://localhost").pathname;
      const page = paths.get(path);

      if (!page) return next();

      const document = live
        ? renderPageMarkdown(page).then(({ markdown }) => markdown)
        : readFile(join(root, "dist/client", `${page.url}.md`), "utf8");

      void document.then((body) => {
        response.setHeader("content-type", "text/markdown; charset=utf-8");

        if (live) {
          response.setHeader("cache-control", "no-store");
          response.setHeader("x-audiocn-markdown-source", "live-mdx");
        }

        response.end(request.method === "HEAD" ? undefined : body);
      }, next);
    };

  return {
    name: "docs-markdown-endpoints",
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use(middleware(true));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(false));
    },
  };
};
