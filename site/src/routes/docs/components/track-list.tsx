import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/track-list.mdx";

export default function TrackListPage() {
  return (
    <DocsShell
      currentPath="/docs/components/track-list"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
