import { Meta, Title } from "@solidjs/meta";

import ParameterSliderDoc, { frontmatter } from "@/site/content/docs/components/parameter-slider.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function ParameterSliderPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/parameter-slider"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ParameterSliderDoc />
      </DocsShell>
    </>
  );
}
