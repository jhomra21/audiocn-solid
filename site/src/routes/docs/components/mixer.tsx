import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import MixerDoc, {
  frontmatter,
} from "@/site/content/docs/components/mixer.mdx";

export default function MixerPage() {
  return (
    <>
      <Title>`${frontmatter.title} for Solid - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/components/mixer"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <MixerDoc />
      </DocsShell>
    </>
  );
}
