import { Meta, Title } from "@solidjs/meta";

import { LevelMeterDemo } from "@/components/examples/level-meter-demo";

const description =
  "Solid audio components with matching Solid 1 and Solid 2 registry builds.";

export default function Home() {
  return (
    <>
      <Title>audiocn Solid</Title>
      <Meta content={description} name="description" />

      <main class="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-6 py-16">
        <header class="grid gap-3">
          <p class="text-muted-foreground font-mono text-xs">Solid 2 site spike</p>
          <h1 class="font-heading text-4xl font-semibold">audiocn Solid</h1>
          <p class="text-muted-foreground max-w-2xl text-sm">{description}</p>
          <a
            class="text-primary w-fit text-sm underline underline-offset-4"
            href="/docs/components/level-meter"
          >
            LevelMeter docs
          </a>
        </header>

        <section class="rounded-xl border p-6">
          <LevelMeterDemo />
        </section>
      </main>
    </>
  );
}
