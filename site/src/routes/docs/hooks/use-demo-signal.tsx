import { Meta, Title } from "@solidjs/meta";

import UseDemoSignalDoc, { frontmatter } from "@/site/content/docs/hooks/use-demo-signal.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function UseDemoSignalPage() {
  return (
    <>
      <Title>`${frontmatter.title} - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-demo-signal"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseDemoSignalDoc />
      </DocsShell>
    </>
  );
}
