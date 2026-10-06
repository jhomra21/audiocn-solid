import { DocsShell } from "@/site/components/docs/docs-shell";
import UseReducedMotionDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-reduced-motion.mdx";

export default function UseReducedMotionPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-reduced-motion"
      frontmatter={frontmatter}
    >
      <UseReducedMotionDoc />
    </DocsShell>
  );
}
