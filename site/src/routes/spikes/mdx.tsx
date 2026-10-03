import { Meta, Title } from "@solidjs/meta";

import FixtureDoc, {
  frontmatter,
} from "@/site/content/spikes/mdx-components.mdx";

export default function MdxSpikePage() {
  return (
    <>
      <Title>{frontmatter.title} - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <main class="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-6 py-16">
        <h1 class="font-heading text-4xl font-semibold">{frontmatter.title}</h1>
        <article data-spike="mdx">
          <FixtureDoc />
        </article>
      </main>
    </>
  );
}
