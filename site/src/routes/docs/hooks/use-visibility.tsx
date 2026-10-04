import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseVisibilityDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-visibility.mdx";

export default function UseVisibilityPage() {
  return (
    <>
      <Title>`${frontmatter.title} - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-visibility"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseVisibilityDoc />
      </DocsShell>
    </>
  );
}
