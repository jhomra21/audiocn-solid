import { useParams } from "@solidjs/router";

import { NotFoundPage } from "@/site/components/docs/page-state";

export default function DocsNotFoundRoute() {
  const params = useParams<{ splat: string }>();

  return <NotFoundPage unavailable={`/docs/${params.splat}`} />;
}
