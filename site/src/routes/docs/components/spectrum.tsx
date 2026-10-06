import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/spectrum.mdx";

export default function SpectrumPage() {
  return (
    <DocsShell
      currentPath="/docs/components/spectrum"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
