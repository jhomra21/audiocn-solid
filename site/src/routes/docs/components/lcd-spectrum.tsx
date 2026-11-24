import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/lcd-spectrum.mdx";

export default function LcdSpectrumPage() {
  return (
    <DocsShell
      currentPath="/docs/components/lcd-spectrum"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
