import { DocsShell } from "@/site/components/docs/docs-shell";
import ChannelToggleDoc, {
  frontmatter,
} from "@/site/content/docs/components/channel-toggle.mdx";

export default function ChannelTogglePage() {
  return (
    <DocsShell
      currentPath="/docs/components/channel-toggle"
      frontmatter={frontmatter}
    >
      <ChannelToggleDoc />
    </DocsShell>
  );
}
