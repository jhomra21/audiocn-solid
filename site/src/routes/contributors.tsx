import { Meta, Title } from "@solidjs/meta";

import { NotYetPorted } from "@/site/components/home/not-yet-ported";

export default function ContributorsPage() {
  return (
    <>
      <Title>Contributors - audiocn Solid</Title>
      <Meta
        content="People who have contributed to audiocn."
        name="description"
      />
      <main class="mx-auto grid min-h-svh w-full max-w-3xl content-center gap-4 px-6">
        <h1 class="font-heading text-4xl font-semibold">Contributors</h1>
        <NotYetPorted item="Contributors" />
        <a
          class="text-primary underline underline-offset-4"
          href="https://www.audiocn.dev/contributors"
          rel="noopener noreferrer"
          target="_blank"
        >
          View upstream contributors
        </a>
      </main>
    </>
  );
}
