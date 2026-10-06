import { DocsShell } from "@/site/components/docs/docs-shell";
import MixerDoc, {
  frontmatter,
} from "@/site/content/docs/components/mixer.mdx";

export default function MixerPage() {
  return (
    <DocsShell currentPath="/docs/components/mixer" frontmatter={frontmatter}>
      <MixerDoc />
    </DocsShell>
  );
}
