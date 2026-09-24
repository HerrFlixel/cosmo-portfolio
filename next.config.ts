import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keine Next-Bildoptimierung: Bildgrößen entstehen beim Upload (Spec §3.3).
  images: { unoptimized: true },
  // 404 für Anfragen außerhalb von [locale] (z. B. /admin vor Plan 2)
  experimental: { globalNotFound: true },
};

export default withNextIntl(nextConfig);

// Bindings (D1, R2) auch in `next dev` verfügbar machen.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
