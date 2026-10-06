import type { SearchDocument } from "./search-schema";

export interface SearchSection {
  id: string;
  title: string;
  url: string;
}

/** Markdown headings, not code-fence contents, supply the page's result groups. */
export const searchSections = (
  document: SearchDocument,
  query: string
): SearchSection[] => {
  const words = query.toLowerCase().split(/\s+/u).filter(Boolean);
  const sections: { title: string; anchor: string; text: string }[] = [];
  const slugs = new Map<string, number>();
  let marker = "";

  for (const line of document.content.split("\n")) {
    const fence = /^(`{3,}|~{3,})/u.exec(line)?.[0];

    if (marker) {
      if (line.startsWith(marker)) marker = "";
      continue;
    }

    if (fence) {
      marker = fence;
      continue;
    }

    const title = /^#{2,6}\s+(.+)$/u.exec(line)?.[1];

    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^\w -]/gu, "")
        .replaceAll(" ", "-");

      const count = slugs.get(slug) ?? 0;
      slugs.set(slug, count + 1);
      sections.push({
        title,
        anchor: count ? `${slug}-${count}` : slug,
        text: title,
      });
    } else {
      const section = sections.at(-1);

      if (section) section.text += ` ${line}`;
    }
  }

  return sections.flatMap((section) =>
    words.every((word) => section.text.toLowerCase().includes(word))
      ? [
          {
            id: `${document.id}#${section.anchor}`,
            title: section.title,
            url: `${document.url}#${section.anchor}`,
          },
        ]
      : []
  );
};
