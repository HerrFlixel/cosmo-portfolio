import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
