import { siteConfig } from "./site";
import socialImages from "./social-images.json";

export interface SocialImage {
  alt: string;
  url: string;
}

export interface PageMetadataOptions {
  title: string;
  pathname: string;
  description?: string;
  image?: SocialImage;
}

export interface PageMetadata {
  canonical: string;
  description: string;
  image: SocialImage & { height: number; width: number };
  title: string;
}

const images: Record<string, SocialImage | undefined> = socialImages;

const defaultImage: SocialImage = socialImages["/"];

export const getPageMetadata = ({
  title,
  pathname,
  description = siteConfig.description,
  image = images[pathname] ?? defaultImage,
}: PageMetadataOptions): PageMetadata => ({
  canonical:
    pathname === "/" ? siteConfig.url : new URL(pathname, siteConfig.url).href,
  description,
  image: {
    alt: image.alt,
    height: 630,
    url: new URL(image.url, siteConfig.url).href,
    width: 1200,
  },
  title: pathname === "/" ? siteConfig.title : `${title} — ${siteConfig.name}`,
});
