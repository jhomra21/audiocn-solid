import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
        JSON.stringify(item.dependencies)
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
