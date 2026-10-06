import { DocsShell } from "@/site/components/docs/docs-shell";
import InstallationDoc, {
  frontmatter,
} from "@/site/content/docs/installation.mdx";

export default function InstallationPage() {
  return (
    <DocsShell currentPath="/docs/installation" frontmatter={frontmatter}>
      <InstallationDoc />
    </DocsShell>
  );
}
