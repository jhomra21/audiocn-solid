import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/blocks/quick-audio-popover.mdx";

export default function QuickAudioPopoverPage() {
  return (
    <DocsShell
      currentPath="/docs/blocks/quick-audio-popover"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
