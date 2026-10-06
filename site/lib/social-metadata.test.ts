import { describe, expect, it } from "bun:test";

import { siteConfig } from "./site";
import { getPageMetadata } from "./social-metadata";

describe("page metadata", () => {
  it("uses the homepage's descriptive title without adding a second brand", () => {
    const metadata = getPageMetadata({ pathname: "/", title: "audiocn" });

    expect(metadata.title).toBe(siteConfig.title);
    expect(metadata.canonical).toBe(siteConfig.url);
  });

  it("gives a nested page its own absolute canonical and social URL", () => {
    const metadata = getPageMetadata({
      description: "A stereo level meter.",
      pathname: "/docs/components/level-meter",
      title: "Level Meter for Solid",
    });

    expect(metadata.canonical).toBe(
      `${siteConfig.url}/docs/components/level-meter`
    );
    expect(metadata.title).toBe(`Level Meter for Solid — ${siteConfig.name}`);
    expect(metadata.description).toBe("A stereo level meter.");
  });

  it("shares the requested image and its accessible description across networks", () => {
    const metadata = getPageMetadata({
      image: {
        alt: "Two stereo meters with peak hold.",
        url: "/og/meters.png",
      },
      pathname: "/docs/components/level-meter",
      title: "Level Meter for Solid",
    });

    expect(metadata.image).toEqual({
      alt: "Two stereo meters with peak hold.",
      height: 630,
      url: `${siteConfig.url}/og/meters.png`,
      width: 1200,
    });
  });
});
