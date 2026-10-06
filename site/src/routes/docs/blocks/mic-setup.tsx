import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, { frontmatter } from "@/site/content/docs/blocks/mic-setup.mdx";

export default function MicSetupPage() {
  return (
    <DocsShell currentPath="/docs/blocks/mic-setup" frontmatter={frontmatter}>
      <Content />
    </DocsShell>
  );
}
