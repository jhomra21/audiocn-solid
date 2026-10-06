import { DocsShell } from "@/site/components/docs/docs-shell";
import ClipIndicatorDoc, {
  frontmatter,
} from "@/site/content/docs/components/clip-indicator.mdx";

export default function ClipIndicatorPage() {
  return (
    <DocsShell
      currentPath="/docs/components/clip-indicator"
      frontmatter={frontmatter}
    >
      <ClipIndicatorDoc />
    </DocsShell>
  );
}
