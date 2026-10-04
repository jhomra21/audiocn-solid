import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const registryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);

export const run = async (
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

export const waitForServer = async (url: string): Promise<void> => {
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
