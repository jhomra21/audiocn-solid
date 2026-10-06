import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildAiPrompt, buildPageMarkdown } from "./ai-prompt";
import { renderDocsMarkdown } from "./markdown-components";
import metadata from "./page-metadata.json" with { type: "json" };
import { registryItemForPath, resolveInstall } from "./registry";

const docsRoot = resolve(import.meta.dirname, "../../content/docs");

/** Shared live-MDX renderer for development requests and static build output. */
export const renderPageMarkdown = async (page: (typeof metadata)[number]) => {
  const slug = page.url.slice("/docs".length) || "/index";

  const path = ["/components", "/blocks"].includes(slug)
    ? `${slug}/index`
    : slug;

  const source = await readFile(join(docsRoot, `${path}.mdx`), "utf8");
  const body = await renderDocsMarkdown(source);
  const common = { ...page, pathname: page.url, body };
  const item = registryItemForPath(page.url);

  const markdown = item
    ? buildAiPrompt({
        ...common,
        install: resolveInstall(item, "solid1"),
        alternateInstall: resolveInstall(item, "solid2"),
      })
    : buildPageMarkdown(common);

  return { body, markdown };
};
