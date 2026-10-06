/* oxlint-disable eslint/no-await-in-loop -- Capture sequentially so the preview server and browser keep a bounded memory footprint. */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { existsSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import { chromium } from "@playwright/test";
import type { Browser } from "@playwright/test";

import metadata from "../lib/docs/page-metadata.json";
import { getSocialCards } from "../lib/social-catalog";
import type { SocialCardDefinition } from "../lib/social-catalog";

const siteRoot = resolve(import.meta.dirname, "..");

const distDirectory = join(siteRoot, "dist");

const stashedDirectory = join(siteRoot, "dist.before-og");

const outputDirectory = join(siteRoot, "public/og");

const manifestPath = join(siteRoot, "lib/social-images.json");

const verify = process.argv.includes("--verify");

const port = Number(process.env.AUDIOCN_SOCIAL_PORT ?? 4191);

const WIDTH = 1200;

const HEIGHT = 630;

const SETTLE_MS = 1600;

const SETTLE_PASSES = 2;

const REPAINT_MS = 32;

const IMAGE_BUDGET_BYTES = 1_500_000;

const PNG_NAME = /^\/og\/[a-z0-9-]+\.png$/u;

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  throw new Error("AUDIOCN_SOCIAL_PORT must be a port between 1024 and 65535.");
}

const baseUrl = `http://127.0.0.1:${port}`;

interface Capture {
  bytes: Buffer;
  card: SocialCardDefinition;
  filename: string;
}

type Manifest = Record<string, { alt: string; url: string }>;

const run = async (args: string[]) => {
  const child = spawn("bunx", ["--bun", "vite", ...args], {
    cwd: siteRoot,
    stdio: "inherit",
  });

  const [code] = await once(child, "exit");

  if (code !== 0) {
    throw new Error(`vite ${args.join(" ")} exited with ${code}.`);
  }
};

const waitForServer = async (server: ChildProcess) => {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error("The social preview server exited before it was ready.");
    }

    try {
      const response = await fetch(`${baseUrl}/social-preview/home`, {
        signal: AbortSignal.timeout(1000),
      });

      if (response.ok) {
        return;
      }
    } catch {
      // The server is still starting.
    }

    await delay(200);
  }

  throw new Error("The social preview server did not become ready.");
};

const capture = async (
  browser: Browser,
  card: SocialCardDefinition
): Promise<Capture> => {
  const context = await browser.newContext({
    colorScheme: "dark",
    deviceScaleFactor: 1,
    locale: "en-US",
    viewport: { height: HEIGHT, width: WIDTH },
  });

  try {
    const page = await context.newPage();
    const errors: string[] = [];

    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    // Pause before navigation so every mounted signal starts at the same frame.
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    await page.goto(`${baseUrl}/social-preview/${card.id}`, {
      waitUntil: "load",
    });
    await page.locator('[data-social-ready="true"]').waitFor();
    await page
      .locator('[data-social-loaded="false"]')
      .waitFor({ state: "detached" });
    await page.locator("[data-loading]").waitFor({ state: "detached" });

    if (card.preview === "quick-popover") {
      await page
        .getByRole("button", { exact: true, name: "Audio settings" })
        .click({ force: true });
      await page.locator("[data-loading]").waitFor({ state: "detached" });
    }

    // CSS transitions follow the real clock, not the paused one, so a card
    // captured mid-transition would differ from one captured after it.
    await page.addStyleTag({
      content:
        "*, *::before, *::after { animation: none !important; transition: none !important; }",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (image) => image.decode()));
    });

    // Force a native layout and paint before advancing the simulated frame
    // loop. A ResizeObserver can otherwise clear a canvas after its last frame.
    // IntersectionObserver callbacks also arrive in real time, so a meter can
    // start painting partway through the first run; the second run lets every
    // ballistic settle on its target whichever way that race goes.
    for (let pass = 0; pass < SETTLE_PASSES; pass += 1) {
      await page
        .locator("[data-social-card]")
        .screenshot({ animations: "disabled" });
      await page.clock.runFor(SETTLE_MS);
    }

    // Subpixel-positioned parts such as fader thumbs keep whichever raster
    // their last invalidation produced, which varies between loads. Hiding the
    // document for one layout discards it so every capture rasterizes fresh.
    await page.evaluate(() => {
      document.documentElement.style.display = "none";
      document.documentElement.getBoundingClientRect();
      document.documentElement.style.display = "";
    });
    await page.clock.runFor(REPAINT_MS);

    if (errors.length > 0) {
      throw new Error(`${card.id} failed to render: ${errors.join("; ")}`);
    }

    const bytes = await page.locator("[data-social-card]").screenshot({
      animations: "disabled",
      caret: "hide",
      scale: "device",
    });

    if (bytes.readUInt32BE(16) !== WIDTH || bytes.readUInt32BE(20) !== HEIGHT) {
      throw new Error(`${card.id} did not render at ${WIDTH}x${HEIGHT}.`);
    }

    if (bytes.length > IMAGE_BUDGET_BYTES) {
      throw new Error(
        `${card.id} exceeds the ${IMAGE_BUDGET_BYTES} byte budget.`
      );
    }

    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);

    return { bytes, card, filename: `${card.id}-${hash}.png` };
  } finally {
    await context.close();
  }
};

