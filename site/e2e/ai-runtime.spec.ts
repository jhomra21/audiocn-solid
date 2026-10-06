import { expect, test } from "@playwright/test";

import { siteConfig } from "../lib/site";

interface RegistryPayload {
  dependencies?: string[];
  registryDependencies?: string[];
  files: { path: string; content: string }[];
}

const cases = (["solid1", "solid2"] as const).flatMap((runtime) =>
  ["knob", "fader"].map((name) => ({ runtime, name }))
);

for (const { runtime, name } of cases) {
  test(`the served single-copy ${name} prompt has a complete ${runtime} branch matching the generated registry`, async ({
    request,
  }) => {
    const response = await request.get(`/docs/components/${name}.md`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/markdown");
    const markdown = await response.text();
    const title = runtime === "solid1" ? "### Solid 1" : "### Solid 2";

    const branch = markdown
      .split(`${title}\n`)[1]
      ?.split("\n### ")[0]
      ?.split("\n## ")[0];

    expect(
      branch,
      `${title} instructions must be present in the same copied document`
    ).toBeDefined();
    expect(markdown).toContain("Choose exactly one runtime branch");
    expect(branch).toContain(`${siteConfig.url}/r/${runtime}/{name}.json`);
    expect(branch).toContain(
      `If the CLI cannot run, fetch ${siteConfig.url}/r/${runtime}/${name}.json`
    );

    const seen = new Set<string>();
    const dependencies = new Set<string>();
    const files = new Map<string, string>();

    const visit = async (name: string) => {
      if (seen.has(name)) return;
      seen.add(name);
      const itemResponse = await request.get(`/r/${runtime}/${name}.json`);
      expect(itemResponse.status()).toBe(200);
      const item: RegistryPayload = await itemResponse.json();

      for (const dependency of item.dependencies ?? [])
        dependencies.add(dependency);

      for (const file of item.files) files.set(file.path, file.content);

      for (const dependency of item.registryDependencies ?? []) {
        if (dependency.startsWith("@audiocn-solid/"))
          await visit(dependency.slice("@audiocn-solid/".length));
      }
    };

    await visit(name);

    const npmLine = branch!
      .split("\n")
      .find((line) => line.startsWith("- npm packages:"));

    const advertised = [...(npmLine ?? "").matchAll(/`([^`]+)`/gu)]
      .map((match) => match[1])
      .sort();

    expect(advertised).toEqual([...dependencies].sort());

    if (name === "fader") {
      expect(advertised).toContain(
        runtime === "solid1"
          ? "@kobalte/core@0.13.14"
          : "@kobalte/core@2.0.0-alpha.2"
      );
    }

    for (const path of files.keys()) expect(branch).toContain(`\`${path}\``);

    const fileSection = branch!
      .split("Files written by this runtime's install:\n\n")[1]
      ?.split("\n\nCopy compatibility files")[0];

    const advertisedFiles = [
      ...(fileSection ?? "").matchAll(/^- `([^`]+)`$/gmu),
    ]
      .map((match) => match[1])
      .sort();

    expect(advertisedFiles).toEqual([...files.keys()].sort());
    expect(branch).toContain(
      "Copy compatibility files from this runtime's registry, not the other branch."
    );
    const compat = files.get("lib/solid/jsx-types.ts");
    expect(compat).toContain(
      runtime === "solid1"
        ? 'from "solid-js/jsx-runtime"'
        : 'from "@solidjs/web/jsx-runtime"'
    );
    expect(branch).not.toContain(
      `/r/${runtime === "solid1" ? "solid2" : "solid1"}/`
    );
  });
}
