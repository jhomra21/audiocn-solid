import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, { frontmatter } from "@/site/content/docs/hooks/use-sound.mdx";

export default function UseSoundPage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-sound"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <Content />
      </DocsShell>
    </>
  );
}
