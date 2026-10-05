import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseClipHoldDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-clip-hold.mdx";

export default function UseClipHoldPage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-clip-hold"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseClipHoldDoc />
      </DocsShell>
    </>
  );
}
