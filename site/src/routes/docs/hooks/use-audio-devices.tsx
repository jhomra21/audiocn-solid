import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-audio-devices.mdx";

export default function UseAudioDevicesPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-audio-devices"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
