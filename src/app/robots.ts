import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { robotsRules } from "@/lib/seo/robots";
import { hostPolicy } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  return robotsRules(hostPolicy(new URL(`https://${host}`)).indexable);
}
