import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import AccessibilityDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/accessibility.mdx";

export default function AccessibilityPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/concepts/accessibility"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <AccessibilityDoc />
      </DocsShell>
    </>
  );
}
