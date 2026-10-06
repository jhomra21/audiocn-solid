import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, { frontmatter } from "@/site/content/docs/hooks/use-sound.mdx";

export default function UseSoundPage() {
  return (
    <DocsShell currentPath="/docs/hooks/use-sound" frontmatter={frontmatter}>
      <Content />
    </DocsShell>
  );
}
