import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseMixerDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-mixer.mdx";

export default function UseMixerPage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-mixer"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseMixerDoc />
      </DocsShell>
    </>
  );
}
