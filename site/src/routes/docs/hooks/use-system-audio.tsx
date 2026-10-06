import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-system-audio.mdx";

export default function UseSystemAudioPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-system-audio"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
