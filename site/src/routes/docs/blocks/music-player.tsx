import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/blocks/music-player.mdx";

export default function MusicPlayerPage() {
  return (
    <DocsShell
      currentPath="/docs/blocks/music-player"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
