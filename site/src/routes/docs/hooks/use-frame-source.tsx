import { Meta, Title } from "@solidjs/meta";

import UseFrameSourceDoc, { frontmatter } from "@/site/content/docs/hooks/use-frame-source.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function UseFrameSourcePage() {
  return (
    <>
      <Title>`${frontmatter.title} - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-frame-source"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseFrameSourceDoc />
      </DocsShell>
    </>
  );
}
