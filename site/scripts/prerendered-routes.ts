import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export const clientDirectory = join(import.meta.dirname, "../dist/client");

const PAGE_MARKER = /\sdata-(?:docs-)?route-not-yet-ported="/;

const ITEM_MARKER = /\sdata-(?:not-yet-ported|docs-ssr-error)="([^"]*)"/g;

export interface PrerenderedRoute {
  route: string;
  html: string;
  /** The whole page is a not-yet-ported placeholder. */
  page: boolean;
  /** Examples and showcase tiles on an otherwise ported page. */
  items: string[];
}

const htmlFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await htmlFiles(path)));
    } else if (entry.name.endsWith(".html")) {
      files.push(path);
    }
  }

  return files;
};

export const readPrerenderedRoutes = async (): Promise<PrerenderedRoute[]> => {
  const routes: PrerenderedRoute[] = [];

  for (const file of await htmlFiles(clientDirectory)) {
    const html = await readFile(file, "utf8");
    const page = PAGE_MARKER.test(html);

    routes.push({
      html,
      items: page
        ? []
        : Array.from(html.matchAll(ITEM_MARKER), ([, item]) => item),
      page,
      route: `/${relative(clientDirectory, file)
        .replace(/(?:^|\/)index\.html$/, "")
        .replace(/\.html$/, "")}`,
    });
  }

  return routes.sort((a, b) => a.route.localeCompare(b.route));
};
