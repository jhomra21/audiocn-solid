import { Meta, Title } from "@solidjs/meta";

import { DocsShell } from "@/site/components/docs/docs-shell";
import UseAudioContextDoc, {
  frontmatter,
} from "@/site/content/docs/hooks/use-audio-context.mdx";

export default function UseAudioContextPage() {
  return (
    <>
      <Title>{`${frontmatter.title} - audiocn Solid`}</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-audio-context"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseAudioContextDoc />
      </DocsShell>
    </>
  );
}
