import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/blocks/system-audio-settings.mdx";

export default function SystemAudioSettingsPage() {
  return (
    <DocsShell
      currentPath="/docs/blocks/system-audio-settings"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
