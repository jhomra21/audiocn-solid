import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/lcd-meter.mdx";

export default function LcdMeterPage() {
  return (
    <DocsShell
      currentPath="/docs/components/lcd-meter"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
