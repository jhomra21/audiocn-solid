import { Meta, Title } from "@solidjs/meta";

import AccessibilityDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/accessibility.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

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
