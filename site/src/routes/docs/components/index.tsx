import { DocsShell } from "@/site/components/docs/docs-shell";
import ComponentsDoc, {
  frontmatter,
} from "@/site/content/docs/components/index.mdx";

export default function ComponentsPage() {
  return (
    <DocsShell currentPath="/docs/components" frontmatter={frontmatter}>
      <ComponentsDoc />
    </DocsShell>
  );
}
