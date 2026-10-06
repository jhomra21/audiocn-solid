import { DocsShell } from "@/site/components/docs/docs-shell";
import UseDemoSignalDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-demo-signal.mdx";

export default function UseDemoSignalPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-demo-signal"
      frontmatter={frontmatter}
    >
      <UseDemoSignalDoc />
    </DocsShell>
  );
}
