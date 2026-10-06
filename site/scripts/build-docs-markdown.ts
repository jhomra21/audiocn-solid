import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { renderPageMarkdown } from "../lib/docs/page-markdown";
import metadata from "../lib/docs/page-metadata.json";
import { siteConfig } from "../lib/site";

const siteRoot = resolve(import.meta.dirname, "..");

export const buildDocsMarkdown = async (output: string) => {
  const pages = await Promise.all(
    metadata.map(async (page) => {
      const { body, markdown } = await renderPageMarkdown(page);

      const markdownFile = join(output, `${page.url}.md`);

      const endpoint = join(
        output,
        "llms.mdx",
        page.url.slice("/docs".length),
        "index.html"
      );

      await mkdir(dirname(markdownFile), { recursive: true });
      await mkdir(dirname(endpoint), { recursive: true });
      await Promise.all([
        writeFile(markdownFile, markdown),
        writeFile(endpoint, markdown),
      ]);

      return { ...page, body };
    })
  );

  const llms = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.description}`,
    "",
    `Install components with the shadcn CLI after adding "${siteConfig.registryNamespace}": "${siteConfig.url}/r/solid2/{name}.json" to the registries in components.json. For Solid 1, use "${siteConfig.url}/r/solid1/{name}.json".`,
    "",
    "Append `.md` to any page below for a Markdown version with install steps, usage and the full API, written for AI agents.",
    "",
    "## Docs",
    "",
    ...pages.map(
      (page) =>
        `- [${page.title}](${siteConfig.url}${page.url}): ${page.description}`
    ),
    "",
  ].join("\n");

  await Promise.all([
    writeFile(join(output, "llms.txt"), llms),
    writeFile(
      join(output, "llms-full.txt"),
      pages
        .map((page) => `# ${page.title} (${page.url})\n\n${page.body}`)
        .join("\n\n")
    ),
    writeFile(
      join(output, "_headers"),
      "/docs.md\n  Content-Type: text/markdown; charset=utf-8\n/docs/*.md\n  Content-Type: text/markdown; charset=utf-8\n/llms.mdx\n  Content-Type: text/markdown; charset=utf-8\n/llms.mdx/*\n  Content-Type: text/markdown; charset=utf-8\n"
    ),
  ]);

  return pages.length;
};

if (import.meta.main) {
  const output = process.argv[2] ?? join(siteRoot, "dist/client");
  console.log(
    `Built Markdown endpoints for ${await buildDocsMarkdown(output)} docs pages.`
  );
}
