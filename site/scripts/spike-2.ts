import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

interface SpikeResult {
  error?: string;
  pass: boolean;
  stage: string;
  upstreamSha?: string;
}

const siteRoot = resolve(import.meta.dirname, "..");

const artifactPath = resolve(siteRoot, "artifacts", "spike-2.json");

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

let stage = "typecheck";

try {
  run(stage, "bunx", ["tsc", "--noEmit"]);

  stage = "build";

  run(stage, "bunx", ["vite", "build", "--mode", "spike"]);

  stage = "prerender-and-hydration";

  run(stage, "bunx", ["playwright", "test", "e2e/spike-2.spec.ts"]);

  await writeResult({
    pass: true,
    stage: "complete",
    upstreamSha: "9598cf2abbcf0dc844e61d77d18af46a6d17e8a9",
  });
} catch (error) {
  await writeResult({
    error: error instanceof Error ? error.message : String(error),
    pass: false,
    stage,
  });

  throw error;
}
