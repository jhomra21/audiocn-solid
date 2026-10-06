import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/live-waveform.mdx";

export default function LiveWaveformPage() {
  return (
    <DocsShell
      currentPath="/docs/components/live-waveform"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
