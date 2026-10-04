import { Meta, Title } from "@solidjs/meta";

import FaderDoc, { frontmatter } from "@/site/content/docs/components/fader.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function FaderPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/fader"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <FaderDoc />
      </DocsShell>
    </>
  );
}
