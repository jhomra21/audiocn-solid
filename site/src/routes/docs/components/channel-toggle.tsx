import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import ChannelToggleDoc, {
  frontmatter,
} from "@/site/content/docs/components/channel-toggle.mdx";

export default function ChannelTogglePage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/channel-toggle"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ChannelToggleDoc />
      </DocsShell>
    </>
  );
}
