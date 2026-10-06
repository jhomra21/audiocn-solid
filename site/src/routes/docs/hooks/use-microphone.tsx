import { DocsShell } from "@/site/components/docs/docs-shell";
import UseMicrophoneDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-microphone.mdx";

export default function UseMicrophonePage() {
  return (
    <DocsShell
      currentPath="/docs/hooks/use-microphone"
      frontmatter={frontmatter}
    >
      <UseMicrophoneDoc />
    </DocsShell>
  );
}
