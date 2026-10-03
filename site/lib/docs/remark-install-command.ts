import type { Code, Root } from "mdast";
import type {
  MdxJsxAttribute,
  MdxJsxFlowElement,
} from "mdast-util-mdx-jsx";
import { visit } from "unist-util-visit";

const isNpmCode = (node: Code): boolean => node.lang === "npm";

const toInstallCommand = (node: Code): MdxJsxFlowElement => {
  const command: MdxJsxAttribute = {
    name: "command",
    type: "mdxJsxAttribute",
    value: node.value.trim(),
  };

  return {
    attributes: [command],
    children: [],
    name: "InstallCommand",
    type: "mdxJsxFlowElement",
  };
};

/** Converts upstream ```npm blocks into the docs InstallCommand component. */
export const remarkInstallCommand = () => (tree: Root): void => {
  visit(tree, "code", (node, index, parent) => {
    if (!isNpmCode(node) || index === undefined || !parent) {
      return;
    }

    parent.children[index] = toInstallCommand(node);
  });
};
