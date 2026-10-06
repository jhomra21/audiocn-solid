import { DocsShell } from "@/site/components/docs/docs-shell";
import BlocksDoc, { frontmatter } from "@/site/content/docs/blocks/index.mdx";

export default function BlocksPage() {
  return (
    <DocsShell currentPath="/docs/blocks" frontmatter={frontmatter}>
      <BlocksDoc />
    </DocsShell>
  );
}
