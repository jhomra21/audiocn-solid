import { DocsShell } from "@/site/components/docs/docs-shell";
import UseMixerDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-mixer.mdx";

export default function UseMixerPage() {
  return (
    <DocsShell currentPath="/docs/hooks/use-mixer" frontmatter={frontmatter}>
      <UseMixerDoc />
    </DocsShell>
  );
}
