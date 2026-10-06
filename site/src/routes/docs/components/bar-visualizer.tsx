import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/bar-visualizer.mdx";

export default function BarVisualizerPage() {
  return (
    <DocsShell
      currentPath="/docs/components/bar-visualizer"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
