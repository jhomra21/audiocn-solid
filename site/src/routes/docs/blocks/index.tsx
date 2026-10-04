import { Meta, Title } from "@solidjs/meta";

import BlocksDoc, {
  frontmatter,
} from "@/site/content/docs/blocks/index.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function BlocksPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/blocks"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <BlocksDoc />
      </DocsShell>
    </>
  );
}
