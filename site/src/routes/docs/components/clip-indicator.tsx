import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import ClipIndicatorDoc, {
  frontmatter,
} from "@/site/content/docs/components/clip-indicator.mdx";

export default function ClipIndicatorPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/clip-indicator"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ClipIndicatorDoc />
      </DocsShell>
    </>
  );
}
