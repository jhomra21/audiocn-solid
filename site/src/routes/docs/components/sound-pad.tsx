import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/sound-pad.mdx";

export default function SoundPadPage() {
  return (
    <DocsShell
      currentPath="/docs/components/sound-pad"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
