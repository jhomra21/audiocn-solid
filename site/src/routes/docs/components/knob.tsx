import { DocsShell } from "@/site/components/docs/docs-shell";
import KnobDoc, { frontmatter } from "@/site/content/docs/components/knob.mdx";

export default function KnobPage() {
  return (
    <DocsShell currentPath="/docs/components/knob" frontmatter={frontmatter}>
      <KnobDoc />
    </DocsShell>
  );
}
