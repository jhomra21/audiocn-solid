import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import path from "node:path";

import type { RegistryItem } from "./registry";
import {
  getRegistryItem,
  importPathFor,
  itemForImportPath,
  registryItemForPath,
  registryItemPath,
  registryItemUrl,
  resolveInstall,
} from "./registry";

const item = (name: string): RegistryItem => {
  const found = getRegistryItem(name);

  if (!found) {
    throw new Error(`No registry item named "${name}"`);
  }

  return found;
};

const SECTIONS = ["components", "blocks", "hooks"] as const;

const pageSlugs = (section: string) =>
  readdirSync(path.join(process.cwd(), "content/docs", section))
    .filter((file) => file.endsWith(".mdx") && file !== "index.mdx")
    .map((file) => file.replace(/\.mdx$/u, ""));

describe("resolveInstall", () => {
  it("walks registry dependencies transitively", () => {
    const plan = resolveInstall(item("music-player"));
    const names = plan.registryItems.map((entry) => entry.name);

    expect(names).toContain("audio-player");
    // Only reachable through the components the block composes.
    expect(names).toContain("core");
    expect(names).toEqual(
      expect.arrayContaining(["card", "empty", "label", "switch", "toggle"])
    );
    expect(plan.shadcnItems).toEqual([]);
    expect(plan.npmDependencies).toContain("solid-js@2.0.0-rc.14");
    expect(plan.npmDependencies).toContain("@solidjs/web@2.0.0-rc.14");
    expect(plan.npmDependencies).toContain(
      "@kobalte/core@https://github.com/jhomra21/kobalte/releases/download/kobalte-solid2-audiocn-b394be557e697ad4d3c28210df8a75aa3c300914-bundled.1/kobalte-core-2.0.0-alpha.2-audiocn.2.b394be55.tgz"
    );
    expect(plan.npmDependencies).not.toContain("@phosphor-icons/react");
  });

  it("lists an item reached by several paths only once", () => {
    const names = resolveInstall(item("music-player")).registryItems.map(
      (entry) => entry.name
    );

    expect(names).toHaveLength(new Set(names).size);
  });

  it("reports the audio tokens only when the core comes with it", () => {
    expect(resolveInstall(item("bar-visualizer")).cssVariables).toContain(
      "--meter-ok"
    );
    expect(resolveInstall(item("use-visibility")).cssVariables).toEqual([]);
  });

  it("keeps a standalone item's plan empty", () => {
    const plan = resolveInstall(item("use-reduced-motion"));
    expect(plan.registryItems).toEqual([]);
    expect(plan.npmDependencies).toEqual([
      "solid-js@2.0.0-rc.14",
      "@solidjs/web@2.0.0-rc.14",
    ]);
    expect(plan.shadcnItems).toEqual([]);
  });
});

describe("importPathFor", () => {
  it("maps each kind of item to the alias consumers import", () => {
    expect(importPathFor(item("bar-visualizer"))).toBe(
      "@/components/ui/bar-visualizer"
    );
    expect(importPathFor(item("use-audio-analyser"))).toBe(
      "@/hooks/use-audio-analyser"
    );
    expect(importPathFor(item("music-player"))).toBe(
      "@/components/blocks/music-player/music-player"
    );
  });
});

describe("registryItemPath", () => {
  // The canonical URL redirects to `www`, which a browser fetch cannot follow
  // cross-origin, so the button needs the path on its own deployment.
  it("is the canonical URL's path, same origin as the reader", () => {
    expect(registryItemPath("bar-visualizer")).toBe(
      "/r/solid2/bar-visualizer.json"
    );
    expect(new URL(registryItemUrl("knob")).pathname).toBe(
      registryItemPath("knob")
    );
  });
});

describe("itemForImportPath", () => {
  it("finds the item an example imports", () => {
    expect(itemForImportPath("@/hooks/use-demo-signal")?.name).toBe(
      "use-demo-signal"
    );
    expect(itemForImportPath("@/components/ui/badge")?.name).toBe("badge");
    expect(
      itemForImportPath("@/components/ui/not-in-registry")
    ).toBeUndefined();
  });
});

describe("registryItemForPath", () => {
  it("matches only the sections whose pages document an item", () => {
    expect(registryItemForPath("/docs/components/knob")?.name).toBe("knob");
    expect(registryItemForPath("/docs/hooks/use-level")?.name).toBe(
      "use-level"
    );
    expect(registryItemForPath("/docs/concepts/theming")).toBeUndefined();
    expect(registryItemForPath("/docs/installation")).toBeUndefined();
    expect(registryItemForPath("/docs/components")).toBeUndefined();
  });

  // The whole feature rests on the last path segment being the item name.
  it("has an item for every component, block and hook page", () => {
    for (const section of SECTIONS) {
      for (const slug of pageSlugs(section)) {
        const found = registryItemForPath(`/docs/${section}/${slug}`);
        expect(found?.name, `/docs/${section}/${slug}`).toBe(slug);
      }
    }
  });
});
