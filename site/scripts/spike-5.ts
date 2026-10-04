import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

interface SearchIndexPayload {
  version: number;
  documents: number;
}

interface SpikeResult {
  pass: boolean;
  stage: string;
  upstreamSha: string;
  evidence?: {
    indexBytes: number;
    documents: number;
    queries: string[];
  };
  error?: string;
}

const siteRoot = resolve(import.meta.dirname, "..");

const artifactPath = join(siteRoot, "artifacts", "spike-5.json");

const indexPath = join(siteRoot, "public", "search-index.json");

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

const writeResult = async (result: SpikeResult) => {
  await mkdir(dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\\n`);
};

let stage = "search-index";

try {
  run(stage, "bun", ["run", "scripts/build-search-index.ts"]);

  const payload = JSON.parse(
    await readFile(indexPath, "utf8")
  ) as SearchIndexPayload;

  if (payload.version !== 1 || payload.documents < 1) {
    throw new Error("Generated search index has no documents.");
  }

  stage = "typecheck";
  run(stage, "bunx", ["tsc", "--noEmit"]);

  stage = "build";
  run(stage, "bunx", ["vite", "build"]);

  const builtIndex = join(siteRoot, "dist", "client", "search-index.json");

  const indexStats = await stat(builtIndex);

  if (indexStats.size < 1) {
    throw new Error("Prerendered client output has an empty search index.");
  }

  stage = "static-search";
  run(stage, "bunx", ["playwright", "test", "e2e/spike-5.spec.ts"]);

  await writeResult({
    pass: true,
    stage: "complete",
    upstreamSha: "199b0b83e9ea175006bb2d86b529a3287e1fc4f6",
    evidence: {
      indexBytes: indexStats.size,
      documents: payload.documents,
      queries: ["Level Meter", "ballistics"],
    },
  });
} catch (error) {
  await writeResult({
    pass: false,
    stage,
    upstreamSha: "199b0b83e9ea175006bb2d86b529a3287e1fc4f6",
    error: error instanceof Error ? error.message : String(error),
  });

  throw error;
}
