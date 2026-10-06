import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/waveform.mdx";

export default function WaveformPage() {
  return (
    <DocsShell
      currentPath="/docs/components/waveform"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
