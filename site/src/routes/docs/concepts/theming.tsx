import { DocsShell } from "@/site/components/docs/docs-shell";
import ThemingDoc, {
  frontmatter,
} from "@/site/content/docs/concepts/theming.mdx";

export default function ThemingPage() {
  return (
    <DocsShell currentPath="/docs/concepts/theming" frontmatter={frontmatter}>
      <ThemingDoc />
    </DocsShell>
  );
}
