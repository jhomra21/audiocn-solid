import { DocsShell } from "@/site/components/docs/docs-shell";
import DbScaleDoc, {
  frontmatter,
} from "@/site/content/docs/components/db-scale.mdx";

export default function DbScalePage() {
  return (
    <DocsShell
      currentPath="/docs/components/db-scale"
      frontmatter={frontmatter}
    >
      <DbScaleDoc />
    </DocsShell>
  );
}
