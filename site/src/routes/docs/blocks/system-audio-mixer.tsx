import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/blocks/system-audio-mixer.mdx";

export default function SystemAudioMixerPage() {
  return (
    <DocsShell
      full
      currentPath="/docs/blocks/system-audio-mixer"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
