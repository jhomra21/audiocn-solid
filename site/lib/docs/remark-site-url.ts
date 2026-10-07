import type { Root } from "mdast";
import { visit } from "unist-util-visit";

import { siteConfig } from "../site.ts";

const DOMAIN_MARKER = "https://<domain>";

const replaceDomain = (value: string) =>
  value.replaceAll(DOMAIN_MARKER, siteConfig.url);

/** Replaces the deployment marker in prose and code with the current site origin. */
export const remarkSiteUrl =
  () =>
  (tree: Root): void => {
    visit(tree, "text", (node) => {
      node.value = replaceDomain(node.value);
    });

    visit(tree, "inlineCode", (node) => {
      node.value = replaceDomain(node.value);
    });

    visit(tree, "code", (node) => {
      node.value = replaceDomain(node.value);
    });

    visit(tree, "link", (node) => {
      node.url = replaceDomain(node.url);
    });
  };
