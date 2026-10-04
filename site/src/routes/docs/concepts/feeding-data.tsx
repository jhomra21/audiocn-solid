import { Meta, Title } from "@solidjs/meta";

import FeedingDataDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/feeding-data.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function FeedingDataPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/concepts/feeding-data"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <FeedingDataDoc />
      </DocsShell>
    </>
  );
}
