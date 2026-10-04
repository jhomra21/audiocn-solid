import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type { Code, Root } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const TRAILING_NEWLINES = /\n+$/u;

const isLiteralAttribute = (value: MdxJsxAttribute["value"]): value is string =>
  typeof value === "string";

const attribute = (node: MdxJsxFlowElement, name: string) => {
  const match = node.attributes.find(
    (entry) => entry.type === "mdxJsxAttribute" && entry.name === name
  );

  return isLiteralAttribute(match?.value) ? match.value : undefined;
};

const sourceFor = (node: MdxJsxFlowElement) => {
  if (node.name === "ComponentPreview") {
    const name = attribute(node, "name");

    return name ? { path: `components/examples/${name}.tsx` } : undefined;
  }

  if (node.name === "ComponentSource") {
    const path = attribute(node, "path");

    return path ? { path, title: attribute(node, "title") ?? path } : undefined;
  }

  return undefined;
};

/**
 * Gives ComponentPreview and ComponentSource their source file as a code
 * child, so it is highlighted at build time like upstream's ServerCodeBlock.
 */
export const remarkComponentSource =
  () =>
  (tree: Root): void => {
    visit(tree, "mdxJsxFlowElement", (node) => {
      const source = sourceFor(node);

      if (!source) {
        return;
      }

      const file = `${repositoryRoot}${source.path}`;

      if (!existsSync(file)) {
        return;
      }

      const code: Code = {
        lang: source.path.endsWith(".css") ? "css" : "tsx",
        meta: source.title ? `title="${source.title}"` : undefined,
        type: "code",
        value: readFileSync(file, "utf8").replace(TRAILING_NEWLINES, ""),
      };

      node.children = [code];
    });
  };
