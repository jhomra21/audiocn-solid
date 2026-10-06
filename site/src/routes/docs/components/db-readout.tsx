import { DocsShell } from "@/site/components/docs/docs-shell";
import DbReadoutDoc, {
  frontmatter,
} from "@/site/content/docs/components/db-readout.mdx";

export default function DbReadoutPage() {
  return (
    <DocsShell
      currentPath="/docs/components/db-readout"
      frontmatter={frontmatter}
    >
      <DbReadoutDoc />
    </DocsShell>
  );
}
