import { cp, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { root, run } from "./runner";

const instructions = await readFile(
  join(root, "site/content/docs/installation.mdx"),
  "utf8"
);

/** Execute the exact commands/configuration shown to a new Solid consumer. */
const code = (title: string): string => {
  for (const block of instructions.matchAll(
    /```[^\n]*title="([^"]+)"\n([\s\S]*?)```/gu
  )) {
    if (block[1] === title) return block[2];
  }

  throw new Error(`Installation docs have no "${title}" code block.`);
};

export const createConsumer = async (
  runtime: string,
  origin: string
): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), `audiocn-${runtime}-`));

  for (const command of code("Create the app").trim().split("\n")) {
    if (command.startsWith("cd ")) continue;
    const [executable, ...args] = command.split(" ");

    const cwd = command.startsWith("bunx")
      ? directory
      : join(directory, "audio-app");

    await run(executable, args, cwd);
  }

  const app = join(directory, "audio-app");
  const label = runtime === "solid1" ? "Solid 1" : "Solid 2";

  for (const command of code(`${label} dependencies`).trim().split("\n")) {
    const [executable, ...args] = command.split(" ");
    await run(executable, args, app);
  }

  const tsconfig = JSON.parse(code("tsconfig.json"));
  tsconfig.compilerOptions.jsxImportSource =
    runtime === "solid2" ? "@solidjs/web" : "solid-js";

  const components = JSON.parse(code("components.json"));
  components.registries = {
    "@audiocn-solid": `${origin}/${runtime}/{name}.json`,
  };

  await Promise.all([
    writeFile(join(app, "tsconfig.json"), JSON.stringify(tsconfig, null, 2)),
    writeFile(
      join(app, "components.json"),
      JSON.stringify(components, null, 2)
    ),
    writeFile(join(app, "vite.config.ts"), code(`${label} vite.config.ts`)),
    writeFile(join(app, "src/index.css"), code("src/index.css")),
    writeFile(
      join(app, "src/App.tsx"),
      "export default function App() { return <main>registry fixture</main>; }\n"
    ),
  ]);

  if (runtime === "solid2") {
    const entry = join(app, "src/index.tsx");
    const source = await readFile(entry, "utf8");
    await writeFile(entry, source.replace("solid-js/web", "@solidjs/web"));
  }

  const manifestPath = join(app, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.scripts.typecheck = "tsc --noEmit";
  manifest.scripts.build = "vite build";
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await run("bunx", ["--bun", "shadcn@4.21.0", "info"], app);

  return app;
};

/** Never share node_modules or sources between independent item installs. */
export const copyConsumer = async (template: string): Promise<string> => {
  const fixture = await mkdtemp(join(tmpdir(), "audiocn-item-"));

  await cp(template, fixture, {
    recursive: true,
    filter: (path) => !["node_modules", "dist"].includes(basename(path)),
  });

  return fixture;
};
