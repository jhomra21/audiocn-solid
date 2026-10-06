import { DocsShell } from "@/site/components/docs/docs-shell";
import VolumeControlDoc, {
  frontmatter,
} from "@/site/content/docs/components/volume-control.mdx";

export default function VolumeControlPage() {
  return (
    <DocsShell
      currentPath="/docs/components/volume-control"
      frontmatter={frontmatter}
    >
      <VolumeControlDoc />
    </DocsShell>
  );
}
