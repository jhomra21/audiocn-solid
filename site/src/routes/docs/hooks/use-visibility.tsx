import { DocsShell } from "@/site/components/docs/docs-shell";
import UseVisibilityDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-visibility.mdx";

export default function UseVisibilityPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-visibility"
      frontmatter={frontmatter}
    >
      <UseVisibilityDoc />
    </DocsShell>
  );
}
