import { Meta, Title } from "@solidjs/meta";

import ThemingDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/theming.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function ThemingPage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <DocsShell
        currentPath="/docs/concepts/theming"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <ThemingDoc />
      </DocsShell>
    </>
  );
}
