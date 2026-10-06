import { Link, Meta, Title } from "@solidjs/meta";
import { For } from "solid-js";

import { siteConfig } from "@/site/lib/site";
import { getPageMetadata } from "@/site/lib/social-metadata";
import type {
  PageMetadata,
  PageMetadataOptions,
} from "@/site/lib/social-metadata";

const openGraph = (metadata: PageMetadata) =>
  [
    ["og:title", metadata.title],
    ["og:description", metadata.description],
    ["og:url", metadata.canonical],
    ["og:site_name", siteConfig.name],
    ["og:locale", "en_US"],
    ["og:type", "website"],
    ["og:image", metadata.image.url],
    ["og:image:width", String(metadata.image.width)],
    ["og:image:height", String(metadata.image.height)],
    ["og:image:alt", metadata.image.alt],
  ] as const;

const twitter = (metadata: PageMetadata) =>
  [
    ["twitter:card", "summary_large_image"],
    ["twitter:title", metadata.title],
    ["twitter:description", metadata.description],
    ["twitter:image", metadata.image.url],
    ["twitter:image:alt", metadata.image.alt],
  ] as const;

/** Title, description, canonical URL and the social card tags for one page. */
export const PageMeta = (props: PageMetadataOptions) => {
  const metadata = () => getPageMetadata(props);

  return (
    <>
      <Title>{metadata().title}</Title>
      <Meta content={metadata().description} name="description" />
      <Link href={metadata().canonical} rel="canonical" />
      <For each={openGraph(metadata())}>
        {([property, content]) => (
          <Meta content={content} property={property} />
        )}
      </For>
      <For each={twitter(metadata())}>
        {([name, content]) => <Meta content={content} name={name} />}
      </For>
    </>
  );
};
