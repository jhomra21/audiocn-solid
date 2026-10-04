import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const clientDirectory = resolve(import.meta.dirname, "../dist/client");

const files: string[] = [];

const walk = async (directory: string): Promise<void> => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(path);
    } else if (entry.name.endsWith(".html")) {
      files.push(path);
    }
  }
};

await walk(clientDirectory);

const marked: string[] = [];

for (const file of files) {
  const html = await readFile(file, "utf8");

  if (html.includes("data-docs-route-not-yet-ported")) {
    marked.push(
      `/${file
        .slice(clientDirectory.length + 1)
        .replace(/\/index\.html$/, "")
        .replace(/\.html$/, "")}`
    );
  }
}

if (marked.length > 0) {
  throw new Error(
    `Release build contains not-yet-ported routes:\n${marked.join("\n")}`
  );
}
