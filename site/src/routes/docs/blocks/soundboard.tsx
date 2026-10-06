import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/blocks/soundboard.mdx";

export default function SoundboardPage() {
  return (
    <DocsShell currentPath="/docs/blocks/soundboard" frontmatter={frontmatter}>
      <Content />
    </DocsShell>
  );
}
