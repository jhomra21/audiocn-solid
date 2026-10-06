import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

import { siteConfig } from "../lib/site";
import socialImages from "../lib/social-images.json" with { type: "json" };
import { readPrerenderedRoutes } from "../scripts/prerendered-routes";

const siteRoot = join(import.meta.dirname, "..");

const clientDirectory = join(siteRoot, "dist/client");

const artifactPath = join(siteRoot, "artifacts/site-metadata.json");

const images: Record<string, { alt: string; url: string } | undefined> =
  socialImages;

const knobDescription =
  "Build accessible rotary controls for Solid with drag, keyboard input, precise adjustments and editable values. Copy and customize the audiocn Knob.";

const cases = [
  {
    description: siteConfig.description,
    path: "/",
    title: siteConfig.title,
    url: siteConfig.url,
  },
  {
    description:
      "Meet the people who build audiocn Solid, audio components built the shadcn way.",
    path: "/contributors",
    title: "Contributors — audiocn Solid",
  },
  {
    description: knobDescription,
    path: "/docs/components/knob",
    title: "Knob for Solid — audiocn Solid",
  },
  {
    description:
      "Read a meter source into Solid state at a low rate, for labels and conditional UI.",
    path: "/docs/hooks/use-level",
    title: "useLevel — audiocn Solid",
  },
  {
    description:
      "Choose and check a microphone, with a live preview, a meter, gain, mute and a level check.",
    path: "/docs/blocks/mic-setup",
    title: "Microphone Setup for Solid — audiocn Solid",
  },
  {
    description:
      "audiocn uses your shadcn theme, plus six audio tokens you can change like any other.",
    path: "/docs/concepts/theming",
    title: "Theming — audiocn Solid",
  },
  {
    description:
      "Browse Solid audio components for shadcn, including level meters, faders, knobs, waveforms, visualizers, mixers and players. Copy the source and make it yours.",
    path: "/docs/components",
    title: "Audio components for Solid — audiocn Solid",
  },
] as const;

const pngSize = (bytes: Buffer) => ({
  height: bytes.readUInt32BE(20),
  width: bytes.readUInt32BE(16),
});