const assertRepeatable = async (
  browser: Browser,
  first: Capture
): Promise<void> => {
  const repeated = await capture(browser, first.card);

  if (first.bytes.equals(repeated.bytes)) {
    return;
  }

  const directory = await mkdtemp(join(tmpdir(), "audiocn-og-"));

  await writeFile(join(directory, `${first.card.id}-first.png`), first.bytes);
  await writeFile(
    join(directory, `${first.card.id}-repeat.png`),
    repeated.bytes
  );

  throw new Error(
    `${first.card.id} changed between two identical captures. Compare the PNGs in ${directory}.`
  );
};

const readPreviousManifest = async (): Promise<Manifest> =>
  existsSync(manifestPath)
    ? JSON.parse(await readFile(manifestPath, "utf8"))
    : {};

const save = async (captures: Capture[]) => {
  const previous = await readPreviousManifest();
  const manifest: Manifest = {};

  await mkdir(outputDirectory, { recursive: true });

  for (const { bytes, card, filename } of captures) {
    await writeFile(join(outputDirectory, filename), bytes);
    manifest[card.pathname] = { alt: card.alt, url: `/og/${filename}` };
  }

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  // Only assets the previous manifest owned are removed, after every capture succeeded.
  const current = new Set(Object.values(manifest).map((image) => image.url));

  for (const image of Object.values(previous)) {
    if (PNG_NAME.test(image.url) && !current.has(image.url)) {
      await rm(join(siteRoot, "public", image.url), { force: true });
    }
  }
};

// The Solid plugin builds into dist/client, so a previous build is set aside
// and put back to keep `bun run build` output intact.
const stash = async () => {
  if (existsSync(distDirectory)) {
    await rm(stashedDirectory, { force: true, recursive: true });
    await rename(distDirectory, stashedDirectory);
  }
};

const restore = async () => {
  await rm(distDirectory, { force: true, recursive: true });

  if (existsSync(stashedDirectory)) {
    await rename(stashedDirectory, distDirectory);
  }
};

const cards = getSocialCards(metadata);

let server: ChildProcess | undefined;

let browser: Browser | undefined;

try {
  await stash();
  await run(["build", "--mode", "social"]);
  server = spawn(
    "bunx",
    [
      "--bun",
      "vite",
      "preview",
      "--mode",
      "social",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    { cwd: siteRoot, stdio: "ignore" }
  );
  await waitForServer(server);
  browser = await chromium.launch({
    // Software rasterization keeps canvas antialiasing identical across captures.
    args: [
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--deterministic-mode",
      "--run-all-compositor-stages-before-draw",
      "--disable-threaded-animation",
      "--disable-threaded-scrolling",
    ],
  });

  const captures: Capture[] = [];

  for (const card of cards) {
    const result = await capture(browser, card);

    if (verify) {
      await assertRepeatable(browser, result);
    }

    captures.push(result);
    console.log(
      `social image: ${card.id} (${captures.length}/${cards.length})${verify ? " verified identical" : ""}`
    );
  }

  await save(captures);
  console.log(`Saved ${captures.length} social images and their manifest.`);
} finally {
  await browser?.close();

  if (server && server.exitCode === null) {
    const stopped = once(server, "exit");

    server.kill("SIGTERM");
    await stopped;
  }

  await restore();
}
