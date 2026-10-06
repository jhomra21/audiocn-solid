import {
  cp,
  lstat,
  mkdir,
  readdir,
  realpath,
  symlink,
  unlink,
} from "node:fs/promises";
import { join } from "node:path";

import { defineConfig, mergeConfig } from "vite";
import type { ConfigEnv } from "vite";

import base from "./vite.config.ts";

// Solid's preview handler and persisted asset manifest use dist/ relative to
// root. Give the test build its own root rather than overriding only outDir.
const root = "/tmp/audiocn-search-ai/site";

export default defineConfig(async (env: ConfigEnv) => {
  await mkdir(root, { recursive: true });

  for (const entry of ["app", "components", "hooks", "lib", "node_modules"]) {
    try {
      await symlink(
        join(import.meta.dirname, "..", entry),
        join(root, "..", entry)
      );
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      )
        throw error;
    }
  }

  const source = join(root, "src");

  if (
    await lstat(source).then(
      (entry) => entry.isSymbolicLink(),
      () => false
    )
  )
    await unlink(source);
  await cp(join(import.meta.dirname, "src"), source, { recursive: true });

  for (const entry of await readdir(import.meta.dirname)) {
    if (
      entry === "src" ||
      entry.startsWith("dist") ||
      entry === "artifacts" ||
      entry === "test-results"
    )
      continue;

    try {
      await symlink(join(import.meta.dirname, entry), join(root, entry));
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "EEXIST")
      )
        throw error;
    }
  }

  return mergeConfig(await base(env), {
    root,
    cacheDir:
      process.env.AUDIOCN_AI_DEV === "1"
        ? `/tmp/audiocn-ai-dev-cache-${process.pid}`
        : join(root, ".vite"),
    server: {
      host: "127.0.0.1",
      port: 4400,
      strictPort: true,
      fs: { allow: [await realpath(root), join(import.meta.dirname, "..")] },
    },
  });
});
