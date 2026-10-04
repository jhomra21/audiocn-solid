import { Meta, Title } from "@solidjs/meta";

import KnobDoc, { frontmatter } from "@/site/content/docs/components/knob.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function KnobPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/knob"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <KnobDoc />
      </DocsShell>
    </>
  );
}
