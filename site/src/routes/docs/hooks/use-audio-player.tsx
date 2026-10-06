import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-audio-player.mdx";

export default function UseAudioPlayerPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-audio-player"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
