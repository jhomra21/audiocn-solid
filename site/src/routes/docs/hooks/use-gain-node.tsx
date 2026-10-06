import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-gain-node.mdx";

export default function UseGainNodePage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-gain-node"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
