import { DocsShell } from "@/site/components/docs/docs-shell";
import LevelMeterDoc, {
  frontmatter,
} from "@/site/content/docs/components/level-meter.mdx";

export default function LevelMeterPage() {
  return (
    <DocsShell
      currentPath="/docs/components/level-meter"
      frontmatter={frontmatter}
    >
      <LevelMeterDoc />
    </DocsShell>
  );
}
