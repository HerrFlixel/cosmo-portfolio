import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Nur die Hauptdomain wird gecrawlt (Galerien und Admin nie); Zweitadressen sperren alles (Task 1: noindex). */
export function robotsRules(indexable: boolean): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/g/", "/api/"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
