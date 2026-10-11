import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { root, run } from "./runner";

const checkout = await mkdtemp(join(tmpdir(), "audiocn-release-"));

const reportPath = join(root, "artifacts/registry-release-build.json");

const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root })
  .toString()
  .split("\0")
  .filter(Boolean);

// Current untracked implementation files are copied explicitly; never copy
// ignored registries, node_modules, dist or unrelated user files.
const added = [
  "lib/audiocn-license.txt",
  "tools/registry/consumer.ts",
  "tools/registry/consumer.spec.ts",
  "tools/registry/playwright.config.ts",
  "tools/registry/release-contracts.test.ts",
  "tools/registry/test-release.ts",
];

const extra = process.env.AUDIOCN_RELEASE_EXTRA_FILES?.split(",") ?? [];

const sourceFiles = [...new Set([...tracked, ...added, ...extra])];

for (let index = sourceFiles.length - 1; index >= 0; index -= 1) {
  if (!existsSync(join(root, sourceFiles[index]))) {
    sourceFiles.splice(index, 1);
  }
}

const sourceHashes: { path: string; sha256: string }[] = [];

const inventories: { runtime: string; items: number; files: number }[] = [];

const report = {
  pass: false,
  checkout,
  sourceFiles: sourceHashes,
  command: "cd site && bun run build:release",
  inventories,
  clean: false,
};

const expectedDependencies = (
  dependencies: string[] = [],
  runtime: "solid1" | "solid2"
): string[] => {
  const kobalte =
    runtime === "solid1"
      ? "@kobalte/core@https://github.com/jhomra21/kobalte/releases/download/kobalte-solid1-audiocn-e0e3bf095f05c7e61230a251b79181c6d834d408/kobalte-core-0.13.14-audiocn.0.e0e3bf09.tgz"
      : "@kobalte/core@https://github.com/jhomra21/kobalte/releases/download/kobalte-solid2-audiocn-b394be557e697ad4d3c28210df8a75aa3c300914-bundled.1/kobalte-core-2.0.0-alpha.2-audiocn.2.b394be55.tgz";

  const resolved = dependencies.map((dependency) => {
    if (dependency.startsWith("solid-js@"))
      return runtime === "solid1" ? dependency : "solid-js@2.0.0-rc.14";

    if (dependency.startsWith("@solidjs/web@"))
      return "@solidjs/web@2.0.0-rc.14";

    if (dependency.startsWith("@kobalte/core@")) return kobalte;

    return dependency;
  });

  if (
    runtime === "solid2" &&
    !resolved.some((dependency) => dependency.startsWith("@solidjs/web@"))
  )
    resolved.push("@solidjs/web@2.0.0-rc.14");

  return resolved;
};

try {
  for (const path of sourceFiles) {
    const destination = join(checkout, path);
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(root, path), destination);
    report.sourceFiles.push({
      path,
      sha256: createHash("sha256")
        .update(await readFile(destination))
        .digest("hex"),
    });
  }

  report.clean = true;
  await run("bun", ["install", "--frozen-lockfile"], checkout);
  await run("bun", ["run", "build:release"], join(checkout, "site"));

  const registry = JSON.parse(
    await readFile(join(checkout, "registry.json"), "utf8")
  );

  for (const runtime of ["solid1", "solid2"]) {
    const directory = join(checkout, "site/dist/client/r", runtime);

    const index = JSON.parse(
      await readFile(join(directory, "registry.json"), "utf8")
    );

    if (index.items.length !== registry.items.length)
      throw new Error(`${runtime}: missing registry items in release output.`);
    let files = 0;

    for (const item of index.items) {
      const source = registry.items.find(
        (sourceItem: { name: string }) => sourceItem.name === item.name
      );

      if (
        JSON.stringify(item.dependencies) !==
        JSON.stringify(expectedDependencies(source.dependencies, runtime))
      )
        throw new Error(`${runtime}/${item.name}: index dependencies differ.`);

      const payload = JSON.parse(
        await readFile(join(directory, `${item.name}.json`), "utf8")
      );

      if (
        !payload.files.some((file) => file.path === "lib/audiocn-license.txt")
      )
        throw new Error(`${runtime}/${item.name}: notice file missing.`);

      for (const file of payload.files) {
        const source =
          runtime === "solid2" && file.path === "lib/solid/jsx-types.ts"
            ? "lib/solid/compat/solid2/jsx-types.ts"
            : file.path;

        if (file.content !== (await readFile(join(checkout, source), "utf8")))
          throw new Error(
            `${runtime}/${item.name}/${file.path}: stale payload.`
          );

        if (
          !/^(components\/(?:ui|blocks|icons)\/|hooks\/|lib\/)/u.test(file.path)
        )
          throw new Error(
            `${runtime}/${item.name}: non-consumer content shipped.`
          );
        files += 1;
      }

      if (
        JSON.stringify(payload.dependencies) !==
        JSON.stringify(expectedDependencies(item.dependencies, runtime))
      )
        throw new Error(
          `${runtime}/${item.name}: runtime dependency metadata differs.`
        );
    }

    report.inventories.push({ runtime, items: index.items.length, files });
  }

  // Generation must not swap the source JSX seam, even temporarily.
  for (const path of [
    "lib/solid/jsx-types.ts",
    "lib/solid/compat/solid2/jsx-types.ts",
  ]) {
    const before = report.sourceFiles.find(
      (file) => file.path === path
    )?.sha256;

    const after = createHash("sha256")
      .update(await readFile(join(checkout, path)))
      .digest("hex");

    if (before !== after)
      throw new Error(`${path}: registry generation modified source.`);
  }

  report.pass = true;
} finally {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}
