import { spawnSync } from "node:child_process";
import {
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const registryPath = join(root, "registry.json");

const jsxTypesPath = join(root, "lib/solid/jsx-types.ts");

const solid2JsxTypesPath = join(
  root,
  "lib/solid/compat/solid2/jsx-types.ts"
);

const temporaryRegistryPath = join(root, ".registry-solid2.json");

const run = (args: string[]) => {
  const result = spawnSync("bunx", ["shadcn@4.21.0", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `shadcn ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`
    );
  }
};

const solid2Dependencies = (dependencies: string[] | undefined): string[] => {
  const resolved: string[] = [];
  let hasWeb = false;

  for (const dependency of dependencies ?? []) {
    if (dependency.startsWith("solid-js@")) {
      resolved.push("solid-js@^2.0.0-rc.13");
      continue;
    }

    if (dependency.startsWith("@solidjs/web@")) {
      resolved.push("@solidjs/web@^2.0.0-rc.13");
      hasWeb = true;
      continue;
    }

    resolved.push(dependency);
  }

  if (!hasWeb) {
    resolved.push("@solidjs/web@^2.0.0-rc.13");
  }

  return resolved;
};

const registryText = await readFile(registryPath, "utf8");

const registry = JSON.parse(registryText);

const solid1JsxTypes = await readFile(jsxTypesPath, "utf8");

const solid2JsxTypes = await readFile(solid2JsxTypesPath, "utf8");

await rm(join(root, "site/public/r/solid1"), {
  force: true,
  recursive: true,
});

await rm(join(root, "site/public/r/solid2"), {
  force: true,
  recursive: true,
});

run(["registry", "validate", "registry.json"]);

run([
  "build",
  "registry.json",
  "--output",
  "site/public/r/solid1",
]);

const solid2Registry = structuredClone(registry);

for (const item of solid2Registry.items) {
  item.dependencies = solid2Dependencies(item.dependencies);
}

await writeFile(
  temporaryRegistryPath,
  `${JSON.stringify(solid2Registry, null, 2)}\n`
);

try {
  await writeFile(jsxTypesPath, solid2JsxTypes);

  run([
    "build",
    ".registry-solid2.json",
    "--output",
    "site/public/r/solid2",
  ]);
} finally {
  await writeFile(jsxTypesPath, solid1JsxTypes);
  await unlink(temporaryRegistryPath).catch(() => undefined);
}
