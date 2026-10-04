import { Meta, Title } from "@solidjs/meta";

import ComponentsDoc, {
  frontmatter,
} from "@/site/content/docs/components/index.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function ComponentsPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/components"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ComponentsDoc />
      </DocsShell>
    </>
  );
}
