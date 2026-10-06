import { spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

interface SearchIndexSummary {
  version: 1;
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

const isSearchIndexSummary = (value: unknown): value is SearchIndexSummary => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "version" in value &&
    value.version === 1 &&
    "documents" in value &&
    typeof value.documents === "number" &&
    value.documents > 0
  );
};

const run = (stage: string, command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: siteRoot,
    env: { ...process.env, AUDIOCN_SPIKE: "1" },
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
  await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`);
};

let stage = "search-index";

try {
  run(stage, "bun", ["run", "scripts/build-search-index.ts"]);

  const payload: unknown = JSON.parse(await readFile(indexPath, "utf8"));

  if (!isSearchIndexSummary(payload)) {
    throw new Error("Generated search index has no documents.");
  }

  stage = "typecheck";
  run(stage, "bunx", ["tsc", "--noEmit"]);

  stage = "build";
  run(stage, "bunx", ["vite", "build", "--mode", "spike"]);

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
    upstreamSha: "9598cf2abbcf0dc844e61d77d18af46a6d17e8a9",
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
    upstreamSha: "9598cf2abbcf0dc844e61d77d18af46a6d17e8a9",
    error: error instanceof Error ? error.message : String(error),
  });

  throw error;
}
