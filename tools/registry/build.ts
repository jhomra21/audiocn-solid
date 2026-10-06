import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const output = join(root, "site/public/r");

const registry = JSON.parse(
  await readFile(join(root, "registry.json"), "utf8")
);

const jsxTypes = await readFile(
  join(root, "lib/solid/compat/solid2/jsx-types.ts"),
  "utf8"
);

const run = (args: string[]) => {
  const result = spawnSync("bunx", ["--bun", "shadcn@4.21.0", ...args], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0)
    throw new Error(`shadcn ${args.join(" ")} failed with ${result.status}.`);
};

const solid2Dependencies = (dependencies: string[] = []): string[] => {
  const resolved = dependencies.map((dependency) => {
    if (dependency.startsWith("solid-js@")) return "solid-js@^2.0.0-rc.13";

    if (dependency.startsWith("@solidjs/web@"))
      return "@solidjs/web@^2.0.0-rc.13";

    if (dependency.startsWith("@kobalte/core@"))
      return "@kobalte/core@2.0.0-alpha.2";

    return dependency;
  });

  if (!resolved.some((dependency) => dependency.startsWith("@solidjs/web@")))
    resolved.push("@solidjs/web@^2.0.0-rc.13");

  return resolved;
};

run(["registry", "validate", "registry.json"]);

run(["build", "registry.json", "--output", join(output, "solid1")]);

// Derive runtime-specific payloads, never replace checked-in source while a
// concurrent typecheck/Vite build might read it.
const solid2 = structuredClone(registry);

await mkdir(join(output, "solid2"), { recursive: true });

for (const item of solid2.items) {
  item.dependencies = solid2Dependencies(item.dependencies);

  const payload = JSON.parse(
    await readFile(join(output, "solid1", `${item.name}.json`), "utf8")
  );

  payload.dependencies = item.dependencies;

  for (const file of payload.files)
    if (file.path === "lib/solid/jsx-types.ts") file.content = jsxTypes;

  await writeFile(
    join(output, "solid2", `${item.name}.json`),
    `${JSON.stringify(payload, null, 2)}\n`
  );
}

await writeFile(
  join(output, "solid2/registry.json"),
  `${JSON.stringify(solid2, null, 2)}\n`
);
