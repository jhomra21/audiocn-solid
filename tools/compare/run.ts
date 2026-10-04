import { spawn } from "node:child_process";
import { once } from "node:events";

const build = spawn("bun", ["run", "build"], {
  cwd: new URL("../../site", import.meta.url),
  stdio: "inherit",
});

const [buildCode] = await once(build, "close");

if (buildCode !== 0) {
  throw new Error(`Site build exited with ${String(buildCode)}.`);
}

const preview = spawn(
  "bunx",
  ["vite", "preview", "--host", "127.0.0.1", "--port", "4180"],
  {
    cwd: new URL("../../site", import.meta.url),
    stdio: "inherit",
  }
);

const viewer = spawn(
  "bun",
  [
    "-e",
    "Bun.serve({ port: 4181, fetch: () => new Response(Bun.file('tools/compare/index.html')) });",
  ],
  { cwd: new URL("../..", import.meta.url), stdio: "inherit" }
);

console.info("Comparison viewer: http://127.0.0.1:4181");

const stop = () => {
  preview.kill("SIGTERM");
  viewer.kill("SIGTERM");
};

process.on("SIGINT", stop);

process.on("SIGTERM", stop);
