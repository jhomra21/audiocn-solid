import { describe, expect, it } from "bun:test";

import { DOCS_NAVIGATION } from "./docs/navigation";
import type { DocsNavArea } from "./docs/navigation";
import { searchGroups } from "./search-groups";

const item = (label: string, href: string) => ({ href, label });

// Shaped like the docs sidebar: the components' own sub-headings sit beside
// the section headings.
const navigation: DocsNavArea[] = [
  {
    groups: [
      {
        items: [
          item("Introduction", "/docs"),
          item("Installation", "/docs/installation"),
        ],
      },
    ],
    label: "Getting started",
  },
  {
    groups: [{ items: [item("Theming", "/docs/concepts/theming")] }],
    label: "Concepts",
  },
  {
    groups: [
      { items: [item("Components", "/docs/components")] },
      { items: [item("Knob", "/docs/components/knob")], label: "Controls" },
      { items: [item("Mixer", "/docs/components/mixer")], label: "Mixer" },
    ],
    label: "Components",
  },
  {
    groups: [
      {
        items: [
          item("Blocks", "/docs/blocks"),
          item("Soundboard", "/docs/blocks/soundboard"),
        ],
      },
    ],
    label: "Blocks",
  },
];

describe("searchGroups", () => {
  it("groups pages by section, overview first, in menu order", () => {
    expect(searchGroups(navigation)).toEqual([
      {
        items: [
          { title: "Introduction", url: "/docs" },
          { title: "Installation", url: "/docs/installation" },
        ],
        label: "Getting started",
      },
      {
        items: [
          { title: "All components", url: "/docs/components" },
          { title: "Knob", url: "/docs/components/knob" },
          { title: "Mixer", url: "/docs/components/mixer" },
        ],
        label: "Components",
      },
      {
        items: [
          { title: "All blocks", url: "/docs/blocks" },
          { title: "Soundboard", url: "/docs/blocks/soundboard" },
        ],
        label: "Blocks",
      },
      {
        items: [{ title: "Theming", url: "/docs/concepts/theming" }],
        label: "Concepts",
      },
    ]);
  });

  it("lists every page of the real sidebar exactly once", () => {
    const listed = searchGroups(DOCS_NAVIGATION).flatMap((group) =>
      group.items.map((entry) => entry.url)
    );

    const sidebar = DOCS_NAVIGATION.flatMap((area) =>
      area.groups.flatMap((group) => group.items.map((entry) => entry.href))
    );

    expect([...listed].sort()).toEqual([...sidebar].sort());
  });
});
