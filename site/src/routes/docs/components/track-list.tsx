import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/track-list.mdx";

export default function TrackListPage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/track-list"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <Content />
      </DocsShell>
    </>
  );
}
