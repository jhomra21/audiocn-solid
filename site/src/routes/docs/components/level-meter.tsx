import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import LevelMeterDoc, {
  frontmatter,
} from "@/site/content/docs/components/level-meter.mdx";

export default function LevelMeterPage() {
  return (
    <>
      <Title>{frontmatter.title} for Solid - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/components/level-meter"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <LevelMeterDoc />
      </DocsShell>
    </>
  );
}
