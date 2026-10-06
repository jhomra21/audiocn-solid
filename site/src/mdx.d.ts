declare module "*.mdx" {
  import type { Component } from "solid-js";

  import type { DocsFrontmatter } from "@/site/components/docs/docs-shell";

  export const frontmatter: DocsFrontmatter;

  const MDXContent: Component;

  export default MDXContent;
}
