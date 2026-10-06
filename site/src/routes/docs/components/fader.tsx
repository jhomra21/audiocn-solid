import { DocsShell } from "@/site/components/docs/docs-shell";
import FaderDoc, {
  frontmatter,
} from "@/site/content/docs/components/fader.mdx";

export default function FaderPage() {
  return (
    <DocsShell currentPath="/docs/components/fader" frontmatter={frontmatter}>
      <FaderDoc />
    </DocsShell>
  );
}
