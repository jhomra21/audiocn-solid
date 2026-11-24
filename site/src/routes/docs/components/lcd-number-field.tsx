import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/lcd-number-field.mdx";

export default function LcdNumberFieldPage() {
  return (
    <DocsShell
      currentPath="/docs/components/lcd-number-field"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
