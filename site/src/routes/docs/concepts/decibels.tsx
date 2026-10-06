import { DocsShell } from "@/site/components/docs/docs-shell";
import DecibelsDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/decibels.mdx";

export default function DecibelsPage() {
  return (
    <DocsShell currentPath="/docs/concepts/decibels" frontmatter={frontmatter}>
      <DecibelsDoc />
    </DocsShell>
  );
}
