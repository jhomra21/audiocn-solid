import { DocsShell } from "@/site/components/docs/docs-shell";
import Content, {
  frontmatter,
} from "@/site/content/docs/hooks/use-web-audio-mixer.mdx";

export default function UseWebAudioMixerPage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-web-audio-mixer"
      frontmatter={frontmatter}
    >
      <Content />
    </DocsShell>
  );
}
