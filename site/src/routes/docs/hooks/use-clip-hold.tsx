import { DocsShell } from "@/site/components/docs/docs-shell";
import UseClipHoldDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-clip-hold.mdx";

export default function UseClipHoldPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-clip-hold"
      frontmatter={frontmatter}
    >
      <UseClipHoldDoc />
    </DocsShell>
  );
}
