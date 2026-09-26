import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Keine Next-Bildoptimierung: Bildgrößen entstehen beim Upload (Spec §3.3).
  images: { unoptimized: true },
  // globalNotFound: 404 für Anfragen außerhalb von [locale] (z. B. /admin vor Plan 2).
  // inlineCss (Plan 6): CSS (≈ 12 KB gzip) steht im HTML statt als render-blockierende Datei (Lighthouse: LCP 5 → 1,5 s).
  experimental: { globalNotFound: true, inlineCss: true },
  // Alte WordPress-Adressen (Stand 2026-09) auf die neuen Seiten: Links von außen und Suchmaschinen landen richtig.
  // Next entfernt vorher den Schrägstrich am Ende (/biography/ → /biography → /ueber-mich).
  async redirects() {
    return [
      { source: "/biography", destination: "/ueber-mich", permanent: true },
      { source: "/contact-3", destination: "/kontakt", permanent: true },
      { source: "/privacy-policy", destination: "/datenschutz", permanent: true },
      { source: "/cokkie-einstellungen", destination: "/datenschutz", permanent: true },
      { source: "/etv-spieltagsheft", destination: "/floorball", permanent: true },
      { source: "/flv_portfolio/:slug*", destination: "/", permanent: true },
      { source: "/category/:slug*", destination: "/", permanent: true },
      { source: "/blog-minimal", destination: "/", permanent: true },
      { source: "/sample-page", destination: "/", permanent: true },
      { source: "/:year(\\d{4})/:rest*", destination: "/", permanent: true },
      { source: "/:file(wp-sitemap.*)", destination: "/sitemap.xml", permanent: true },
      // Kundenbereich ohne Galerie-Code: zur Eingabeseite (nicht dauerhaft, falls /g später eine eigene Seite bekommt).
      { source: "/g", destination: "/kunden", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/g/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);

// Bindings (D1, R2) auch in `next dev` verfügbar machen.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
