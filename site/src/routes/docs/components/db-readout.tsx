import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import DbReadoutDoc, {
  frontmatter,
} from "@/site/content/docs/components/db-readout.mdx";

export default function DbReadoutPage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/db-readout"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <DbReadoutDoc />
      </DocsShell>
    </>
  );
}
