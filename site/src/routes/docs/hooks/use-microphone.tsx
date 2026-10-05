import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseMicrophoneDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-microphone.mdx";

export default function UseMicrophonePage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-microphone"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseMicrophoneDoc />
      </DocsShell>
    </>
  );
}
