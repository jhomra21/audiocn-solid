import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import CustomEngineDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/custom-engine.mdx";

export default function CustomEnginePage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/concepts/custom-engine"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <CustomEngineDoc />
      </DocsShell>
    </>
  );
}
