import { once } from "node:events";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join, relative, resolve, sep } from "node:path";

import { copyConsumer, createConsumer } from "./consumer";
import { root, run } from "./runner";

const registryRoot = join(root, "site/public/r");

const artifactPath =
  process.env.AUDIOCN_INSTALL_REPORT ??
  join(root, "artifacts/registry-install.json");

const registry = JSON.parse(
  await readFile(join(root, "registry.json"), "utf8")
);

const itemNames: string[] = registry.items
  .map((item) => item.name)
  .filter(
    (name) => !process.env.AUDIOCN_ITEM || name === process.env.AUDIOCN_ITEM
  );

interface ItemResult {
  name: string;
  fixture: string;
  installed: boolean;
  typecheck: boolean;
  build: boolean;
  license: boolean;
  files: string[];
  npmDependencies: string[];
  installedDependencies: { name: string; specifier: string; version: string }[];
  reactPackages: string[];
}

interface RuntimeResult {
  runtime: string;
  fixture: string;
  items: ItemResult[];
  typecheck: boolean;
  build: boolean;
}

const runtimes: RuntimeResult[] = [];

const report = {
  pass: false,
  strategy:
    "isolated item sources and node_modules; documented Solid bootstrap",
  upstreamSha: "9598cf2abbcf0dc844e61d77d18af46a6d17e8a9",
  itemNames,
  runtimes,
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://registry");
  const requested = resolve(registryRoot, `.${url.pathname}`);

  if (
    !requested.startsWith(`${resolve(registryRoot)}${sep}`) ||
    !existsSync(requested)
  ) {
    response.writeHead(404).end();

    return;
  }

  response.writeHead(200, { "Content-Type": "application/json" });
  createReadStream(requested).pipe(response);
});

server.listen(0, "127.0.0.1");

await once(server, "listening");

// SAFETY: a listening TCP server returns its assigned port as AddressInfo.
const { port } = server.address() as AddressInfo;

const origin = `http://127.0.0.1:${port}`;

const filesIn = async (directory: string): Promise<string[]> => {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else files.push(path);
  }

  return files;
};

const install = (fixture: string, names: string[]) =>
  run(
    "bunx",
    [
      "--bun",
      "shadcn@4.21.0",
      "add",
      ...names.map((name) => `@audiocn-solid/${name}`),
      "--yes",
      "--overwrite",
    ],
    fixture
  );

try {
  for (const runtime of ["solid1", "solid2"].filter(
    (name) =>
      !process.env.AUDIOCN_RUNTIME || name === process.env.AUDIOCN_RUNTIME
  )) {
    const template = await createConsumer(runtime, origin);

    const runtimeResult: (typeof report.runtimes)[number] = {
      runtime,
      fixture: "",
      items: [],
      typecheck: false,
      build: false,
    };

    report.runtimes.push(runtimeResult);

    for (const name of itemNames) {
      const fixture = await copyConsumer(template);

      const itemResult: ItemResult = {
        name,
        fixture,
        installed: false,
        typecheck: false,
        build: false,
        license: false,
        files: [],
        npmDependencies: [],
        installedDependencies: [],
        reactPackages: [],
      };

      runtimeResult.items.push(itemResult);

      await run("bun", ["install", "--frozen-lockfile"], fixture);
      await install(fixture, [name]);
      itemResult.installed = true;

      const seen = new Set<string>();
      const expected = new Map<string, string>();
      const dependencies = new Set<string>();

      const visit = async (current: string) => {
        if (seen.has(current)) return;
        seen.add(current);

        const item = JSON.parse(
          await readFile(join(registryRoot, runtime, `${current}.json`), "utf8")
        );

        for (const dependency of item.dependencies ?? [])
          dependencies.add(dependency);

        for (const file of item.files) expected.set(file.path, file.content);

        for (const dependency of item.registryDependencies ?? [])
          await visit(dependency.slice("@audiocn-solid/".length));
      };

      await visit(name);
      itemResult.files = [...expected.keys()].sort();
      itemResult.npmDependencies = [...dependencies].sort();

      const installed = (await filesIn(join(fixture, "src")))
        .map((path) => relative(join(fixture, "src"), path))
        .filter((path) => /^(components|hooks|lib)\//u.test(path))
        .sort();

      if (JSON.stringify(installed) !== JSON.stringify(itemResult.files))
        throw new Error(
          `${runtime}/${name}: installed file plan differs from registry.`
        );

      if (
        name === "mixer" &&
        !installed.includes("components/ui/channel-strip.tsx")
      )
        throw new Error(
          `${runtime}/mixer: documented ChannelStrip dependency was not installed.`
        );

      const manifest = JSON.parse(
        await readFile(join(fixture, "package.json"), "utf8")
      );

      const lock = await readFile(join(fixture, "bun.lock"), "utf8");

      for (const dependency of Object.keys(manifest.dependencies)) {
        const installedPackage = JSON.parse(
          await readFile(
            join(fixture, "node_modules", dependency, "package.json"),
            "utf8"
          )
        );

        itemResult.installedDependencies.push({
          name: dependency,
          specifier: manifest.dependencies[dependency],
          version: installedPackage.version,
        });
      }

      itemResult.reactPackages = [
        "react",
        "react-dom",
        "lucide-react",
        "@base-ui/react",
      ].filter(
        (dependency) =>
          manifest.dependencies?.[dependency] ||
          lock.includes(`"${dependency}":`)
      );

      if (itemResult.reactPackages.length)
        throw new Error(
          `${runtime}/${name}: React dependencies leaked into Solid install.`
        );

      const primary = registry.items.find((item) => item.name === name).files[0]
        .path;

      const importPath = `@/${primary.replace(/\.tsx?$/u, "")}`;
      await writeFile(
        join(fixture, "src/App.tsx"),
        `import * as Item from "${importPath}";\nexport default function App() { return <main data-exports={Object.keys(Item).join(",")}>${name}</main>; }\n`
      );
      await run("bun", ["run", "typecheck"], fixture);
      itemResult.typecheck = true;
      await run("bun", ["run", "build"], fixture);
      itemResult.build = true;

      const notice = await readFile(
        join(fixture, "src/lib/audiocn-license.txt"),
        "utf8"
      );

      if (
        notice !== expected.get("lib/audiocn-license.txt") ||
        !notice.includes("Copyright (c) 2026 OrcDev") ||
        !notice.includes("Copyright (c) 2020 Phosphor Icons") ||
        !notice.includes("Permission is hereby granted, free of charge")
      )
        throw new Error(`${runtime}/${name}: required license notice missing.`);
      itemResult.license = true;
    }

    // Existing browser acceptance composes all controls/blocks, independently
    // of the single-item proofs above. Keep its full-library fixture separate.
    const fixture = await copyConsumer(template);
    await run("bun", ["install", "--frozen-lockfile"], fixture);
    await install(fixture, itemNames);
    await run("bun", ["run", "typecheck"], fixture);
    runtimeResult.typecheck = true;
    await run("bun", ["run", "build"], fixture);
    runtimeResult.build = true;
    runtimeResult.fixture = fixture;
  }

  report.pass = true;
} finally {
  server.close();
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
}
