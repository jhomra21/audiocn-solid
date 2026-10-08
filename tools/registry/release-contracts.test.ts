import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { root } from "./runner";

const registry = JSON.parse(
  await readFile(join(root, "registry.json"), "utf8")
);

test("non-slider core does not install the Kobalte adapter", () => {
  const core = registry.items.find((item) => item.name === "core");
  expect(core.files.map((file) => file.path)).not.toContain(
    "lib/solid/kobalte-slider.ts"
  );
});

test("each independently installable item delivers the license notice", async () => {
  for (const item of registry.items) {
    expect(
      item.files.some((file) => file.path === "lib/audiocn-license.txt"),
      item.name
    ).toBe(true);
  }

  const notice = await readFile(join(root, "lib/audiocn-license.txt"), "utf8");
  expect(notice).toContain("Copyright (c) 2026 OrcDev");
  expect(notice).toContain("Copyright (c) 2020 Phosphor Icons");
  expect(notice).toContain("Permission is hereby granted, free of charge");
  expect(notice).toContain("THE SOFTWARE IS PROVIDED");
  expect(notice).not.toContain("peon-work-work.wav");
});

test("the site build generates the registry before Vite", async () => {
  const { scripts } = JSON.parse(
    await readFile(join(root, "site/package.json"), "utf8")
  );

  expect(scripts.build).toContain("bun run ../tools/registry/build.ts");
  expect(scripts.build.indexOf("registry/build.ts")).toBeLessThan(
    scripts.build.indexOf("vite build")
  );
});

test("the root release command delegates to the site", async () => {
  const { scripts } = JSON.parse(
    await readFile(join(root, "package.json"), "utf8")
  );

  expect(scripts["build:release"]).toBe("bun run --cwd site build:release");
});

test("installation documents manual Solid setup, not React init", async () => {
  const instructions = await readFile(
    join(root, "site/content/docs/installation.mdx"),
    "utf8"
  );

  expect(instructions).not.toMatch(/shadcn@(?:latest|4\.21\.0) init/u);
  expect(instructions).toContain('title="components.json"');
  expect(instructions).toContain('"rsc": false');
  expect(instructions).toContain('"jsxImportSource": "solid-js"');
  expect(instructions).toContain('"jsxImportSource": "@solidjs/web"');
  expect(instructions).toContain('@import "tailwindcss"');
  expect(instructions).toContain("@theme inline");
});
