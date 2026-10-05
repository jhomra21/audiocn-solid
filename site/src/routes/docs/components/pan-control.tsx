import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import PanControlDoc, {
  frontmatter,
} from "@/site/content/docs/components/pan-control.mdx";

export default function PanControlPage() {
  return (
    <>
      <Title>{`${frontmatter.title} for Solid - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/pan-control"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <PanControlDoc />
      </DocsShell>
    </>
  );
}
