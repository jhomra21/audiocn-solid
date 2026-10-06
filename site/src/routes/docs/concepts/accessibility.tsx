import { DocsShell } from "@/site/components/docs/docs-shell";
import AccessibilityDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/accessibility.mdx";

export default function AccessibilityPage() {
  return (
    <DocsShell
      currentPath="/docs/concepts/accessibility"
      frontmatter={frontmatter}
    >
      <AccessibilityDoc />
    </DocsShell>
  );
}
