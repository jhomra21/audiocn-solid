import { Meta, Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { NotFoundPage } from "@/site/components/docs/page-state";
import { SocialCard } from "@/site/components/social/social-card";
import metadata from "@/site/lib/docs/page-metadata.json";
import { getSocialCards } from "@/site/lib/social-catalog";

const cards = getSocialCards(metadata);

/** Capture surface for `bun run og:build`; the route only exists in `--mode social` builds. */
export default function SocialPreviewRoute() {
  const params = useParams<{ id: string }>();
  const card = () => cards.find((item) => item.id === params.id);

  return (
    <Show fallback={<NotFoundPage />} when={card()}>
      {(found) => (
        <>
          <Title>Social image capture</Title>
          <Meta content="noindex, nofollow" name="robots" />
          <SocialCard card={found()} />
        </>
      )}
    </Show>
  );
}
