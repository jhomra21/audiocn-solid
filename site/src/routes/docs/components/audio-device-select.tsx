import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/components/audio-device-select.mdx";

export default function AudioDeviceSelectPage() {
  return (
    <DocsShell
      currentPath="/docs/components/audio-device-select"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
