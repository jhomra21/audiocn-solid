import { expect, test } from "@playwright/test";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const clientDirectory = join(import.meta.dirname, "../dist/client");

const artifactPath = join(import.meta.dirname, "../artifacts/routes.json");

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

test("prerendered routes have content and a recorded status", async ({
  page,
}) => {
  const files = await htmlFiles(clientDirectory);
  const routes = [];

  for (const file of files) {
    const html = await readFile(file, "utf8");

    const routePath = relative(clientDirectory, file)
      .replace(/\/index\.html$/, "")
      .replace(/\.html$/, "");

    const route = routePath === "index" ? "/" : `/${routePath}`;
    const body = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
    const routeMarker = html.includes("data-docs-route-not-yet-ported");
    const exampleMarker = html.includes("data-not-yet-ported");
    expect(body.trim(), `${route} has an empty prerendered body`).not.toBe("");
    routes.push({
      route,
      status: routeMarker ? "not-yet-ported" : "ported",
    });

    if (route.startsWith("/docs/")) {
      await page.goto(route);
      await expect(page.locator("body")).not.toBeEmpty();

      if (routeMarker) {
        await expect(
          page.locator("[data-docs-route-not-yet-ported]")
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Read the upstream documentation" })
        ).toBeVisible();
      }

      if (exampleMarker) {
        await expect(page.locator("[data-not-yet-ported]").first()).toBeVisible();
      }
    }
  }

  await mkdir(join(import.meta.dirname, "../artifacts"), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(routes, null, 2)}\n`);
});
