import { describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import metadata from "./docs/page-metadata.json";
import { componentPreviews, getSocialCards } from "./social-catalog";
import socialImages from "./social-images.json";

const publicDirectory = join(import.meta.dirname, "../public");

const images: Record<string, { alt: string; url: string } | undefined> =
  socialImages;

const docsPages = metadata.map((page) => page.url);

const publicPages = ["/", "/contributors", ...docsPages];

const socialCards = getSocialCards(metadata);

describe("social image assets", () => {
  it("covers every public page and gives each component its own preview", () => {
    expect(Object.keys(images).sort()).toEqual([...publicPages].sort());

    for (const pathname of docsPages.filter((url) =>
      url.startsWith("/docs/components/")
    )) {
      expect(componentPreviews).toHaveProperty(
        pathname.split("/").at(-1) ?? ""
      );
    }
  });

  it("has unique capture IDs and page URLs", () => {
    expect(new Set(socialCards.map((card) => card.id)).size).toBe(
      socialCards.length
    );
    expect(new Set(socialCards.map((card) => card.pathname)).size).toBe(
      socialCards.length
    );
  });

  for (const card of socialCards) {
    it(`ships a valid, versioned image for ${card.pathname}`, () => {
      const image = images[card.pathname];

      expect(image).toBeDefined();

      if (!image) {
        return;
      }

      expect(image.alt.length).toBeGreaterThan(30);

      const bytes = readFileSync(join(publicDirectory, image.url.slice(1)));

      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toEqual([
        1200, 630,
      ]);
      expect(bytes.length).toBeLessThanOrEqual(1_500_000);

      const hash = createHash("sha256")
        .update(bytes)
        .digest("hex")
        .slice(0, 12);

      expect(image.url).toBe(`/og/${card.id}-${hash}.png`);
    });
  }
});
