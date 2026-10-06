import { DocsShell } from "@/site/components/docs/docs-shell";
import UseAudioContextDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-audio-context.mdx";

export default function UseAudioContextPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-audio-context"
      frontmatter={frontmatter}
    >
      <UseAudioContextDoc />
    </DocsShell>
  );
}
