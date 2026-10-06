import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-waveform-data.mdx";

export default function UseWaveformDataPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-waveform-data"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
