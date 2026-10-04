import { Meta, Title } from "@solidjs/meta";

import VolumeControlDoc, { frontmatter } from "@/site/content/docs/components/volume-control.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function VolumeControlPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/volume-control"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <VolumeControlDoc />
      </DocsShell>
    </>
  );
}
