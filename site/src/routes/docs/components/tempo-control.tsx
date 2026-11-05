import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/tempo-control.mdx";

export default function TempoControlPage() {
  return (
    <DocsShell
      currentPath="/docs/components/tempo-control"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
