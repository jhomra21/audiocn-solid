import { Meta, Title } from "@solidjs/meta";

import InstallationDoc, {
  frontmatter,
} from "@/site/content/docs/installation.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function InstallationPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/installation"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <InstallationDoc />
      </DocsShell>
    </>
  );
}
