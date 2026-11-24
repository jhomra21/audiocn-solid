import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/lcd-vumeter.mdx";

export default function LcdVuMeterPage() {
  return (
    <DocsShell
      currentPath="/docs/components/lcd-vumeter"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
