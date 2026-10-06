import { readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "../lib/site";
import { buildDocsMarkdown } from "./build-docs-markdown";

const siteRoot = join(import.meta.dirname, "../dist/client");

const htmlFiles: string[] = [];

const walk = async (directory: string): Promise<void> => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await walk(path);
    } else if (entry.name.endsWith(".html")) {
      htmlFiles.push(path);
    }
  }
};

await walk(siteRoot);

const docs = htmlFiles.flatMap((file) => {
  const relativePath = file.slice(siteRoot.length + 1);
  const pathname = `/${relativePath.replace(/\/index\.html$/u, "").replace(/\.html$/u, "")}`;

  return pathname.startsWith("/docs") ? [pathname] : [];
});

const urls = [
  `${siteConfig.url}/`,
  `${siteConfig.url}/contributors`,
  ...docs.map((pathname) => `${siteConfig.url}${pathname}`),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;

await Promise.all([
  buildDocsMarkdown(siteRoot),
  writeFile(join(siteRoot, "sitemap.xml"), sitemap),
  writeFile(
    join(siteRoot, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${siteConfig.url}/sitemap.xml\n`
  ),
]);
