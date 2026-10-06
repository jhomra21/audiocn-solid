import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/electric-waveform.mdx";

export default function ElectricWaveformPage() {
  return (
    <DocsShell
      currentPath="/docs/components/electric-waveform"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
