import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type RuntimeName = "solid1" | "solid2";

interface RuntimeConfig {
  name: RuntimeName;
  port: number;
}

interface RuntimeResult {
  runtime: RuntimeName;
  fixture: string;
  install: boolean;
  typecheck: boolean;
  build: boolean;
  e2e: boolean;
  error?: string;
}

interface ApiDifference {
  surface: string;
  solid1: string;
  solid2: string;
  consequence: string;
}

interface Spike4Report {
  pass: boolean;
  upstreamSha: string;
  kobalteRefs: {
    main: string;
    solid2: string;
  };
  versions: {
    solid1: string;
    solid2: string;
  };
  apiDifferences: ApiDifference[];
  runtimes: RuntimeResult[];
  error?: string;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const artifactPath = join(root, "artifacts/spike-4.json");

const sharedAppPath = join(root, "tools/spikes/kobalte/App.tsx");

const sharedStylesPath = join(root, "tools/spikes/kobalte/styles.css");

const runtimes: RuntimeConfig[] = [
  { name: "solid1", port: 4191 },
  { name: "solid2", port: 4192 },
];

const run = async (
  command: string,
  args: string[],
  cwd: string
): Promise<void> => {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
  });

  const [code] = await once(child, "close");

  if (code !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${String(code)}.`
    );
  }
};

const packageJsonFor = (runtime: RuntimeName): string => {
  const packageJson =
    runtime === "solid2"
      ? {
          name: "kobalte-solid2-spike",
          private: true,
          type: "module",
          scripts: {
            build: "vite build",
            preview: "vite preview",
            typecheck: "tsc --noEmit",
          },
          dependencies: {
            "@kobalte/core": "2.0.0-alpha.2",
            "@solidjs/web": "2.0.0-rc.3",
            "solid-js": "2.0.0-rc.3",
          },
          devDependencies: {
            "@solidjs/vite-plugin": "3.0.0-next.47",
            typescript: "^7.0.2",
            vite: "^8.0.0",
          },
        }
      : {
          name: "kobalte-solid1-spike",
          private: true,
          type: "module",
          scripts: {
            build: "vite build",
            preview: "vite preview",
            typecheck: "tsc --noEmit",
          },
          dependencies: {
            "@kobalte/core": "0.13.14",
            "solid-js": "1.9.15",
          },
          devDependencies: {
            typescript: "^7.0.2",
            vite: "^7.3.6",
            "vite-plugin-solid": "2.11.14",
          },
        };

  return `${JSON.stringify(packageJson, null, 2)}\n`;
};

const tsconfigFor = (runtime: RuntimeName): string => {
  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      useDefineForClassFields: true,
      module: "ESNext",
      lib: ["ES2022", "DOM", "DOM.Iterable"],
      skipLibCheck: true,
      moduleResolution: "Bundler",
      isolatedModules: true,
      moduleDetection: "force",
      noEmit: true,
      jsx: "preserve",
      jsxImportSource: runtime === "solid2" ? "@solidjs/web" : "solid-js",
      strict: true,
      types: ["vite/client"],
    },
    include: ["src"],
  };

  return `${JSON.stringify(tsconfig, null, 2)}\n`;
};

const viteConfigFor = (runtime: RuntimeName): string => {
  const plugin =
    runtime === "solid2" ? "@solidjs/vite-plugin" : "vite-plugin-solid";

  const dedupe =
    runtime === "solid2"
      ? '\n    dedupe: ["solid-js", "@solidjs/web"],'
      : "";

  return `import solid from "${plugin}";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid()],
  resolve: {${dedupe}
  },
});
`;
};

const mainFor = (runtime: RuntimeName): string => {
  const web = runtime === "solid2" ? "@solidjs/web" : "solid-js/web";

  return `import { render } from "${web}";

import App from "./App";
import "./styles.css";

