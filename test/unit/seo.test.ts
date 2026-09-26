import { describe, expect, it } from "vitest";
import { DEFAULT_OG_IMAGE, pageMetadata, portfolioOgImage } from "@/lib/seo/metadata";
import { jsonLdScript, personJsonLd } from "@/lib/seo/person";
import { robotsRules } from "@/lib/seo/robots";
import { sitemapEntries } from "@/lib/seo/sitemap";
import { languageAlternates, localizedUrl } from "@/lib/seo/urls";
import { SETTINGS_DEFAULTS } from "@/lib/settings/schema";
import { SITE_URL } from "@/lib/site";

describe("localizedUrl", () => {
  it("Deutsch ohne Präfix, Englisch mit /en und lokalisiertem Pfad", () => {
    expect(localizedUrl("/", "de")).toBe(SITE_URL);
    expect(localizedUrl("/", "en")).toBe(`${SITE_URL}/en`);
    expect(localizedUrl("/hochzeiten", "de")).toBe(`${SITE_URL}/hochzeiten`);
    expect(localizedUrl("/hochzeiten", "en")).toBe(`${SITE_URL}/en/weddings`);
    expect(localizedUrl("/floorball", "en")).toBe(`${SITE_URL}/en/floorball`);
  });

  it("hreflang-Paar mit x-default = Deutsch", () => {
    expect(languageAlternates("/fussball")).toEqual({
      de: `${SITE_URL}/fussball`,
      en: `${SITE_URL}/en/football`,
      "x-default": `${SITE_URL}/fussball`,
    });
  });
});

describe("pageMetadata", () => {
  it("setzt Canonical, hreflang, Open Graph und Twitter-Karte", () => {
    const meta = pageMetadata({ path: "/kontakt", locale: "en", title: "Contact", description: "Write to me." });
    expect(meta.title).toBe("Contact");
    expect(meta.description).toBe("Write to me.");
    expect(meta.alternates?.canonical).toBe(`${SITE_URL}/en/contact`);
    expect(meta.alternates?.languages).toEqual(languageAlternates("/kontakt"));
    expect(meta.openGraph).toMatchObject({
      type: "website",
      siteName: "Cosmo Photos",
      url: `${SITE_URL}/en/contact`,
      title: "Contact · Cosmo Photos",
      locale: "en_US",
      alternateLocale: ["de_DE"],
      images: [DEFAULT_OG_IMAGE],
    });
    expect(meta.twitter).toMatchObject({ card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] });
  });

  it("Startseite: Titel ohne Zusatz, eigenes Bild", () => {
    const image = { url: `${SITE_URL}/media/portfolio/x/1600`, width: 1600, height: 1067, alt: "Hero" };
    const meta = pageMetadata({ path: "/", locale: "de", title: "Cosmo Photos · Sportfotografie aus Hamburg", absoluteTitle: true, description: "…", image });
    expect(meta.title).toEqual({ absolute: "Cosmo Photos · Sportfotografie aus Hamburg" });
    expect(meta.openGraph).toMatchObject({ title: "Cosmo Photos · Sportfotografie aus Hamburg", locale: "de_DE", images: [image] });
  });

  it("Portfolio-Bild: 1600er-Größe mit echten Maßen, kleine Originale nicht vergrößert", () => {
    expect(portfolioOgImage({ id: "a", width: 3000, height: 2000 }, "Floorball")).toEqual({
      url: `${SITE_URL}/media/portfolio/a/1600`,
      width: 1600,
      height: 1067,
      alt: "Floorball",
    });
    expect(portfolioOgImage({ id: "b", width: 1200, height: 800 }, "x")).toMatchObject({ width: 1200, height: 800 });
  });
});

describe("personJsonLd", () => {
  it("Person mit Ort; Porträt und Instagram nur, wenn hinterlegt", () => {
    const bare = personJsonLd(SETTINGS_DEFAULTS, "de");
    expect(bare).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Person",
      name: "Felix Vatterodt",
      alternateName: "Cosmo Photos",
      jobTitle: "Fotograf",
      url: SITE_URL,
      address: { "@type": "PostalAddress", addressLocality: "Hamburg", addressCountry: "DE" },
    });
    expect(bare).not.toHaveProperty("image");
    expect(bare).not.toHaveProperty("sameAs");

    const full = personJsonLd(
      { ...SETTINGS_DEFAULTS, about_portrait_id: "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d", instagram_url: "https://www.instagram.com/cosmo.photos_/" },
      "en",
    );
    expect(full).toMatchObject({
      jobTitle: "Photographer",
      url: `${SITE_URL}/en`,
      image: `${SITE_URL}/media/site/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/1600`,
      sameAs: ["https://www.instagram.com/cosmo.photos_/"],
    });
  });

  it("JSON-LD kann das Skript-Element nicht schließen", () => {
    expect(jsonLdScript({ text: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("robotsRules", () => {
  it("Hauptdomain: alles außer Admin, Galerien und API; Sitemap", () => {
    expect(robotsRules(true)).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/g/", "/api/"] },
      sitemap: `${SITE_URL}/sitemap.xml`,
    });
  });

  it("Zweitadresse: nichts", () => {
    expect(robotsRules(false)).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("sitemapEntries", () => {
  it("jede öffentliche Seite in beiden Sprachen, jeweils mit hreflang-Paar, ohne Galerien", () => {
    const entries = sitemapEntries();
    expect(entries).toHaveLength(22);
    expect(entries).toContainEqual(
      expect.objectContaining({ url: `${SITE_URL}/en/weddings`, alternates: { languages: languageAlternates("/hochzeiten") } }),
    );
    expect(entries.some((entry) => entry.url.includes("/g/"))).toBe(false);
  });
});
