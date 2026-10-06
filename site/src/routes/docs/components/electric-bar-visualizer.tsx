import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/electric-bar-visualizer.mdx";

export default function ElectricBarVisualizerPage() {
  return (
    <DocsShell
      currentPath="/docs/components/electric-bar-visualizer"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
