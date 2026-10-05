import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseReducedMotionDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-reduced-motion.mdx";

export default function UseReducedMotionPage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-reduced-motion"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseReducedMotionDoc />
      </DocsShell>
    </>
  );
}
