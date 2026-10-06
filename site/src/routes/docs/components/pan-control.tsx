import { DocsShell } from "@/site/components/docs/docs-shell";
import PanControlDoc, {
  frontmatter,
} from "@/site/content/docs/components/pan-control.mdx";

export default function PanControlPage() {
  return (
    <DocsShell
      currentPath="/docs/components/pan-control"
      frontmatter={frontmatter}
    >
      <PanControlDoc />
    </DocsShell>
  );
}
