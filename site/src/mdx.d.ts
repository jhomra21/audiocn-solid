declare module "*.mdx" {
  import type { Component } from "solid-js";

  export const frontmatter: {
    description: string;
    title: string;
  };

  const MDXContent: Component;

  export default MDXContent;
}
