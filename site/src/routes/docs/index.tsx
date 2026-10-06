import { DocsShell } from "@/site/components/docs/docs-shell";
import IntroductionDoc, { frontmatter } from "@/site/content/docs/index.mdx";

export default function IntroductionPage() {
  return (
    <DocsShell currentPath="/docs" frontmatter={frontmatter}>
      <IntroductionDoc />
    </DocsShell>
  );
}
