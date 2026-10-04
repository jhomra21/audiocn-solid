import { Meta, Title } from "@solidjs/meta";

import UseAudioAnalyserDoc, { frontmatter } from "@/site/content/docs/hooks/use-audio-analyser.mdx";
import { DocsShell } from "@/site/components/docs/docs-shell";

export default function UseAudioAnalyserPage() {
  return (
    <>
      <Title>`${frontmatter.title} - audiocn Solid`</Title>
      <Meta content={frontmatter.description} name="description" />
      <DocsShell
        currentPath="/docs/hooks/use-audio-analyser"
        description={frontmatter.description}
        title={frontmatter.title}
      >
        <UseAudioAnalyserDoc />
      </DocsShell>
    </>
  );
}
