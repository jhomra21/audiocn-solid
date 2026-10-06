import { DocsShell } from "@/site/components/docs/docs-shell";
import UseFrameSourceDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-frame-source.mdx";

export default function UseFrameSourcePage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-frame-source"
      frontmatter={frontmatter}
    >
      <UseFrameSourceDoc />
    </DocsShell>
  );
}
