import { Meta, Title } from "@solidjs/meta";

import LevelMeterDoc, {
  frontmatter,
} from "@/site/content/docs/components/level-meter.mdx";

export default function LevelMeterPage() {
  return (
    <>
      <Title>{frontmatter.title} for Solid - audiocn Solid</Title>
      <Meta content={frontmatter.description} name="description" />

      <main class="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-6 py-16">
        <header class="grid gap-3">
          <a
            class="text-muted-foreground w-fit text-sm underline underline-offset-4"
            href="/"
          >
            audiocn Solid
          </a>
          <h1 class="font-heading text-4xl font-semibold">
            {frontmatter.title} for Solid
          </h1>
          <p class="text-muted-foreground max-w-2xl text-sm">
            {frontmatter.description}
          </p>
        </header>

        <article class="prose max-w-none">
          <LevelMeterDoc />
        </article>
      </main>
    </>
  );
}
