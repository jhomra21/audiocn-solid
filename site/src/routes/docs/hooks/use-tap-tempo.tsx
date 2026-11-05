import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-tap-tempo.mdx";

export default function UseTapTempoPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-tap-tempo"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
