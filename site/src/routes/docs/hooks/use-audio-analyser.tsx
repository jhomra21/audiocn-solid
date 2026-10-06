import { DocsShell } from "@/site/components/docs/docs-shell";
import UseAudioAnalyserDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-audio-analyser.mdx";

export default function UseAudioAnalyserPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-audio-analyser"
      frontmatter={frontmatter}
    >
      <UseAudioAnalyserDoc />
    </DocsShell>
  );
}
