import { Meta, Title } from "@solidjs/meta";

import IntroductionDoc, {
  frontmatter,
} from "@/site/content/docs/index.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function IntroductionPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <IntroductionDoc />
      </DocsShell>
    </>
  );
}
