import { spawnSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";

interface Evidence {
  html: Record<string, string>;
  runtimeRoots: Record<string, string[]>;
  upstreamSha: string;
}

interface SpikeResult {
  pass: boolean;
  stage: string;
  evidence?: Evidence;
  error?: string;
}

interface SourceMapLike {
  sources?: string[];
}

const siteRoot = resolve(import.meta.dirname, "..");

const clientDir = join(siteRoot, "dist", "client");

const artifactPath = join(siteRoot, "artifacts", "spike-1.json");

const run = (stage: string, command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: siteRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${stage} failed with exit code ${result.status ?? "unknown"}.`
    );
  }
};

const walk = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else {
      files.push(path);
    }
  }

  return files;
};

const findRouteHtml = async (route: string): Promise<string> => {
  const suffix =
    route === "/"
      ? "index.html"
      : `${route.replace(/^\//, "")}/index.html`;

  const files = await walk(clientDir);
  const match = files.find((file) => file.endsWith(suffix));

  if (!match) {
    throw new Error(`Missing prerendered HTML for ${route}.`);
  }

  return match;
};

const packageRoots = async (packageName: string): Promise<string[]> => {
  const files = await walk(clientDir);
  const roots = new Set<string>();
  const marker = join("node_modules", ...packageName.split("/")) + sep;

  for (const file of files) {
    if (!file.endsWith(".js.map")) {
      continue;
    }

    const sourceMap: SourceMapLike = JSON.parse(await readFile(file, "utf8"));

    for (const source of sourceMap.sources ?? []) {
      const absolute = resolve(dirname(file), source);
      const index = absolute.indexOf(marker);

      if (index !== -1) {
        roots.add(absolute.slice(0, index + marker.length));
      }
    }
  }

  return [...roots].sort();
};

const assertHtml = async (
  route: string,
  title: string,
  description: string
): Promise<string> => {
  const path = await findRouteHtml(route);
  const html = await readFile(path, "utf8");

  if (!html.includes('data-slot="level-meter"')) {
    throw new Error(`Prerendered ${route} is missing LevelMeter markup.`);
  }

  const headStart = html.indexOf("<head");

  const headEnd = html.indexOf("</head>");

  const head =
    headStart === -1 || headEnd === -1
      ? "(missing head)"
      : html.slice(headStart, headEnd + "</head>".length);

  if (!head.includes("<title") || !head.includes(`>${title}</title>`)) {
    throw new Error(
      `Prerendered ${route} is missing its title. Head: ${head}`
    );
  }

  if (!html.includes(description)) {
    throw new Error(
      `Prerendered ${route} is missing its description. Head: ${head}`
    );
  }

  return path.slice(siteRoot.length + 1);
};

const writeResult = async (result: SpikeResult) => {
  await mkdir(dirname(artifactPath), { recursive: true });

  await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
};

let stage = "typecheck";

try {
  run(stage, "bunx", ["tsc", "--noEmit"]);

  stage = "build";

  run(stage, "bunx", ["vite", "build"]);

  stage = "prerender";

  const html = {
    home: await assertHtml(
      "/",
      "audiocn Solid",
      "Solid audio components with matching Solid 1 and Solid 2 registry builds."
    ),
    levelMeter: await assertHtml(
      "/docs/components/level-meter",
      "LevelMeter for Solid - audiocn Solid",
      "LevelMeter for Solid with live peak, RMS, hold, scale, and clip indication."
    ),
  };

  stage = "single-runtime";

  const runtimeRoots = {
    "@solidjs/web": await packageRoots("@solidjs/web"),
    "solid-js": await packageRoots("solid-js"),
  };

  for (const [packageName, roots] of Object.entries(runtimeRoots)) {
    if (roots.length !== 1) {
      throw new Error(
        `Expected one bundled ${packageName} copy, found ${roots.length}: ${roots.join(", ")}`
      );
    }
  }

  stage = "hydration";

  run(stage, "bunx", ["playwright", "test"]);

  await writeResult({
    pass: true,
    stage: "complete",
    evidence: {
      html,
      runtimeRoots,
      upstreamSha: "199b0b83e9ea175006bb2d86b529a3287e1fc4f6",
    },
  });
} catch (error) {
  await writeResult({
    error: error instanceof Error ? error.message : String(error),
    pass: false,
    stage,
  });

  throw error;
}
