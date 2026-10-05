import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/audio-player.mdx";

export default function AudioPlayerPage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/audio-player"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <Content />
      </DocsShell>
    </>
  );
}
