import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import DbScaleDoc, {
  frontmatter,
} from "@/site/content/docs/components/db-scale.mdx";

export default function DbScalePage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/db-scale"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <DbScaleDoc />
      </DocsShell>
    </>
  );
}
