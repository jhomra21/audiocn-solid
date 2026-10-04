import { Meta, Title } from "@solidjs/meta";

import DecibelsDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/decibels.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function DecibelsPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/concepts/decibels"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <DecibelsDoc />
      </DocsShell>
    </>
  );
}
