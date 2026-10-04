import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import ChannelStripDoc, {
  frontmatter,
} from "@/site/content/docs/components/channel-strip.mdx";

export default function ChannelStripPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/channel-strip"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ChannelStripDoc />
      </DocsShell>
    </>
  );
}
