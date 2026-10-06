import type { DocsNavArea } from "./docs/navigation";

export interface SearchGroupItem {
  title: string;
  url: string;
}

export interface SearchGroup {
  label: string;
  items: SearchGroupItem[];
}

/** Docs sections, in the order the search dialog shows them. */
const SECTIONS = [
  { label: "Getting started", path: "/docs" },
  { label: "Components", path: "/docs/components" },
  { label: "Blocks", path: "/docs/blocks" },
  { label: "Hooks", path: "/docs/hooks" },
  { label: "Concepts", path: "/docs/concepts" },
] as const;

const [GETTING_STARTED] = SECTIONS;

/** Pages outside the other sections are Getting started. */
const sectionOf = (url: string) =>
  SECTIONS.find(
    (section) =>
      section !== GETTING_STARTED &&
      (url === section.path || url.startsWith(`${section.path}/`))
  ) ?? GETTING_STARTED;

/**
 * The docs pages in each section, in sidebar order, for the search dialog to
 * show before anything is typed. Sections go by URL because the sidebar
 * spreads the components' own sub-headings into its top level.
 */
export const searchGroups = (
  navigation: readonly DocsNavArea[]
): SearchGroup[] => {
  const groups = SECTIONS.map((section): SearchGroup => ({
    items: [],
    label: section.label,
  }));

  for (const item of navigation.flatMap((area) =>
    area.groups.flatMap((group) => group.items)
  )) {
    const section = sectionOf(item.href);
    const group = groups[SECTIONS.indexOf(section)];

    if (section !== GETTING_STARTED && item.href === section.path) {
      group?.items.unshift({
        title: `All ${section.label.toLowerCase()}`,
        url: item.href,
      });
    } else {
      group?.items.push({ title: item.label, url: item.href });
    }
  }

  return groups.filter((group) => group.items.length > 0);
};
