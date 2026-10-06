import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/audio-player.mdx";

export default function AudioPlayerPage() {
  return (
    <DocsShell
      currentPath="/docs/components/audio-player"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
