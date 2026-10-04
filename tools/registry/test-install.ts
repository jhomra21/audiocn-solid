import { once } from "node:events";
import {
  createReadStream,
  existsSync,
} from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";

import { root, run } from "./runner";

const registryRoot = join(root, "site/public/r");

const artifactPath = join(root, "artifacts/registry-install.json");

const port = 4999;

const writeJson = async (path: string, value: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });

  await writeFile(path, value);
};

const packageJsonFor = (runtime: string) => {
  if (runtime === "solid2") {
    return {
      name: "registry-solid2-fixture",
      private: true,
      type: "module",
      scripts: {
        build: "vite build",
        typecheck: "tsc --noEmit",
      },
      dependencies: {
        "@solidjs/web": "2.0.0-rc.13",
        "solid-js": "2.0.0-rc.13",
      },
      devDependencies: {
        "@solidjs/vite-plugin": "3.0.0-next.47",
        "@tailwindcss/vite": "^4.3.3",
        "tailwindcss": "^4.3.3",
        "typescript": "^7.0.2",
        "vite": "^8.0.0",
      },
    };
  }

  return {
    name: "registry-solid1-fixture",
    private: true,
    type: "module",
    scripts: {
      build: "vite build",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      "solid-js": "1.9.15",
    },
    devDependencies: {
      "@tailwindcss/vite": "^4.3.3",
      "tailwindcss": "^4.3.3",
      "typescript": "^7.0.2",
      "vite": "^7.3.6",
      "vite-plugin-solid": "2.11.14",
    },
  };
};

const tsconfigFor = (runtime: string) => ({
  compilerOptions: {
    target: "ES2022",
    useDefineForClassFields: true,
    module: "ESNext",
    lib: ["ES2022", "DOM", "DOM.Iterable"],
    skipLibCheck: true,
    moduleResolution: "Bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    moduleDetection: "force",
    noEmit: true,
    jsx: "preserve",
    jsxImportSource: runtime === "solid2" ? "@solidjs/web" : "solid-js",
    strict: true,
    paths: {
      "@/*": ["./*"],
    },
    types: ["vite/client"],
  },
  include: ["src", "components", "hooks", "lib"],
});

const viteConfigFor = (runtime: string) => {
  const plugin =
    runtime === "solid2" ? "@solidjs/vite-plugin" : "vite-plugin-solid";

  const dedupe =
    runtime === "solid2"
      ? '\n    dedupe: ["solid-js", "@solidjs/web"],'
      : "";

  return `import { fileURLToPath, URL } from "node:url";

import solid from "${plugin}";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },${dedupe}
  },
});
`;
};

const mainFor = (runtime: string) => {
  const web = runtime === "solid2" ? "@solidjs/web" : "solid-js/web";

  return `import { render } from "${web}";

import App from "./App";
import "./styles.css";

render(() => <App />, document.getElementById("root")!);
`;
};

const componentsJsonFor = (runtime: string) => ({
  "$schema": "https://ui.shadcn.com/schema.json",
  style: "base-rhea",
  rsc: false,
  tsx: true,
  tailwind: {
    config: "",
    css: "src/styles.css",
    baseColor: "stone",
    cssVariables: true,
    prefix: "",
  },
  iconLibrary: "lucide",
  rtl: false,
  aliases: {
    components: "@/components",
    utils: "@/lib/utils",
    ui: "@/components/ui",
    lib: "@/lib",
    hooks: "@/hooks",
  },
  registries: {
    "@audiocn-solid": `http://127.0.0.1:${port}/${runtime}/{name}.json`,
  },
});

const createFixture = async (runtime: string): Promise<string> => {
  const workspace = await mkdtemp(
    join(tmpdir(), `audiocn-solid-${runtime}-`)
  );

  await mkdir(join(workspace, "src"), { recursive: true });

  await writeJson(
    join(workspace, "package.json"),
    `${JSON.stringify(packageJsonFor(runtime), null, 2)}\n`
  );

  await writeJson(
    join(workspace, "tsconfig.json"),
    `${JSON.stringify(tsconfigFor(runtime), null, 2)}\n`
  );

  await writeJson(
    join(workspace, "components.json"),
    `${JSON.stringify(componentsJsonFor(runtime), null, 2)}\n`
  );

  await writeFile(
    join(workspace, "vite.config.ts"),
    viteConfigFor(runtime)
  );

  await writeFile(
    join(workspace, "index.html"),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n'
  );

  await writeFile(
    join(workspace, "src/App.tsx"),
    'export default function App() { return <main>registry fixture</main>; }\n'
  );

  await writeFile(
    join(workspace, "src/main.tsx"),
    mainFor(runtime)
  );

  await writeFile(
    join(workspace, "src/styles.css"),
    '@import "tailwindcss";\n@source "../components";\n@source "../hooks";\n@source "../lib";\n'
  );

  return workspace;
};

const registryText = await readFile(join(root, "registry.json"), "utf8");

const registry = JSON.parse(registryText);

const itemNames = registry.items.map((item) => item.name);

const report = {
  pass: false,
  upstreamSha: "199b0b83e9ea175006bb2d86b529a3287e1fc4f6",
  itemNames,
  runtimes: [],
};

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const requested = resolve(registryRoot, `.${url.pathname}`);
  const rootPrefix = `${resolve(registryRoot)}${sep}`;

  if (!requested.startsWith(rootPrefix) || !existsSync(requested)) {
    response.writeHead(404).end();

    return;
  }

  response.writeHead(200, {
    "Content-Type": "application/json",
  });

  createReadStream(requested).pipe(response);
});

server.listen(port, "127.0.0.1");

await once(server, "listening");

try {
  for (const runtime of ["solid1", "solid2"]) {
    const fixture = await createFixture(runtime);

    const runtimeResult = {
      runtime,
      fixture,
      items: [],
      typecheck: false,
      build: false,
    };

    report.runtimes.push(runtimeResult);

    await run("bun", ["install"], fixture);

    for (const name of itemNames) {
      const itemResult = {
        installed: false,
        name,
      };

      runtimeResult.items.push(itemResult);

      try {
        await run(
          "bunx",
          [
            "shadcn@4.21.0",
            "add",
            `@audiocn-solid/${name}`,
            "--yes",
            "--overwrite",
          ],
          fixture
        );

        itemResult.installed = true;
      } catch (error) {
        itemResult.error =
          error instanceof Error ? error.message : String(error);

        throw error;
      }
    }

    await run("bun", ["run", "typecheck"], fixture);
    runtimeResult.typecheck = true;

    await run("bun", ["run", "build"], fixture);
    runtimeResult.build = true;
  }

  report.pass = true;
} catch (error) {
  Object.assign(report, {
    error: error instanceof Error ? error.message : String(error),
  });

  throw error;
} finally {
  server.close();

  await writeJson(
    artifactPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
}
