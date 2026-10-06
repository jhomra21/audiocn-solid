import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/smooth-waveform.mdx";

export default function SmoothWaveformPage() {
  return (
    <DocsShell
      currentPath="/docs/components/smooth-waveform"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
