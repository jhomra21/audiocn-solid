import { DocsShell } from "@/site/components/docs/docs-shell";
import LcdDisplayDoc, {
  frontmatter,
} from "@/site/content/docs/components/lcd-display.mdx";

export default function LcdDisplayPage() {
  return (
    <DocsShell
      currentPath="/docs/components/lcd-display"
      frontmatter={frontmatter}
    >
      <LcdDisplayDoc />
    </DocsShell>
  );
}