render(() => <App />, document.getElementById("root")!);
`;
};

const createFixture = async (runtime: RuntimeName): Promise<string> => {
  const fixture = await mkdtemp(join(tmpdir(), `kobalte-${runtime}-`));
  const sourceDir = join(fixture, "src");

  await mkdir(sourceDir, { recursive: true });

  const [app, styles] = await Promise.all([
    readFile(sharedAppPath, "utf8"),
    readFile(sharedStylesPath, "utf8"),
  ]);

  await Promise.all([
    writeFile(join(fixture, "package.json"), packageJsonFor(runtime)),
    writeFile(join(fixture, "tsconfig.json"), tsconfigFor(runtime)),
    writeFile(join(fixture, "vite.config.ts"), viteConfigFor(runtime)),
    writeFile(
      join(fixture, "index.html"),
      '<!doctype html><html><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n'
    ),
    writeFile(join(sourceDir, "App.tsx"), app),
    writeFile(join(sourceDir, "main.tsx"), mainFor(runtime)),
    writeFile(join(sourceDir, "styles.css"), styles),
  ]);

  return fixture;
};

const waitForServer = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // Preview has not bound the port yet.
    }

    await Bun.sleep(100);
  }

  throw new Error(`Timed out waiting for ${url}.`);
};

const runE2E = async (
  fixture: string,
  port: number
): Promise<void> => {
  const baseUrl = `http://127.0.0.1:${port}`;

  const preview = spawn(
    "bun",
    [
      "run",
      "preview",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: fixture,
      env: process.env,
      stdio: "inherit",
    }
  );

  try {
    await waitForServer(baseUrl);

    const test = spawn(
      "bunx",
      [
        "playwright",
        "test",
        "--config",
        "tools/spikes/kobalte/playwright.config.ts",
      ],
      {
        cwd: root,
        env: {
          ...process.env,
          KOBALTE_BASE_URL: baseUrl,
        },
        stdio: "inherit",
      }
    );

    const [code] = await once(test, "close");

    if (code !== 0) {
      throw new Error(
        `Playwright failed for ${baseUrl} with exit code ${String(code)}.`
      );
    }
  } finally {
    preview.kill("SIGTERM");

    if (preview.exitCode === null) {
      await once(preview, "close");
    }
  }
};

const writeReport = async (report: Spike4Report): Promise<void> => {
  await mkdir(dirname(artifactPath), { recursive: true });

  await writeFile(
    artifactPath,
    `${JSON.stringify(report, null, 2)}\n`
  );
};

const report: Spike4Report = {
  pass: false,
  upstreamSha: "199b0b83e9ea175006bb2d86b529a3287e1fc4f6",
  kobalteRefs: {
    main: "675b4a11f4f074007c98b47a573760a1b60849ff",
    solid2: "e9d426d438b7c9ea0cc81bd1133831a20cd5fcae",
  },
  versions: {
    solid1: "@kobalte/core@0.13.14 + solid-js@1.9.15",
    solid2:
      "@kobalte/core@2.0.0-alpha.2 + solid-js/@solidjs/web@2.0.0-rc.3",
  },
  apiDifferences: [
    {
      surface: "package exports",
      solid1: "root barrel and component subpaths",
      solid2: "component subpaths only",
      consequence:
        "Shared source imports every primitive from @kobalte/core/<primitive>.",
    },
    {
      surface: "tested primitive names",
      solid1:
        "Slider/Select/Popover/Switch/Tabs/Tooltip/ContextMenu parts used by the fixture",
      solid2:
        "Same public part names for the fixture subset",
      consequence:
        "No runtime branch is needed in the shared component source.",
    },
    {
      surface: "internal ref/reactivity implementation",
      solid1: "Solid 1 refs plus splitProps/default-prop helpers",
      solid2: "Solid 2 Ref arrays plus merge/omit and two-phase effects",
      consequence:
        "The implementation differs internally, but the tested public API does not.",
    },
  ],
  runtimes: [],
};

try {
  for (const runtime of runtimes) {
    const fixture = await createFixture(runtime.name);

    const result: RuntimeResult = {
      runtime: runtime.name,
      fixture,
      install: false,
      typecheck: false,
      build: false,
      e2e: false,
    };

    report.runtimes.push(result);

    try {
      await run("bun", ["install"], fixture);
      result.install = true;

      await run("bun", ["run", "typecheck"], fixture);
      result.typecheck = true;

      await run("bun", ["run", "build"], fixture);
      result.build = true;

      await runE2E(fixture, runtime.port);
      result.e2e = true;
    } catch (error) {
      result.error =
        error instanceof Error ? error.message : String(error);

      throw error;
    }
  }

  report.pass = true;
} catch (error) {
  report.error =
    error instanceof Error ? error.message : String(error);

  throw error;
} finally {
  await writeReport(report);
}
