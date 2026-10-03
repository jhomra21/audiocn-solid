import { Meta, Title } from "@solidjs/meta";

import { LevelMeterDemo } from "@/components/examples/level-meter-demo";

const description =
  "LevelMeter for Solid with live peak, RMS, hold, scale, and clip indication.";

export default function LevelMeterPage() {
  return (
    <>
      <Title>LevelMeter for Solid - audiocn Solid</Title>
      <Meta content={description} name="description" />

      <main class="mx-auto grid min-h-screen w-full max-w-5xl gap-8 px-6 py-16">
        <header class="grid gap-3">
          <a
            class="text-muted-foreground w-fit text-sm underline underline-offset-4"
            href="/"
          >
            audiocn Solid
          </a>
          <h1 class="font-heading text-4xl font-semibold">LevelMeter for Solid</h1>
          <p class="text-muted-foreground max-w-2xl text-sm">{description}</p>
        </header>

        <section class="rounded-xl border p-6">
          <LevelMeterDemo />
        </section>
      </main>
    </>
  );
}
