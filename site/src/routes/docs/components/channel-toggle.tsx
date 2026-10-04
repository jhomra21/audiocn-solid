import { Meta, Title } from "@solidjs/meta";

import ChannelToggleDoc, { frontmatter } from "@/site/content/docs/components/channel-toggle.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function ChannelTogglePage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
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
