import { DocsShell } from "@/site/components/docs/docs-shell";
import ChannelStripDoc, {
  frontmatter,
} from "@/site/content/docs/components/channel-strip.mdx";

export default function ChannelStripPage() {
  return (
    <DocsShell
      currentPath="/docs/components/channel-strip"
      frontmatter={frontmatter}
    >
      <ChannelStripDoc />
    </DocsShell>
  );
}
