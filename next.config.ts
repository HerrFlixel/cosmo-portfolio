import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keine Next-Bildoptimierung: Bildgrößen entstehen beim Upload (Spec §3.3).
  images: { unoptimized: true },
};

export default nextConfig;

// Bindings (D1, R2) auch in `next dev` verfügbar machen.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
