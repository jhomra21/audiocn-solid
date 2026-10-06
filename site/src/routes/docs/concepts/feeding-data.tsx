import { DocsShell } from "@/site/components/docs/docs-shell";
import FeedingDataDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/feeding-data.mdx";

export default function FeedingDataPage() {
  return (
    <DocsShell
      currentPath="/docs/concepts/feeding-data"
      frontmatter={frontmatter}
    >
      <FeedingDataDoc />
    </DocsShell>
  );
}
