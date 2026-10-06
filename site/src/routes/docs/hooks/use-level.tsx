import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, { frontmatter } from "@/site/content/docs/hooks/use-level.mdx";

export default function UseLevelPage() {
  return (
    <DocsShell currentPath="/docs/hooks/use-level" frontmatter={frontmatter}>
      <Content />
    </DocsShell>
  );
}
