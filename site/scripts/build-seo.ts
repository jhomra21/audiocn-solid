import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { siteConfig } from "../lib/site";

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

const cleanText = (html: string): string =>
  html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replace(/\s+/gu, " ")
    .trim();

await walk(siteRoot);

const pages = await Promise.all(
  htmlFiles.map(async (file) => {
    const html = await readFile(file, "utf8");

    const relativePath = file.slice(siteRoot.length + 1);

    const pathname =
      relativePath === "index.html"
        ? "/"
        : `/${relativePath
            .replace(/\/index\.html$/u, "")
            .replace(/\.html$/u, "")}`;

    const title =
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? siteConfig.name;

    const metaDescription = html.match(
      /<meta\b[^>]*\bname="description"[^>]*>/iu
    )?.[0];

    const description =
      metaDescription?.match(/\bcontent="([^"]*)"/iu)?.[1] ?? "";

    return {
      description,
      pathname,
      text: cleanText(html),
      title,
    };
  })
);

const docs = pages.filter(({ pathname }) => pathname.startsWith("/docs"));

const fullText = docs
  .map(({ pathname, text, title }) => `# ${title} (${pathname})\n\n${text}`)
  .join("\n\n");

const llms = [
  `# ${siteConfig.name}`,
  "",
  `> ${siteConfig.description}`,
  "",
  `Install components with the shadcn CLI after adding "${siteConfig.registryNamespace}" to registries in components.json.`,
  "",
  "## Docs",
  "",
  ...docs.map(
    ({ description, pathname, title }) =>
      `- [${title}](https://www.audiocn.dev${pathname}): ${description}`
  ),
  "",
].join("\n");

const urls = [
  "https://www.audiocn.dev/",
  "https://www.audiocn.dev/contributors",
  ...docs.map(({ pathname }) => `https://www.audiocn.dev${pathname}`),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`;

await Promise.all([
  writeFile(join(siteRoot, "llms.txt"), llms),
  writeFile(join(siteRoot, "llms-full.txt"), `${fullText}\n`),
  writeFile(join(siteRoot, "sitemap.xml"), sitemap),
  writeFile(
    join(siteRoot, "robots.txt"),
    "User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://www.audiocn.dev/sitemap.xml\n"
  ),
]);
