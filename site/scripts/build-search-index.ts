import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import { create, insertMultiple, save, type RawData } from "@orama/orama";

import { searchSchema, type SearchDocument } from "../lib/search-schema";

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

  const value = match[1].trim();
  const first = value[0];
  const last = value.at(-1);

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
};

const documentUrl = (path: string): string => {
  const platformPath = relative(docsRoot, path).split(sep).join("/");

  const relativePath = platformPath.endsWith(".mdx")
    ? platformPath.slice(0, -".mdx".length)
    : platformPath;

  const route =
    relativePath === "index"
      ? ""
      : relativePath.endsWith("/index")
        ? relativePath.slice(0, -"/index".length)
        : relativePath;

  const url = `/docs/${route}`;

  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const parseDocument = async (path: string): Promise<SearchDocument> => {
  const source = (await readFile(path, "utf8")).replaceAll("\r\n", "\n");

  if (!source.startsWith("---\n")) {
    throw new Error(`Missing frontmatter in ${relative(siteRoot, path)}.`);
  }

  const closingMarker = "\n---\n";
  const frontmatterEnd = source.indexOf(closingMarker, 4);

  if (frontmatterEnd === -1) {
    throw new Error(`Missing frontmatter end in ${relative(siteRoot, path)}.`);
  }

  const frontmatter = source.slice(4, frontmatterEnd);
  const title = frontmatterValue(frontmatter, "title");
  const description = frontmatterValue(frontmatter, "description");

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
    content: source.slice(frontmatterEnd + closingMarker.length),
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

await writeFile(outputPath, `${JSON.stringify(payload)}\n`);

console.log(
  `Built search index with ${documents.length} document${documents.length === 1 ? "" : "s"}.`
);
