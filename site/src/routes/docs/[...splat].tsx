import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";

export default function DocsNotFoundPage() {
  const params = useParams<{ splat: string }>();

  return (
    <>
      <Title>Not found - audiocn Solid</Title>
      <main class="p-8" data-docs-route-unavailable={`/docs/${params.splat}`}>
        This documentation page was not found.
      </main>
    </>
  );
}