test("every page emits canonical, Open Graph and Twitter tags with its card", async ({
  page,
  request,
}) => {
  const summary: {
    imageUrl: string;
    path: string;
    title: string;
    url: string;
  }[] = [];

  for (const current of cases) {
    await page.goto(current.path);

    const image = images[current.path];

    expect(image, `${current.path} has a social card`).toBeDefined();

    const imageUrl = new URL(image?.url ?? "", siteConfig.url).href;

    const url =
      "url" in current
        ? current.url
        : new URL(current.path, siteConfig.url).href;

    const content = async (selector: string) =>
      page.locator(selector).getAttribute("content");

    await expect(page).toHaveTitle(current.title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      url
    );
    expect(await content('meta[name="description"]')).toBe(current.description);

    const tags = {
      "og:description": current.description,
      "og:image": imageUrl,
      "og:image:alt": image?.alt,
      "og:image:height": "630",
      "og:image:width": "1200",
      "og:locale": "en_US",
      "og:site_name": siteConfig.name,
      "og:title": current.title,
      "og:type": "website",
      "og:url": url,
    };

    for (const [property, value] of Object.entries(tags)) {
      expect(
        await content(`meta[property="${property}"]`),
        `${current.path} ${property}`
      ).toBe(value);
    }

    const twitter = {
      "twitter:card": "summary_large_image",
      "twitter:description": current.description,
      "twitter:image": imageUrl,
      "twitter:image:alt": image?.alt,
      "twitter:title": current.title,
    };

    for (const [name, value] of Object.entries(twitter)) {
      expect(
        await content(`meta[name="${name}"]`),
        `${current.path} ${name}`
      ).toBe(value);
    }

    const response = await request.get(new URL(imageUrl).pathname);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect(pngSize(await response.body())).toEqual({
      height: 630,
      width: 1200,
    });
    summary.push({ imageUrl, path: current.path, title: current.title, url });
  }

  await mkdir(join(siteRoot, "artifacts"), { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(summary, null, 2)}\n`);
  await test.info().attach("page-social-metadata", {
    body: JSON.stringify(summary, null, 2),
    contentType: "application/json",
  });
});

test("the manifest covers every public page with a committed 1200x630 card", async () => {
  const routes = (await readPrerenderedRoutes())
    .map(({ route }) => route)
    .filter((route) => route !== "/404");

  expect(Object.keys(images).sort()).toEqual(routes.sort());
  expect(Object.keys(images)).toHaveLength(57);

  const files = new Set(await readdir(join(siteRoot, "public/og")));

  for (const [pathname, image] of Object.entries(images)) {
    const name = image?.url.replace("/og/", "") ?? "";

    expect(files.has(name), `${pathname} card ${name}`).toBe(true);
    expect(image?.alt, `${pathname} alt text`).toBeTruthy();
    expect(
      pngSize(await readFile(join(siteRoot, "public/og", name))),
      name
    ).toEqual({ height: 630, width: 1200 });
  }
});

test("site icons are linked and resolve", async ({ page, request }) => {
  await page.goto("/");

  const icons = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) =>
      links.map((link) => ({
        href: link.getAttribute("href"),
        rel: link.getAttribute("rel"),
      }))
    );

  expect(icons.map(({ href }) => href).sort()).toEqual([
    "/apple-icon.png",
    "/favicon.ico",
    "/icon.png",
    "/icon.svg",
  ]);
  expect(icons.find(({ href }) => href === "/apple-icon.png")?.rel).toBe(
    "apple-touch-icon"
  );

  for (const { href } of icons) {
    expect((await request.get(href ?? "")).status(), href ?? "").toBe(200);
  }
});

test("dev-only routes are absent from the production output and sitemap", async ({
  page,
}) => {
  await expect(
    access(join(clientDirectory, "social-preview"))
  ).rejects.toThrow();
  await expect(access(join(clientDirectory, "spikes"))).rejects.toThrow();

  const sitemap = await readFile(join(clientDirectory, "sitemap.xml"), "utf8");

  expect(sitemap).not.toMatch(/social-preview|spikes|404/);
  expect(sitemap).toContain(`<loc>${siteConfig.url}/</loc>`);

  for (const url of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    expect(url[1]?.startsWith(siteConfig.url)).toBe(true);
  }

  await page.goto("/social-preview/home");
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible();
  await expect(page.locator("[data-social-card]")).toHaveCount(0);
});

const DEV_ROUTES = ["/social-preview/home", "/spikes/mdx", "/spikes/search"];

for (const route of DEV_ROUTES) {
  test(`${route} is not reachable in the release build`, async ({ page }) => {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible();
    await expect(page.locator("[data-spike], [data-social-card]")).toHaveCount(
      0
    );

    await page.goto("/");
    await page.evaluate(() => {
      Object.assign(window, { clientNavigationMarker: true });
    });
    await page.evaluate((href) => {
      const link = document.createElement("a");

      link.href = href;
      link.id = "dev-route-link";
      link.textContent = "dev route";
      document.body.append(link);
    }, route);
    await page.locator("#dev-route-link").click();
    await expect(
      page.getByRole("heading", { name: "Page not found" })
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    expect(await page.evaluate(() => "clientNavigationMarker" in window)).toBe(
      true
    );
  });
}

test("the release client bundle registers no dev-only routes", async () => {
  const assets = join(clientDirectory, "assets");

  for (const file of await readdir(assets)) {
    if (!file.endsWith(".js")) continue;

    const source = await readFile(join(assets, file), "utf8");

    expect(source, file).not.toMatch(
      /spikes\/(mdx|search)|data-spike|social-preview/
    );
  }
});
