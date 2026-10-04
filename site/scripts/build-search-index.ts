import { create, insertMultiple, save, type RawData } from "@orama/orama";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import {
  searchSchema,
  type SearchDocument,
} from "../lib/search-schema.ts";

interface SearchIndexPayload {
  version: 1;
  documents: number;
  index: RawData;
}

const siteRoot = resolve(import.meta.dirname, "..");

const docsRoot = join(siteRoot, "content", "docs");

const outputPath = join(siteRoot, "public", "search-index.json");

const readDocs = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await readDocs(path)));
    } else if (entry.name.endsWith(".mdx")) {
      files.push(path);
    }
  }

  return files;
};

const frontmatterValue = (frontmatter: string, name: string): string => {
  const match = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));

  if (!match?.[1]) {
    return "";
  }

  return match[1].trim().replace(/^["']|["']$/g, "");
};

const documentUrl = (path: string): string => {
  const relativePath = relative(docsRoot, path)
    .split(sep)
    .join("/")
    .replace(/\\.mdx$/, "");

  const route =
    relativePath === "index"
      ? ""
      : relativePath.endsWith("/index")
        ? relativePath.slice(0, -"/index".length)
        : relativePath;

  return `/docs/${route}`.replace(/\\/$/, "") || "/docs";
};

const parseDocument = async (path: string): Promise<SearchDocument> => {
  const source = await readFile(path, "utf8");
  const match = source.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---\\r?\\n?/);

  if (!match?.[1]) {
    throw new Error(`Missing frontmatter in ${relative(siteRoot, path)}.`);
  }

  const title = frontmatterValue(match[1], "title");
  const description = frontmatterValue(match[1], "description");

  if (!title || !description) {
    throw new Error(
      `Missing title or description in ${relative(siteRoot, path)}.`
    );
  }

  const url = documentUrl(path);

  return {
    id: url,
    title,
    description,
    content: source.slice(match[0].length),
    url,
  };
};

const files = (await readDocs(docsRoot)).sort();

const documents = await Promise.all(files.map(parseDocument));

const database = create({ schema: searchSchema });

await insertMultiple(database, documents);

const payload: SearchIndexPayload = {
  version: 1,
  documents: documents.length,
  index: save(database),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\\n`);

console.log(
  `Built search index with ${documents.length} document${documents.length === 1 ? "" : "s"}.`
);
