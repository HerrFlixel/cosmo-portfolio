# Plan 4 · Öffentliche Seiten: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Die öffentliche Seite bekommt ihre echte Gestalt, zunächst statisch (Spec §14, Phase 4):
- Kopf, Menü und Fußzeile mit dem Logo
- Startseite mit Hero-Collage, Kategorie-Index, fünf „Einlauf“-Kapiteln, Über-mich-Teaser und Abschluss
- Kategorieseiten mit Passepartout-Spalten, Kategorie-Pille und Lightbox „Licht aus“
- Über mich, Kontakt (Formular mit Turnstile und Resend), Kundenbereich (Galerie-Code), Impressum, Datenschutz, gestaltete 404

**Architektur:**
- **Daten:** Alle Seiten lesen bei jeder Anfrage aus D1 (Portfolio aus Plan 2, Texte aus `settings`). Ein kleiner Daten-Layer (`src/lib/public/*`) bündelt das:
  - `connection()` macht die Seiten dynamisch.
  - `cache()` verhindert doppelte Abfragen pro Anfrage.
- **Bilder:** kommen über die bestehende Route `/media/portfolio/<id>/<size>` mit echtem `srcset` (tatsächliche Breiten, nie vergrößert).
- **Komponenten:**
  - Server-Komponenten für alles Statische.
  - Client-Inseln nur dort, wo es Interaktion braucht: Menü, Sprachumschalter, Bild-Einblendung, Lightbox, Pille, Formulare.
  - Bewegung (Intro, Lenis, ScrollTrigger, Parallaxe, Übergänge, Cursor) kommt in Plan 5; die Struktur hier ist dafür vorbereitet (einzelne Logo-Pfade, `data-chapter`, Spalten).

**Tech-Stack:** wie Plan 1–3. Keine neuen npm-Pakete: Turnstile lädt sein Skript nur auf der Kontaktseite, Resend wird per `fetch` aufgerufen.

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`
- Betroffen: §3.1 (Mail, Turnstile, Rate-Limit), §3.2 (Routen), §4 (Designsystem, Passepartout), §5.1 (Logo-Varianten), §6.1–6.3 und 6.5, §10 (Qualität).
- Aus Plan 2 übernommen: `srcset`-Breiten = `min(Größe, längste Kante)`; Hero und Kapitel nur aus sichtbaren Bildern.
- Aus Plan 3 übernommen: `/kunden` mit Feld „Galerie-Code“.

**Design-Einordnung:** Portfolio eines Sport- und Hochzeitsfotografen für Teams, Brautpaare und Partner, in editorialer „Licht aus“-Sprache:
- **Schriften:** Bodoni für Aussagen, schmale kursive Archivo für Kategorien, Martian Mono für Zähler.
- **Flächen:** helles Papier mit dunklen Hallen-Momenten.
- **Formen:** Passepartouts eckig, Bedienelemente (Buttons, Pille) als volle Pille.
- **Regler:** Varianz 8, Bewegung 7 (erst Plan 5), Dichte 3.

## Planreihe

| Plan | Phase | Status |
|---|---|---|
| 1 · Fundament | Setup, Datenbank, Routing, Tokens, Deploy | ✅ erledigt |
| 2 · Admin-Kern | Login, Upload-Pipeline, Portfolio, Texte | ✅ erledigt |
| 3 · Kundengalerien | Galerien, Passwort, Favoriten, Statistik, ZIP | ✅ erledigt |
| **4 · Öffentliche Seiten** | Start, Kategorien, Lightbox, Über mich, Kontakt, Kunden, Pflichtseiten | **dieser Plan** |
| 5 · Bewegung | Intro „Orbit“, Lenis, „Licht aus“, Parallaxe, Übergänge, Mikro-Interaktionen | folgt |
| 6 · Launch | SEO, Performance, Barrierefreiheit, Domain-Umzug | folgt |

## Globale Vorgaben

- **Regeln aus Plan 1–3 bleiben gültig:**
  - Repo `/Volumes/CosmoDev/cosmo-website`, Branch `main`
  - `npm install --save-exact` + `npm run deps:lock` (hier nicht nötig: keine neuen Pakete)
  - Edge-`middleware.ts`, `custom-worker.ts`
  - Unit-Tests in workerd, E2E gegen `preview:e2e`, Admin-Aktionen in E2E mit `ADMIN_STATE`
  - Jede `"use server"`-Datei ruft `requireAdmin()`, außer sie steht in der Ausnahmeliste.
  - `alert`-Prüfungen eingegrenzt (`main`/`form`)
- **Farben:** nur die Tokens aus Spec §4.1, dazu **ein** neuer Token `alert` (`#B8241A`) für Fehlertexte. `signal` erreicht auf Papier nur ≈ 3,2:1, `alert` ≈ 5,5:1 (WCAG AA, Spec §10).
- **Texte:** Kein Em-Dash (`—`) und kein Halbgeviertstrich als Trenner in sichtbaren Texten; Pfeile `→`/`↗` sind `aria-hidden`.
- **Schichten (z-index):** Kopf 20, Kategorie-Pille 30, Menü und Lightbox 50, Sprunglink 60. Keine anderen z-Werte.
- **Bilder:** immer mit `width`/`height` bzw. `aspect-ratio` (kein Layout-Sprung), Hauptfarbton als Platzhalter; nur das erste Hero-Bild lädt sofort (`fetchpriority="high"`), alle anderen `loading="lazy"`.
- **Sprachen:**
  - Jede sichtbare Zeichenkette kommt aus `src/messages/{de,en}.json` oder aus den Einstellungen.
  - Leere englische Einstellungen fallen auf den englischen Standardtext zurück, nicht auf den deutschen.
- **Kontakt-Secrets:** `RESEND_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL`, optional `CONTACT_FROM`.
  - Fehlt eins davon, zeigt die Kontaktseite statt des Formulars die Mail-Adresse.
  - `RESEND_API_KEY=log` protokolliert nur (lokal, E2E, Vorschau).
- Commit-Messages im Conventional-Commits-Stil mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 👤 = Felix.

## Bewusste Abweichungen von der Spec

| Spec | Plan | Grund |
|---|---|---|
| §4.1: sieben Farb-Tokens | zusätzlich `alert` für Fehlermeldungen | `signal` besteht WCAG AA auf Papier nicht (§10 geht vor) |
| §6.1: fünf Kapitel | Kapitel nur für Kategorien mit sichtbaren Bildern; der Index zeigt immer alle fünf mit Zähler | Ein leeres „Einlauf“-Kapitel sähe kaputt aus |
| §6.1: Hero-Collage aus 3 Hero-Bildern | ohne gewählte Hero-Bilder springen die Kapitelbilder ein | Die Startseite wirkt nie leer, auch vor der Kuratierung |
| §6.1 „Licht aus“ als Scroll-Effekt | statisch: jedes Kapitel hat ein dunkles Band (Hallenschwarz) mit Bild, Titel, Zähler | Plan 5 fixiert und blendet; ohne Bewegung (und bei Reduced Motion) bleibt diese Form |
| §6.3 Über mich: Porträt `brand/portrait-felix.jpg` | Porträt aus dem Admin („Porträt wählen“), ohne Porträt läuft das Layout einspaltig | Die Datei ist 4,9 MB groß; im Admin wird sie in Web-Größen umgerechnet (👤 Felix lädt sie dort hoch) |
| §6.3 Kontakt, Absender | bis zur Domain-Prüfung (Plan 6) sendet Resend von `onboarding@resend.dev` an die Adresse des Resend-Kontos | Resend verschickt ohne geprüfte Domain nur an das eigene Konto |
| Design-Skill: Dark Mode | kein System-Dark-Mode | Das Konzept „Licht aus“ setzt das Dunkel bewusst ein; ein zweites Farbschema würde es verwässern |

## Review-Fokus

1. **Neue, leere oder kaum gefüllte Seite:**
   - ohne Bilder, ohne Hero-Wahl, eine Kategorie leer, Einstellungen leer
   - Erwartung: Startseite, Kategorien, Pille, Über mich, Impressum wirken gewollt, nie kaputt, nie mit leeren Rahmen
   - *Tests: Task 1 (`public-content`), Task 3/4/5 (E2E mit Leerzuständen).*
2. **Lange oder ungewöhnliche Inhalte:**
   - lange Headlines, lange Mail-Adressen, viele Referenzen
   - Rechtstexte mit Links und Überschriften
   - fehlende Alt-Texte, Hochformat-Bilder, winzige Originale
   - Erwartung: nichts läuft aus dem Bild; Alt-Texte haben einen sinnvollen Ersatz; `srcset` ohne doppelte Breiten
   - *Tests: Task 1 (`public-images`, `public-text`).*
3. **Tastatur und Screenreader:**
   - Sprunglink
   - Menü als Dialog mit Fokus-Rückgabe
   - Lightbox mit Pfeiltasten, ESC und Fokus-Rückgabe
   - Pille mit `aria-expanded`
   - Formularfehler am Feld (`aria-describedby`)
   - *Tests: Task 2 (`site-frame`), Task 4 (Lightbox, Pille), Task 6 (Kontakt).*
4. **Kontaktformular unter Missbrauch und Ausfall:**
   - Honeypot, Rate-Limit, Turnstile schlägt fehl, Resend antwortet 500
   - Secrets fehlen
   - Zeilenumbrüche im Namen (Betreff)
   - Erwartung: nie ein 500, klare Meldung, Eingaben bleiben erhalten, ohne Konfiguration die Mail-Adresse
   - *Tests: Task 6 (`contact.test.ts`, E2E).*
5. **Zwei Sprachen:**
   - Jede Seite ist in DE und EN erreichbar.
   - Der Umschalter bleibt auf derselben Seite (`/fussball` ↔ `/en/football`).
   - Die 404 ist lokalisiert.
   - Leere EN-Texte zeigen den EN-Standard.
   - *Tests: `routing.spec.ts` (Plan 1), Task 2 (`site-frame`), Task 5 (`/en/clients`).*

---

## Dateistruktur (neu bzw. geändert)

```
wrangler.jsonc                         # + ratelimits CONTACT_LIMITER (auch env.preview)
.dev.vars.example / .dev.vars          # + RESEND_API_KEY=log, Turnstile-Testschlüssel, CONTACT_EMAIL
package.json                           # + logo:generate, lint prüft Logo-Pfade, test:e2e:prod + site-frame
README.md                              # Kontaktformular, Secrets
scripts/generate-logo-paths.mjs        # brand/*.svg → src/components/site/logo-paths.ts (--check im Lint)
scripts/set-contact-secrets.sh         # verdeckte Eingabe der Kontakt-Secrets (👤)
scripts/check-server-actions.mjs       # + Ausnahmen kontakt/kunden
src/app/globals.css                    # + alert, Fokus, Sprunglink, link-draw, Passepartout
src/app/global-not-found.tsx           # gestaltet (Ring)
src/app/[locale]/layout.tsx            # Kopf, Fußzeile, Sprunglink, Titel-Vorlage
src/app/[locale]/not-found.tsx         # gestaltet, lokalisiert
src/app/[locale]/page.tsx              # Startseite
src/app/[locale]/[category]/page.tsx   # Kategorieseite
src/app/[locale]/ueber-mich/page.tsx
src/app/[locale]/kontakt/{page.tsx,actions.ts,contact-form.tsx}
src/app/[locale]/kunden/{page.tsx,actions.ts,gallery-code-form.tsx}
src/app/[locale]/impressum/page.tsx, datenschutz/page.tsx
src/components/placeholder-page.tsx    # gelöscht (Task 6)
src/components/site/{logo-paths.ts,logo.tsx,photo.tsx,passepartout.tsx,header.tsx,locale-switch.tsx,mobile-menu.tsx,footer.tsx,text-blocks.tsx,legal-page.tsx}
src/components/site/home/{hero.tsx,chapter.tsx,about-teaser.tsx,closing.tsx}
src/components/site/category/{category-grid.tsx,category-pill.tsx,lightbox.tsx}
src/lib/portfolio/repo.ts              # + listVisible
src/lib/public/{images.ts,text.ts,gallery-code.ts,content.ts,data.ts}
src/lib/contact/{schema.ts,turnstile.ts,mail.ts,submit.ts}
src/messages/de.json / en.json         # Namespaces nav, home, category, lightbox, about, legal, clients, contact, footer, notFound
test/unit/{public-images,public-text,gallery-code,public-content,contact}.test.ts
test/e2e/helpers/portfolio.ts
test/e2e/{site-frame,public-portfolio,public-info,contact}.spec.ts
test/e2e/{design-system,routing}.spec.ts   # eindeutige Link-Namen (exact / banner)
```

---

### Task 1: Inhalte und Helfer für die öffentlichen Seiten

**Dateien:**
- Erstellen: `src/lib/public/images.ts`, `src/lib/public/text.ts`, `src/lib/public/gallery-code.ts`, `src/lib/public/content.ts`, `src/lib/public/data.ts`, `test/unit/public-images.test.ts`, `test/unit/public-text.test.ts`, `test/unit/gallery-code.test.ts`, `test/unit/public-content.test.ts`
- Ändern: `src/lib/portfolio/repo.ts` (`listVisible`)

**Schnittstellen:**
- Nutzt:
  - Plan 2: `targetSize`, `IMAGE_SIZES`, `mediaUrl`, `getSettings`, `portfolioImages`
  - Plan 3: `slugify`
- Stellt bereit:
  - `imageSources(kind, { id, width, height }): { src: string; srcSet: string }`
  - `altText(image: { altDe; altEn }, locale: "de" | "en", fallback: string): string`
  - `textBlocks(text): { kind: "heading" | "paragraph"; lines: string[] }[]`
  - `emphasis(text): { text: string; italic: boolean }[]`
  - `linkParts(line): { text: string; href?: string }[]`
  - `galleryCodeToSlug(input): string | null`
  - `listVisible(db): Promise<PortfolioImage[]>`
  - Typen und Konstanten: `type Chapter = { category; count; image: PortfolioImage | null; previews: PortfolioImage[] }`, `type HomeContent = { heroes; chapters; counts: Record<Category, number> }`, `type CategoryContent = { images; nav: { category; count; cover: PortfolioImage | null }[] }`, `MAX_HEROES = 3`, `MAX_PREVIEWS = 5`
  - `getHomeContent(db): Promise<HomeContent>`, `getCategoryContent(db, category): Promise<CategoryContent>`
  - `loadSettings()`, `loadHome()`, `loadCategory(category)` (pro Anfrage gecacht, dynamisch)

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/public-images.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { altText, imageSources } from "@/lib/public/images";

describe("imageSources", () => {
  it("lists the generated widths of a landscape photo", () => {
    expect(imageSources("portfolio", { id: "x", width: 6000, height: 4000 })).toEqual({
      src: "/media/portfolio/x/1600",
      srcSet: "/media/portfolio/x/800 800w, /media/portfolio/x/1600 1600w, /media/portfolio/x/2400 2400w",
    });
  });

  it("uses the real widths of a portrait photo", () => {
    expect(imageSources("portfolio", { id: "x", width: 4000, height: 6000 }).srcSet).toBe(
      "/media/portfolio/x/800 533w, /media/portfolio/x/1600 1067w, /media/portfolio/x/2400 1600w",
    );
  });

  it("drops variants that were not enlarged (same width twice)", () => {
    expect(imageSources("portfolio", { id: "x", width: 900, height: 600 }).srcSet).toBe(
      "/media/portfolio/x/800 800w, /media/portfolio/x/1600 900w",
    );
  });
});

describe("altText", () => {
  it("prefers the text of the page language and falls back otherwise", () => {
    const image = { altDe: "Jubel nach dem Siegtor", altEn: "  " };
    expect(altText(image, "de", "Floorball, Foto 1")).toBe("Jubel nach dem Siegtor");
    expect(altText(image, "en", "Floorball, photo 1")).toBe("Floorball, photo 1");
    expect(altText({ altDe: null, altEn: null }, "de", "Studio, Foto 2")).toBe("Studio, Foto 2");
  });
});
```

`test/unit/public-text.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { emphasis, linkParts, textBlocks } from "@/lib/public/text";

describe("textBlocks", () => {
  it("splits paragraphs at blank lines and keeps line breaks", () => {
    expect(textBlocks("Felix Vatterodt\nMusterweg 1\n\nE-Mail: hallo@cosmo-photos.de")).toEqual([
      { kind: "paragraph", lines: ["Felix Vatterodt", "Musterweg 1"] },
      { kind: "paragraph", lines: ["E-Mail: hallo@cosmo-photos.de"] },
    ]);
  });

  it("turns single lines starting with # into headings and ignores empty input", () => {
    expect(textBlocks("## Haftung\r\n\r\nText")).toEqual([
      { kind: "heading", lines: ["Haftung"] },
      { kind: "paragraph", lines: ["Text"] },
    ]);
    expect(textBlocks("  \n\n ")).toEqual([]);
  });
});

describe("emphasis", () => {
  it("marks *text* as italic and leaves single asterisks alone", () => {
    expect(emphasis("Hallen, Rauch, *Gänsehaut.*")).toEqual([
      { text: "Hallen, Rauch, ", italic: false },
      { text: "Gänsehaut.", italic: true },
    ]);
    expect(emphasis("ohne")).toEqual([{ text: "ohne", italic: false }]);
    expect(emphasis("a * b")).toEqual([{ text: "a * b", italic: false }]);
  });
});

describe("linkParts", () => {
  it("links web addresses and e-mails without trailing punctuation", () => {
    expect(linkParts("Mail: hallo@cosmo-photos.de, Web: https://cosmo-photos.de.")).toEqual([
      { text: "Mail: " },
      { text: "hallo@cosmo-photos.de", href: "mailto:hallo@cosmo-photos.de" },
      { text: ", Web: " },
      { text: "https://cosmo-photos.de", href: "https://cosmo-photos.de" },
      { text: "." },
    ]);
  });
});
```

`test/unit/gallery-code.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

describe("galleryCodeToSlug", () => {
  it("accepts codes, typed titles and pasted links", () => {
    expect(galleryCodeToSlug("final4-2026")).toBe("final4-2026");
    expect(galleryCodeToSlug("  Final4 2026 ")).toBe("final4-2026");
    expect(galleryCodeToSlug("https://cosmo-photos.de/g/final4-2026?x=1")).toBe("final4-2026");
    expect(galleryCodeToSlug("cosmo-photos.de/g/hochzeit-mueller/")).toBe("hochzeit-mueller");
    expect(galleryCodeToSlug("Hochzeit Müller")).toBe("hochzeit-mueller");
  });

  it("rejects empty or meaningless input", () => {
    for (const input of ["", "   ", "***", "/g/", "https://cosmo-photos.de/g/"]) expect(galleryCodeToSlug(input)).toBeNull();
  });
});
```

`test/unit/public-content.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Category } from "@/lib/categories";
import { createDb } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { getCategoryContent, getHomeContent } from "@/lib/public/content";

const db = () => createDb(env.DB);
let sort = 0;

async function add(category: Category, fields: Partial<typeof portfolioImages.$inferInsert> = {}) {
  sort++;
  const [row] = await db()
    .insert(portfolioImages)
    .values({ id: crypto.randomUUID(), category, width: 3000, height: 2000, color: "#111111", sort, ...fields })
    .returning();
  return row;
}

beforeEach(async () => {
  await db().delete(portfolioImages);
});

describe("getHomeContent", () => {
  it("counts only visible images and keeps the fixed category order", async () => {
    await add("studio");
    await add("floorball");
    await add("floorball", { visible: false });
    const home = await getHomeContent(db());
    expect(home.counts).toEqual({ floorball: 1, volleyball: 0, fussball: 0, hochzeiten: 0, studio: 1 });
    expect(home.chapters.map((chapter) => chapter.category)).toEqual(["floorball", "volleyball", "fussball", "hochzeiten", "studio"]);
  });

  it("uses the chosen chapter image and previews, otherwise the first images", async () => {
    await add("floorball");
    const chapter = await add("floorball", { role: "chapter" });
    const preview = await add("floorball", { role: "chapter_preview" });
    const volleyball = [await add("volleyball"), await add("volleyball"), await add("volleyball")];
    const home = await getHomeContent(db());
    expect(home.chapters[0].image?.id).toBe(chapter.id);
    expect(home.chapters[0].previews.map((image) => image.id)).toEqual([preview.id]);
    expect(home.chapters[1].image?.id).toBe(volleyball[0].id);
    expect(home.chapters[1].previews.map((image) => image.id)).toEqual([volleyball[1].id, volleyball[2].id]);
    expect(home.chapters[2]).toEqual({ category: "fussball", count: 0, image: null, previews: [] });
  });

  it("limits fallback previews to five", async () => {
    for (let i = 0; i < 8; i++) await add("hochzeiten");
    expect((await getHomeContent(db())).chapters[3].previews).toHaveLength(5);
  });

  it("takes up to three hero images, otherwise the chapter images", async () => {
    const hero = await add("studio", { role: "hero" });
    expect((await getHomeContent(db())).heroes.map((image) => image.id)).toEqual([hero.id]);

    await db().delete(portfolioImages);
    const floorball = await add("floorball");
    const studio = await add("studio");
    expect((await getHomeContent(db())).heroes.map((image) => image.id)).toEqual([floorball.id, studio.id]);
  });
});

describe("getCategoryContent", () => {
  it("returns the visible images of one category in admin order and the navigation for all five", async () => {
    const second = await add("studio", { sort: 2 });
    const first = await add("studio", { sort: 1 });
    await add("studio", { visible: false });
    await add("floorball");
    const content = await getCategoryContent(db(), "studio");
    expect(content.images.map((image) => image.id)).toEqual([first.id, second.id]);
    expect(content.nav.map((item) => [item.category, item.count])).toEqual([
      ["floorball", 1],
      ["volleyball", 0],
      ["fussball", 0],
      ["hochzeiten", 0],
      ["studio", 2],
    ]);
    expect(content.nav[4].cover?.id).toBe(first.id);
  });
});
```

```bash
npm test
```
Erwartet: FAIL, die vier neuen Dateien melden „Cannot find package '@/lib/public/…'“. Die bisherigen 116 Tests bleiben grün.

- [ ] **Schritt 2: Implementieren**

`src/lib/public/images.ts`:

```ts
import { targetSize } from "@/lib/image/sizing";
import { IMAGE_SIZES, mediaUrl, type MediaKind } from "@/lib/media/keys";

export type SizedImage = { id: string; width: number; height: number };

/**
 * srcset aus den drei gespeicherten Größen. Die Breiten sind die tatsächlich erzeugten (kleine Originale werden
 * nicht vergrößert), doppelte Breiten entfallen. `src` ist die 1600er-Größe, die es immer gibt.
 */
export function imageSources(kind: MediaKind, image: SizedImage): { src: string; srcSet: string } {
  const entries: string[] = [];
  let lastWidth = 0;
  for (const size of IMAGE_SIZES) {
    const { width } = targetSize(image.width, image.height, size);
    if (width === lastWidth) continue;
    lastWidth = width;
    entries.push(`${mediaUrl(kind, image.id, size)} ${width}w`);
  }
  return { src: mediaUrl(kind, image.id, 1600), srcSet: entries.join(", ") };
}

/** Alt-Text in der Sprache der Seite, sonst ein beschreibender Ersatz wie „Floorball, Foto 3“. */
export function altText(image: { altDe: string | null; altEn: string | null }, locale: "de" | "en", fallback: string): string {
  return (locale === "de" ? image.altDe : image.altEn)?.trim() || fallback;
}
```

`src/lib/public/text.ts`:

```ts
export type TextBlock = { kind: "heading" | "paragraph"; lines: string[] };

/** Pflegetexte (Impressum, Datenschutz, Über mich): Leerzeile = Absatz, einzelne Zeile mit „#“ = Zwischenüberschrift. */
export function textBlocks(text: string): TextBlock[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): TextBlock => {
      const heading = chunk.match(/^#{1,3}\s+(.+)$/);
      if (heading && !chunk.includes("\n")) return { kind: "heading", lines: [heading[1].trim()] };
      return { kind: "paragraph", lines: chunk.split("\n").map((line) => line.trim()) };
    });
}

/** *Wort* wird kursiv (Headline-Betonung wie „Hallen, Rauch, *Gänsehaut.*“). */
export function emphasis(text: string): { text: string; italic: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((part) => (/^\*[^*]+\*$/.test(part) ? { text: part.slice(1, -1), italic: true } : { text: part, italic: false }));
}

// Web-Adressen ohne Satzzeichen am Ende, dann E-Mail-Adressen.
const LINK = /(https?:\/\/[^\s<>()]*[^\s<>().,;:!?]|[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,})/gi;

export function linkParts(line: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const match of line.matchAll(LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: line.slice(last, index) });
    const value = match[0];
    parts.push({ text: value, href: value.startsWith("http") ? value : `mailto:${value}` });
    last = index + value.length;
  }
  if (last < line.length) parts.push({ text: line.slice(last) });
  return parts;
}
```

`src/lib/public/gallery-code.ts`:

```ts
import { slugify } from "@/lib/galleries/slug";

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Eingabe im Feld „Galerie-Code“: Kurzname, getippter Titel oder der ganze Link aus der Nachricht. */
export function galleryCodeToSlug(input: string): string | null {
  const trimmed = input.trim();
  const fromLink = trimmed.match(/\/g\/([^/?#\s]+)/);
  if (!fromLink && trimmed.includes("/g/")) return null;
  const source = fromLink ? decode(fromLink[1]) : trimmed;
  return /[a-z0-9äöüß]/i.test(source) ? slugify(source) : null;
}
```

In `src/lib/portfolio/repo.ts` direkt nach `listByCategory` ergänzen:

```ts
/** Alle sichtbaren Bilder (öffentliche Seiten), in Admin-Reihenfolge. */
export function listVisible(db: Db): Promise<PortfolioImage[]> {
  return db
    .select()
    .from(portfolioImages)
    .where(eq(portfolioImages.visible, true))
    .orderBy(asc(portfolioImages.sort), asc(portfolioImages.createdAt));
}
```

`src/lib/public/content.ts`:

```ts
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Db } from "@/lib/db/client";
import { listVisible, type PortfolioImage } from "@/lib/portfolio/repo";

export type Chapter = { category: Category; count: number; image: PortfolioImage | null; previews: PortfolioImage[] };
export type HomeContent = { heroes: PortfolioImage[]; chapters: Chapter[]; counts: Record<Category, number> };
export type CategoryNavItem = { category: Category; count: number; cover: PortfolioImage | null };
export type CategoryContent = { images: PortfolioImage[]; nav: CategoryNavItem[] };

export const MAX_HEROES = 3;
export const MAX_PREVIEWS = 5;

/** Pro Kategorie: gewähltes Kapitelbild (sonst das erste), gewählte Vorschaubilder (sonst die nächsten). */
function chaptersFrom(visible: PortfolioImage[]): Chapter[] {
  return CATEGORIES.map((category) => {
    const images = visible.filter((image) => image.category === category);
    const image = images.find((candidate) => candidate.role === "chapter") ?? images[0] ?? null;
    const chosen = images.filter((candidate) => candidate.role === "chapter_preview");
    const previews = (chosen.length > 0 ? chosen : images.filter((candidate) => candidate.id !== image?.id)).slice(0, MAX_PREVIEWS);
    return { category, count: images.length, image, previews };
  });
}

/** Startseite (Spec §6.1): Hero-Collage, fünf Kapitel, Zähler. Gezählt werden nur sichtbare Bilder. */
export async function getHomeContent(db: Db): Promise<HomeContent> {
  const visible = await listVisible(db);
  const chapters = chaptersFrom(visible);
  const chosenHeroes = visible.filter((image) => image.role === "hero").slice(0, MAX_HEROES);
  // Noch keine Hero-Bilder gewählt: die Kapitelbilder springen ein, damit die Startseite nie leer wirkt.
  const heroes = chosenHeroes.length > 0 ? chosenHeroes : chapters.flatMap((chapter) => (chapter.image ? [chapter.image] : [])).slice(0, MAX_HEROES);
  const counts = Object.fromEntries(chapters.map((chapter) => [chapter.category, chapter.count])) as Record<Category, number>;
  return { heroes, chapters, counts };
}

/** Kategorieseite (Spec §6.2): sichtbare Bilder der Kategorie plus Daten für die Kategorie-Pille. */
export async function getCategoryContent(db: Db, category: Category): Promise<CategoryContent> {
  const visible = await listVisible(db);
  return {
    images: visible.filter((image) => image.category === category),
    nav: chaptersFrom(visible).map((chapter) => ({ category: chapter.category, count: chapter.count, cover: chapter.image })),
  };
}
```

`src/lib/public/data.ts`:

```ts
import { cache } from "react";
import { connection } from "next/server";
import type { Category } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { getSettings } from "@/lib/settings/repo";
import { getCategoryContent, getHomeContent } from "./content";

/** Öffentliche Seiten lesen bei jeder Anfrage aus D1: Änderungen im Admin sind sofort sichtbar. */
async function publicDb() {
  await connection();
  return getDb();
}

// cache(): Layout und Seite teilen sich eine Abfrage pro Anfrage.
export const loadSettings = cache(async () => getSettings(await publicDb()));
export const loadHome = cache(async () => getHomeContent(await publicDb()));
export const loadCategory = cache(async (category: Category) => getCategoryContent(await publicDb(), category));
```

- [ ] **Schritt 3: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test && npm run lint && npm run build
```
Erwartet: 29 Testdateien, 131 Tests PASS; Lint und Build grün.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "feat(public): content, image sources, text and gallery-code helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Rahmen: Logo, Passepartout, Kopf, Menü, Fußzeile, 404

**Dateien:**
- Erstellen:
  - `scripts/generate-logo-paths.mjs`
  - `src/components/site/logo-paths.ts` (generiert), `logo.tsx`, `photo.tsx`, `passepartout.tsx`, `header.tsx`, `locale-switch.tsx`, `mobile-menu.tsx`, `footer.tsx`
  - `test/e2e/site-frame.spec.ts`
- Ändern:
  - `package.json` (`logo:generate`, `lint`)
  - `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/global-not-found.tsx`, `src/app/[locale]/page.tsx` (vorläufige Navigation entfernen)
  - `src/messages/de.json`, `src/messages/en.json`
  - `test/e2e/design-system.spec.ts`, `test/e2e/routing.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`imageSources`, `loadSettings`), `mediaUrl`, `CATEGORIES`, `Link`/`usePathname`/`getPathname` (next-intl-Navigation).
- Stellt bereit:
  - `Wordmark({ className?, decorative? })`, `Lockup({ className?, decorative? })` (einzelne Pfade, `currentColor`)
  - `Photo({ src, srcSet?, sizes?, alt, width?, height?, priority?, className? })` (Client)
  - `Passepartout({ image: FrameImage, alt, sizes, priority?, className?, kind? })`, `PortraitFrame({ id, alt, className? })`, `type FrameImage = { id; width; height; color }` (ohne `"use client"`, nutzbar in Server- und Client-Komponenten)
  - `SiteHeader({ shopUrl })`, `SiteFooter({ settings })`, `LocaleSwitch({ className?, onNavigate? })`, `MobileMenu({ shopUrl })`
  - CSS-Klassen `passepartout`, `passepartout-mat`, `passepartout-window`, `passepartout-photo`, `link-draw`, `skip-link`; Farbe `alert`
  - Messages: `nav.*`, `category.*`, `lightbox.*`, `about.*`, `legal.*`, `clients.*`, `contact.*`, `footer.*`, `notFound.*` (`home` folgt in Task 3)

- [ ] **Schritt 1: Tests anpassen und neue E2E-Tests schreiben**

Die bestehenden Tests suchen Links per Teilstring. Kopf, Fußzeile und später die Kapitel-Links („Alle Floorball-Bilder“) enthalten dieselben Wörter, deshalb werden die Namen eindeutig:

- In `test/e2e/design-system.spec.ts`: `page.getByRole("link", { name: "Floorball" })` ersetzen durch `page.getByRole("link", { name: "Floorball", exact: true })`.
- In `test/e2e/routing.spec.ts`:
  - Im Test „Sprachumschalter führt zur englischen Startseite“ `page.getByRole("link", { name: "English" })` ersetzen durch `page.getByRole("banner").getByRole("link", { name: "English" })`.
  - Im Test „Links auf der englischen Startseite …“ die drei Aufrufe mit `exact: true` versehen: `{ name: "Football", exact: true }`, `{ name: "Weddings", exact: true }`, `{ name: "About", exact: true }`.

`test/e2e/site-frame.spec.ts` (läuft ohne Anmeldung, auch gegen die Produktion):

```ts
import { expect, test } from "@playwright/test";

test("Rahmen: Kopf mit Logo und Navigation, Sprache wechselt auf derselben Seite", async ({ page }) => {
  await page.goto("/fussball");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Cosmo Photos, zur Startseite" })).toHaveAttribute("href", "/");
  await expect(banner.getByRole("link", { name: "Über mich" })).toHaveAttribute("href", "/ueber-mich");
  await expect(banner.getByRole("link", { name: "Arbeiten" })).toHaveAttribute("href", "/#arbeiten");
  await banner.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/football$/);
  await expect(page.getByRole("banner").getByRole("link", { name: "Deutsch" })).toHaveAttribute("href", "/fussball");
});

test("Rahmen: Menü auf dem Handy öffnet als Dialog und gibt den Fokus zurück", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const button = page.getByRole("button", { name: "Menü" });
  await button.click();
  const menu = page.getByRole("dialog", { name: "Menü" });
  await expect(menu.getByRole("link", { name: /Studio$/ })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Schließen" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await page.getByRole("dialog", { name: "Menü" }).getByRole("link", { name: "Kontakt" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Rahmen: Fußzeile mit Lockup, Impressum und Datenschutz", async ({ page }) => {
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("img", { name: "Cosmo Photos" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Impressum" })).toHaveAttribute("href", "/impressum");
  await expect(footer.getByRole("link", { name: "Datenschutz" })).toHaveAttribute("href", "/datenschutz");
});

test("Rahmen: gestaltete 404 in der Sprache der Seite", async ({ page }) => {
  const response = await page.goto("/en/quatsch/tief");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByRole("main").getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/en");
  await expect(page.getByRole("banner")).toBeVisible();
});

test("Rahmen: Sprunglink führt zum Inhalt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Zum Inhalt springen" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inhalt")).toBeFocused();
});
```

```bash
npm run test:e2e -- site-frame.spec.ts routing.spec.ts design-system.spec.ts
```
Erwartet: `site-frame.spec.ts` schlägt fehl (kein Kopf, kein Menü, keine Fußzeile). `routing` und `design-system` bleiben grün.

- [ ] **Schritt 2: Logo-Pfade aus den Marken-SVGs erzeugen**

`scripts/generate-logo-paths.mjs`:

```js
// Erzeugt src/components/site/logo-paths.ts aus brand/logo-wordmark.svg und brand/logo-lockup.svg.
// Mit --check (Teil von npm run lint) wird nur geprüft, ob die Datei zu den SVGs passt.
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/components/site/logo-paths.ts";

function read(file) {
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
  if (!viewBox || paths.length === 0) throw new Error(`${file}: viewBox oder Pfade fehlen`);
  return { viewBox, paths };
}

const content =
  "// Generiert von scripts/generate-logo-paths.mjs aus brand/*.svg – nicht von Hand ändern (npm run logo:generate).\n" +
  `export const WORDMARK = ${JSON.stringify(read("brand/logo-wordmark.svg"), null, 2)} as const;\n\n` +
  `export const LOCKUP = ${JSON.stringify(read("brand/logo-lockup.svg"), null, 2)} as const;\n`;

if (process.argv.includes("--check")) {
  let current = "";
  try {
    current = readFileSync(OUT, "utf8");
  } catch {
    // fehlt → veraltet
  }
  if (current !== content) {
    console.error(`${OUT} passt nicht zu brand/*.svg – npm run logo:generate ausführen.`);
    process.exit(1);
  }
  console.log("Logo-Pfade aktuell.");
} else {
  writeFileSync(OUT, content);
  console.log(`geschrieben: ${OUT}`);
}
```

In `package.json` bei `scripts`:
- ergänzen: `"logo:generate": "node scripts/generate-logo-paths.mjs",`
- `lint` ersetzen durch: `"lint": "eslint && node scripts/check-server-actions.mjs && node scripts/generate-logo-paths.mjs --check",`

```bash
mkdir -p src/components/site && npm run logo:generate && node scripts/generate-logo-paths.mjs --check
grep -c '"M' src/components/site/logo-paths.ts
```
Erwartet: `geschrieben: …`, dann `Logo-Pfade aktuell.`; 36 Pfade (15 Wortmarke + 21 Lockup).

- [ ] **Schritt 3: Designsystem-Klassen**

In `src/app/globals.css`:
- im ersten `@theme`-Block nach `--color-signal: #ff3d2e;` ergänzen: `--color-alert: #b8241a;`
- am Ende der Datei anfügen:

```css
/* Fehlertexte: `alert` statt `signal` – signal erreicht auf Papier kein WCAG AA (Plan 4, Abweichungen).
   Schichten: Kopf 20 · Kategorie-Pille 30 · Menü/Lightbox 50 · Sprunglink 60 */

:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.skip-link {
  position: absolute;
  left: 1rem;
  top: -100px;
  z-index: 60;
  border-radius: 999px;
  background: var(--color-ink);
  color: var(--color-paper);
  padding: 0.75rem 1.25rem;
}
.skip-link:focus {
  top: 1rem;
}

/* Unterstreichung zeichnet sich von links (Spec §6.4) */
.link-draw {
  background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
  padding-bottom: 2px;
  transition: background-size 0.5s var(--ease-expo-out);
}
.link-draw:hover,
.link-draw:focus-visible,
.link-draw[aria-current="page"] {
  background-size: 100% 1px;
}

/* Passepartout (Spec §4.3): der Rahmen misst die eigene Breite (Container), Rand ≈ 6 % davon. */
.passepartout {
  container-type: inline-size;
  display: block;
}
.passepartout-mat {
  display: block;
  background: var(--color-mat);
  padding: 6cqw;
  box-shadow:
    0 0.3cqw 1.8cqw rgb(20 20 18 / 0.1),
    0 0.05cqw 0.2cqw rgb(20 20 18 / 0.08);
  transition:
    transform 0.6s var(--ease-expo-out),
    box-shadow 0.6s var(--ease-expo-out);
}
.passepartout-window {
  display: block;
  overflow: hidden;
}
.passepartout-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  filter: blur(12px);
  transform: scale(1.02);
  transition:
    opacity 1s var(--ease-expo-out),
    filter 1s var(--ease-expo-out),
    transform 0.6s var(--ease-expo-out);
}
.passepartout-photo[data-loaded] {
  opacity: 1;
  filter: none;
  transform: none;
}
@media (hover: hover) {
  .passepartout:hover .passepartout-mat {
    transform: translateY(-0.8cqw);
    box-shadow:
      0 2cqw 5cqw rgb(20 20 18 / 0.16),
      0 0.3cqw 0.8cqw rgb(20 20 18 / 0.1);
  }
  .passepartout:hover .passepartout-photo[data-loaded] {
    transform: scale(1.03);
  }
}
/* Ohne JavaScript gibt es kein onLoad: Bilder sofort zeigen. */
@media (scripting: none) {
  .passepartout-photo {
    opacity: 1;
    filter: none;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .link-draw,
  .passepartout-mat,
  .passepartout-photo {
    transition: opacity 0.3s linear;
  }
  .passepartout:hover .passepartout-mat,
  .passepartout:hover .passepartout-photo[data-loaded],
  .passepartout-photo {
    transform: none;
  }
}
```

- [ ] **Schritt 4: Texte (DE/EN)**

In `src/messages/de.json` die folgenden Namespaces auf oberster Ebene setzen (gleichnamige ersetzen; `meta`, `home`, `categories`, `pages`, `gallery` bleiben unverändert):

```json
{
  "nav": {
    "home": "Cosmo Photos, zur Startseite",
    "main": "Hauptnavigation",
    "work": "Arbeiten",
    "about": "Über mich",
    "contact": "Kontakt",
    "clients": "Kunden",
    "shop": "Shop",
    "imprint": "Impressum",
    "privacy": "Datenschutz",
    "switchLocale": "English",
    "menu": "Menü",
    "close": "Schließen",
    "skip": "Zum Inhalt springen"
  },
  "category": {
    "empty": "Hier kommen bald Bilder.",
    "switch": "{category}, Kategorie wechseln"
  },
  "lightbox": {
    "close": "Schließen",
    "previous": "Vorheriges Foto",
    "next": "Nächstes Foto"
  },
  "about": {
    "statementFallback": "Fotografie aus Hamburg.",
    "references": "Referenzen",
    "cta": "Schreib mir"
  },
  "legal": {
    "pending": "Dieser Text folgt in Kürze."
  },
  "clients": {
    "intro": "Du hast von mir einen Link und ein Passwort bekommen? Gib hier den Galerie-Code ein oder öffne einfach den Link aus deiner Nachricht.",
    "code": "Galerie-Code",
    "hint": "Zum Beispiel final4-2026. Du kannst auch den ganzen Link einfügen.",
    "open": "Galerie öffnen",
    "errors": {
      "invalid": "Bitte gib einen Galerie-Code ein.",
      "unknown": "Diese Galerie gibt es nicht. Prüf den Code in deiner Nachricht.",
      "tooMany": "Zu viele Versuche. Bitte eine Minute warten."
    }
  },
  "contact": {
    "statement": "Erzähl mir, was du vorhast.",
    "name": "Name",
    "email": "E-Mail",
    "topic": "Worum geht's?",
    "topics": {
      "sport": "Sport",
      "wedding": "Hochzeit",
      "studio": "Studio",
      "gallery": "Meine Galerie",
      "other": "Etwas anderes"
    },
    "message": "Nachricht",
    "send": "Nachricht senden",
    "sending": "Wird gesendet …",
    "sent": "Danke! Ich melde mich bald.",
    "direct": "Lieber direkt?",
    "unavailable": "Das Formular ist gerade nicht erreichbar. Schreib mir direkt:",
    "errors": {
      "name": "Bitte gib deinen Namen an.",
      "email": "Bitte gib eine gültige E-Mail-Adresse an.",
      "message": "Deine Nachricht ist etwas kurz (mindestens 10 Zeichen).",
      "tooMany": "Zu viele Nachrichten in kurzer Zeit. Bitte versuch es gleich noch einmal.",
      "bot": "Die Sicherheitsprüfung ist noch nicht fertig. Bitte kurz warten und erneut senden.",
      "failed": "Das hat leider nicht geklappt. Schreib mir gern direkt an {email}.",
      "failedNoMail": "Das hat leider nicht geklappt. Bitte versuch es später noch einmal."
    }
  },
  "footer": {
    "legal": "Rechtliches und Links",
    "rights": "© {year} Felix Vatterodt"
  },
  "notFound": {
    "title": "Seite nicht gefunden",
    "text": "Diese Seite gibt es nicht (mehr).",
    "back": "Zur Startseite"
  }
}
```

In `src/messages/en.json` entsprechend:

```json
{
  "nav": {
    "home": "Cosmo Photos, home",
    "main": "Main navigation",
    "work": "Work",
    "about": "About",
    "contact": "Contact",
    "clients": "Clients",
    "shop": "Shop",
    "imprint": "Imprint",
    "privacy": "Privacy",
    "switchLocale": "Deutsch",
    "menu": "Menu",
    "close": "Close",
    "skip": "Skip to content"
  },
  "category": {
    "empty": "Photos are coming soon.",
    "switch": "{category}, change category"
  },
  "lightbox": {
    "close": "Close",
    "previous": "Previous photo",
    "next": "Next photo"
  },
  "about": {
    "statementFallback": "Photography from Hamburg.",
    "references": "References",
    "cta": "Write to me"
  },
  "legal": {
    "pending": "This text will follow shortly."
  },
  "clients": {
    "intro": "Did you get a link and a password from me? Enter the gallery code here or simply open the link from your message.",
    "code": "Gallery code",
    "hint": "For example final4-2026. You can also paste the whole link.",
    "open": "Open gallery",
    "errors": {
      "invalid": "Please enter a gallery code.",
      "unknown": "This gallery doesn't exist. Please check the code in your message.",
      "tooMany": "Too many attempts. Please wait a minute."
    }
  },
  "contact": {
    "statement": "Tell me what you have in mind.",
    "name": "Name",
    "email": "Email",
    "topic": "What is it about?",
    "topics": {
      "sport": "Sports",
      "wedding": "Wedding",
      "studio": "Studio",
      "gallery": "My gallery",
      "other": "Something else"
    },
    "message": "Message",
    "send": "Send message",
    "sending": "Sending …",
    "sent": "Thank you! I'll get back to you soon.",
    "direct": "Prefer email?",
    "unavailable": "The form is currently unavailable. Write to me directly:",
    "errors": {
      "name": "Please enter your name.",
      "email": "Please enter a valid email address.",
      "message": "Your message is a bit short (at least 10 characters).",
      "tooMany": "Too many messages in a short time. Please try again in a moment.",
      "bot": "The security check isn't finished yet. Please wait a moment and send again.",
      "failed": "That didn't work, sorry. Feel free to write to me directly at {email}.",
      "failedNoMail": "That didn't work, sorry. Please try again later."
    }
  },
  "footer": {
    "legal": "Legal and links",
    "rights": "© {year} Felix Vatterodt"
  },
  "notFound": {
    "title": "Page not found",
    "text": "This page doesn't exist (anymore).",
    "back": "Back to home"
  }
}
```

Zusammenführen, ohne die übrigen Namespaces anzufassen: die zwei JSON-Blöcke oben als `/tmp/p4-de.json` und `/tmp/p4-en.json` speichern, dann (vorhandene Namespaces behalten ihre Position, neue kommen ans Ende):

```bash
python3 - <<'PY'
import json
for lang in ("de", "en"):
    path = f"src/messages/{lang}.json"
    data = json.load(open(path, encoding="utf-8"))
    data.update(json.load(open(f"/tmp/p4-{lang}.json", encoding="utf-8")))
    open(path, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
PY
rm /tmp/p4-de.json /tmp/p4-en.json
```

- [ ] **Schritt 5: Komponenten des Rahmens**

`src/components/site/logo.tsx`:

```tsx
import { LOCKUP, WORDMARK } from "./logo-paths";

type LogoData = { readonly viewBox: string; readonly paths: readonly string[] };
type Props = { className?: string; decorative?: boolean };

function LogoSvg({ data, className, decorative = false }: Props & { data: LogoData }) {
  const label = decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "Cosmo Photos" };
  return (
    <svg viewBox={data.viewBox} className={className} fill="currentColor" {...label}>
      {data.paths.map((d, index) => (
        <path key={index} d={d} />
      ))}
    </svg>
  );
}

/** COSMO mit Ring (Kopf). Die Pfade bleiben einzeln, damit Plan 5 Ring und Buchstaben animieren kann. */
export function Wordmark(props: Props) {
  return <LogoSvg data={WORDMARK} {...props} />;
}

/** Voller Lockup mit PHOTOS (Fußzeile, später Intro). */
export function Lockup(props: Props) {
  return <LogoSvg data={LOCKUP} {...props} />;
}
```

`src/components/site/photo.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
};

/** Blendet weich ein, sobald das Bild geladen ist; bis dahin zeigt das Fenster den Hauptfarbton (Spec §4.3). */
export function Photo({ priority = false, className = "", ...image }: Props) {
  const ref = useRef<HTMLImageElement>(null);

  // Aus dem Cache geladene Bilder feuern vor der Hydration kein onLoad mehr.
  useEffect(() => {
    const element = ref.current;
    if (element?.complete && element.naturalWidth > 0) element.dataset.loaded = "";
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- eigene Größen aus R2 (srcset), kein Next-Bildoptimierer
    <img
      ref={ref}
      {...image}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      onLoad={(event) => {
        event.currentTarget.dataset.loaded = "";
      }}
      className={`passepartout-photo ${className}`}
    />
  );
}
```

`src/components/site/passepartout.tsx`:

```tsx
import { mediaUrl, type MediaKind } from "@/lib/media/keys";
import { imageSources } from "@/lib/public/images";
import { Photo } from "./photo";

export type FrameImage = { id: string; width: number; height: number; color: string };

type Props = { image: FrameImage; alt: string; sizes: string; priority?: boolean; className?: string; kind?: MediaKind };

// Nur <span>-Elemente: Passepartouts stehen auch in Buttons (Kategorieseite).

/** Abzug im Passepartout (Spec §4.3): weißer Rand ≈ 6 % der Breite, weicher Schatten, Hover hebt ihn an. */
export function Passepartout({ image, alt, sizes, priority = false, className = "", kind = "portfolio" }: Props) {
  const { src, srcSet } = imageSources(kind, image);
  return (
    <span className={`passepartout ${className}`}>
      <span className="passepartout-mat">
        <span className="passepartout-window" style={{ backgroundColor: image.color, aspectRatio: `${image.width} / ${image.height}` }}>
          <Photo src={src} srcSet={srcSet} sizes={sizes} alt={alt} width={image.width} height={image.height} priority={priority} />
        </span>
      </span>
    </span>
  );
}

/** Porträt aus den Einstellungen: dort steht nur die ID, deshalb festes Format 4:5 und die 1600er-Größe. */
export function PortraitFrame({ id, alt, className = "" }: { id: string; alt: string; className?: string }) {
  return (
    <span className={`passepartout ${className}`}>
      <span className="passepartout-mat">
        <span className="passepartout-window aspect-[4/5] bg-stone/20">
          <Photo src={mediaUrl("site", id, 1600)} alt={alt} />
        </span>
      </span>
    </span>
  );
}
```

`src/components/site/locale-switch.tsx`:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

/** Wechselt die Sprache und bleibt auf derselben Seite (lokalisierter Pfad, z. B. /fussball ↔ /en/football). */
export function LocaleSwitch({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "de" ? "en" : "de";
  return (
    <Link href={pathname} locale={other} hrefLang={other} lang={other} className={className} onClick={onNavigate}>
      {t("switchLocale")}
    </Link>
  );
}
```

`src/components/site/mobile-menu.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category } from "@/lib/categories";
import { LocaleSwitch } from "./locale-switch";
import { Wordmark } from "./logo";

const label = "font-label text-xs uppercase tracking-[0.12em]";

/** Vollbild-Menü unter lg (Spec §6.5). Plan 5 ergänzt den gestaffelten Reveal. */
export function MobileMenu({ shopUrl }: { shopUrl: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const button = opener.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      button?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={opener} type="button" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)} className={`${label} lg:hidden`}>
        {t("nav.menu")}
      </button>
      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label={t("nav.menu")} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-paper px-4 pb-10">
          <div className="flex h-[72px] shrink-0 items-center justify-between">
            <Link href="/" onClick={close} aria-label={t("nav.home")} className="block w-[104px]">
              <Wordmark decorative className="block h-auto w-full" />
            </Link>
            <button ref={closeButton} type="button" onClick={close} className={label}>
              {t("nav.close")}
            </button>
          </div>
          <nav aria-label={t("nav.main")} className="mt-6 flex flex-1 flex-col gap-12">
            <ol className="space-y-1">
              {CATEGORIES.map((category, index) => (
                <li key={category}>
                  <Link href={`/${category}` as `/${Category}`} onClick={close} className="flex items-baseline gap-3">
                    <span className="font-label text-xs text-stone">{String(index + 1).padStart(2, "0")}</span>
                    <span className="font-sport text-[clamp(3rem,14vw,4.5rem)]">{t(`categories.${category}`)}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <ul className="space-y-3 font-display text-3xl">
              <li>
                <Link href="/ueber-mich" onClick={close}>{t("nav.about")}</Link>
              </li>
              <li>
                <Link href="/kontakt" onClick={close}>{t("nav.contact")}</Link>
              </li>
              <li>
                <Link href="/kunden" onClick={close}>{t("nav.clients")}</Link>
              </li>
              {shopUrl && (
                <li>
                  <a href={shopUrl} target="_blank" rel="noopener">
                    {t("nav.shop")} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              )}
            </ul>
            <LocaleSwitch onNavigate={close} className={`${label} mt-auto text-stone`} />
          </nav>
        </div>
      )}
    </>
  );
}
```

`src/components/site/header.tsx`:

```tsx
import NextLink from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link, getPathname } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { LocaleSwitch } from "./locale-switch";
import { Wordmark } from "./logo";
import { MobileMenu } from "./mobile-menu";

/** Kopf (Spec §5.1): Wortmarke ≈ 10 % der Breite, eine Zeile Navigation ab lg, darunter das Vollbild-Menü. */
export async function SiteHeader({ shopUrl }: { shopUrl: string }) {
  const [t, locale] = await Promise.all([getTranslations("nav"), getLocale()]);
  const workHref = `${getPathname({ href: "/", locale: locale as Locale })}#arbeiten`;
  return (
    <header className="relative z-20">
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between gap-6 px-4 md:px-8">
        <Link href="/" aria-label={t("home")} className="block w-[clamp(104px,10vw,150px)]">
          <Wordmark decorative className="block h-auto w-full" />
        </Link>
        <nav aria-label={t("main")} className="hidden items-center gap-8 text-[15px] lg:flex">
          <NextLink href={workHref} className="link-draw">
            {t("work")}
          </NextLink>
          <Link href="/ueber-mich" className="link-draw">{t("about")}</Link>
          <Link href="/kontakt" className="link-draw">{t("contact")}</Link>
          <Link href="/kunden" className="link-draw">{t("clients")}</Link>
          {shopUrl && (
            <a href={shopUrl} target="_blank" rel="noopener" className="link-draw">
              {t("shop")} <span aria-hidden="true">↗</span>
            </a>
          )}
          <LocaleSwitch className="font-label text-xs uppercase tracking-[0.12em] text-stone transition-colors hover:text-ink" />
        </nav>
        <MobileMenu shopUrl={shopUrl} />
      </div>
    </header>
  );
}
```

`src/components/site/footer.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Settings } from "@/lib/settings/schema";
import { LocaleSwitch } from "./locale-switch";
import { Lockup } from "./logo";

const currentYear = () => new Date().getFullYear();

/** Fußzeile (Spec §6.1): großer Lockup (Plan 5 lässt den Ring kreisen), Pflichtseiten, Links, Sprache. */
export async function SiteFooter({ settings }: { settings: Settings }) {
  const t = await getTranslations();
  return (
    <footer className="mt-32 md:mt-48">
      <div className="mx-auto max-w-[1400px] px-4 pb-10 md:px-8">
        <Lockup className="block h-auto w-[min(640px,84vw)]" />
        <div className="mt-12 flex flex-col gap-6 border-t border-ink/15 pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <nav aria-label={t("footer.legal")} className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/impressum" className="link-draw">{t("nav.imprint")}</Link>
            <Link href="/datenschutz" className="link-draw">{t("nav.privacy")}</Link>
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener" className="link-draw">
                Instagram
              </a>
            )}
            {settings.pictrs_url && (
              <a href={settings.pictrs_url} target="_blank" rel="noopener" className="link-draw">
                {t("nav.shop")}
              </a>
            )}
            <LocaleSwitch className="link-draw" />
          </nav>
          <p className="font-label text-xs text-stone">{t("footer.rights", { year: currentYear() })}</p>
        </div>
      </div>
    </footer>
  );
}
```

`src/app/[locale]/layout.tsx`:
- Importe ergänzen:

```tsx
import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { loadSettings } from "@/lib/public/data";
```

- in `generateMetadata` die Rückgabe ersetzen durch:

```tsx
  return { title: { default: t("title"), template: "%s · Cosmo Photos" }, description: t("description") };
```

- den Rumpf von `LocaleLayout` ab `setRequestLocale(locale);` ersetzen durch:

```tsx
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations("nav"), loadSettings()]);

  return (
    <html lang={locale} className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a href="#inhalt" className="skip-link">
            {t("skip")}
          </a>
          <SiteHeader shopUrl={settings.pictrs_url} />
          <div id="inhalt" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </div>
          <SiteFooter settings={settings} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`src/app/[locale]/not-found.tsx` komplett ersetzen:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/** 404 (Spec §6.3): großer, leicht verschobener Ring hinter der Meldung. */
export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="relative mx-auto grid min-h-[70dvh] max-w-[1400px] place-items-center overflow-hidden px-4">
      <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[38%] -translate-y-[54%] rounded-full border-[1.5px] border-ink/15" />
      <div className="relative text-center">
        <p className="font-label text-sm text-stone">404</p>
        <h1 className="font-display mt-4 text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("title")}</h1>
        <p className="mt-5 text-stone">{t("text")}</p>
        <Link href="/" className="link-draw mt-10 inline-block text-lg">
          {t("back")}
        </Link>
      </div>
    </main>
  );
}
```

In `src/app/global-not-found.tsx` den `<main>…</main>`-Block ersetzen durch (Text bleibt wörtlich, `routing.spec.ts` prüft ihn):

```tsx
        <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 size-[min(88vw,680px)] -translate-x-[38%] -translate-y-[54%] rounded-full border-[1.5px] border-ink/15" />
          <div className="relative text-center">
            <p className="font-display text-[clamp(1.75rem,4vw,3rem)]">404 · Seite nicht gefunden / Page not found</p>
            <p className="mt-8">
              <a href="/" className="link-draw">cosmo-photos.de</a>
            </p>
          </div>
        </main>
```

Hinweis: Das `<a href="/">` in `global-not-found.tsx` ist Absicht, denn dort gibt es keinen i18n-Kontext. Falls die ESLint-Regel `@next/next/no-html-link-for-pages` anschlägt, `import Link from "next/link";` nutzen.

In `src/app/[locale]/page.tsx` (vorläufige Startseite, Task 3 ersetzt sie) den Block `<nav className="mt-16 flex flex-wrap gap-6 text-sm">` … `</nav>` samt Inhalt löschen. Kopf und Fußzeile übernehmen diese Links.

- [ ] **Schritt 6: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (inkl. „Logo-Pfade aktuell.“), Unit 131 PASS, E2E alle grün, darunter die 5 neuen `site-frame`-Tests.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(public): site frame with logo, header, mobile menu, footer, passepartout and 404

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Startseite

**Dateien:**
- Erstellen:
  - `src/components/site/home/hero.tsx`, `chapter.tsx`, `about-teaser.tsx`, `closing.tsx`
  - `test/e2e/helpers/portfolio.ts`, `test/e2e/public-portfolio.spec.ts`
- Ändern: `src/app/[locale]/page.tsx` (komplett ersetzen), `src/messages/de.json`, `src/messages/en.json` (Namespace `home`)

**Schnittstellen:**
- Nutzt:
  - Task 1: `loadHome`, `loadSettings`, `emphasis`, `altText`, `Chapter`
  - Task 2: `Passepartout`, `PortraitFrame`, `link-draw`
  - Plan 3: `newContext`
  - Plan 2: `clearCategory`, `TINY_WEBP`
- Stellt bereit:
  - `HomeHero`, `ChapterSection` (`data-chapter="<kategorie>"`), `AboutTeaser`, `Closing`
  - Anker `#arbeiten` (Kategorie-Index)
  - Messages `home.*` (u. a. `home.photoAlt`, das Task 4 nutzt)
  - E2E-Helfer `seedCategory(page, category, seeds: { role?; visible?; portrait? }[]): Promise<string[]>`

- [ ] **Schritt 1: Fehlschlagenden E2E-Test schreiben**

`test/e2e/helpers/portfolio.ts`:

```ts
import { expect, type Page } from "@playwright/test";
import { TINY_WEBP, clearCategory } from "./admin";

type Seed = { role?: "chapter" | "chapter_preview"; visible?: boolean; portrait?: boolean };

/** Leert die Kategorie und legt Bilder über die Admin-API an (Reihenfolge = Anlage-Reihenfolge). */
export async function seedCategory(page: Page, category: string, seeds: Seed[]): Promise<string[]> {
  await clearCategory(page, category);
  const ids: string[] = [];
  for (const seed of seeds) {
    const id = crypto.randomUUID();
    for (const size of [800, 1600, 2400]) {
      const put = await page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
      expect(put.status()).toBe(204);
    }
    const [width, height] = seed.portrait ? [2000, 3000] : [3000, 2000];
    const created = await page.request.post("/admin/api/portfolio", { data: { id, category, width, height, color: "#5a6b7c" } });
    expect(created.status()).toBe(201);
    const patch: Record<string, unknown> = {};
    if (seed.role) patch.role = seed.role;
    if (seed.visible === false) patch.visible = false;
    if (Object.keys(patch).length > 0) {
      expect((await page.request.patch(`/admin/api/portfolio/${id}`, { data: patch })).status()).toBe(200);
    }
    ids.push(id);
  }
  return ids;
}
```

`test/e2e/public-portfolio.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { newContext } from "./helpers/galleries";
import { seedCategory } from "./helpers/portfolio";

test.describe.configure({ mode: "serial" });

// Eigene Kategorie für diese Datei (admin-api nutzt volleyball, admin-portfolio studio):
// 6 sichtbare Bilder (1 Kapitel, 3 Vorschau), 1 ausgeblendetes.
test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await seedCategory(page, "hochzeiten", [
    { role: "chapter" },
    { role: "chapter_preview" },
    { role: "chapter_preview", portrait: true },
    { role: "chapter_preview" },
    {},
    { portrait: true },
    { visible: false },
  ]);
  await admin.close();
});

test("Startseite: Index mit Anzahl, Kapitel mit Bild, Vorschau und Link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallen, Rauch, Gänsehaut.");

  const index = page.getByRole("navigation", { name: "Kategorien" });
  const entry = index.getByRole("listitem").filter({ has: page.getByRole("link", { name: "Hochzeiten", exact: true }) });
  await expect(entry).toContainText("(6)");

  const chapter = page.locator('[data-chapter="hochzeiten"]');
  await expect(chapter.getByRole("heading", { level: 2 })).toHaveText("Hochzeiten");
  await expect(chapter).toContainText("(6 Fotos)");
  expect(await chapter.locator(".bg-hall").evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");
  await expect(chapter.getByRole("listitem")).toHaveCount(3);
  await expect(chapter.getByRole("img", { name: /^Hochzeiten, Foto/ })).toHaveCount(4);

  await chapter.getByRole("link", { name: "Alle Hochzeiten-Bilder" }).click();
  await expect(page).toHaveURL(/\/hochzeiten$/);
});
```

```bash
npm run test:e2e -- public-portfolio.spec.ts
```
Erwartet: FAIL, weil es noch kein Kapitel `[data-chapter="hochzeiten"]` gibt.

- [ ] **Schritt 2: Texte**

In `src/messages/de.json` den Namespace `home` ersetzen (der alte Schlüssel `intro` entfällt):

```json
"home": {
  "headline": "Hallen, Rauch, *Gänsehaut.*",
  "index": "Kategorien",
  "allPhotos": "Alle {category}-Bilder",
  "photos": "Fotos",
  "photoAlt": "{category}, Foto {number}",
  "aboutTitle": "Über mich",
  "aboutFallback": "Fotografie aus Hamburg. Am Spielfeldrand, bei Hochzeiten und im Studio.",
  "aboutLink": "Mehr über mich",
  "portraitAlt": "Porträt von Felix Vatterodt",
  "closingTitle": "Kontakt"
}
```

In `src/messages/en.json`:

```json
"home": {
  "headline": "Halls, smoke, *goosebumps.*",
  "index": "Categories",
  "allPhotos": "All {category} photos",
  "photos": "photos",
  "photoAlt": "{category}, photo {number}",
  "aboutTitle": "About me",
  "aboutFallback": "Photography from Hamburg. Courtside, at weddings and in the studio.",
  "aboutLink": "More about me",
  "portraitAlt": "Portrait of Felix Vatterodt",
  "closingTitle": "Contact"
}
```

- [ ] **Schritt 3: Bausteine der Startseite**

`src/components/site/home/hero.tsx`:

```tsx
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { Passepartout } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import { altText } from "@/lib/public/images";
import { emphasis } from "@/lib/public/text";

// Lose Collage (Spec §6.1): drei Abzüge, leicht gedreht und überlappend; unter lg als Raster gestapelt.
const COLLAGE = [
  "col-span-2 lg:absolute lg:left-[2%] lg:top-[10%] lg:z-10 lg:w-[50%] lg:-rotate-2",
  "lg:absolute lg:right-0 lg:top-0 lg:w-[40%] lg:rotate-[1.5deg]",
  "lg:absolute lg:bottom-0 lg:right-[14%] lg:z-20 lg:w-[36%] lg:-rotate-1",
];

type Props = { headline: string; heroes: PortfolioImage[]; counts: Record<Category, number>; locale: Locale };

export async function HomeHero({ headline, heroes, counts, locale }: Props) {
  const t = await getTranslations();
  return (
    <section aria-labelledby="hero-title" className="mx-auto max-w-[1400px] px-4 pt-8 md:px-8 md:pt-14">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
        <h1 id="hero-title" className="font-display pb-[0.08em] text-[clamp(2.75rem,7vw,6.75rem)] leading-[0.98] lg:col-span-6">
          {emphasis(headline).map((part, index) =>
            part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
          )}
        </h1>
        {heroes.length > 0 && (
          <div className="grid grid-cols-2 gap-4 lg:relative lg:col-span-6 lg:block lg:h-[min(68vh,700px)]">
            {heroes.map((image, index) => (
              <Passepartout
                key={image.id}
                image={image}
                alt={altText(image, locale, t("home.photoAlt", { category: t(`categories.${image.category}`), number: index + 1 }))}
                sizes="(min-width: 1024px) 28vw, 50vw"
                priority={index === 0}
                className={COLLAGE[index]}
              />
            ))}
          </div>
        )}
      </div>

      <nav id="arbeiten" aria-label={t("home.index")} className="mt-16 scroll-mt-6 border-t border-ink/15 pt-6 md:mt-24">
        <ol className="grid gap-x-10 gap-y-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-between">
          {CATEGORIES.map((category, index) => (
            <li key={category} className="flex items-baseline gap-3">
              <span className="font-label text-xs text-stone">{String(index + 1).padStart(2, "0")}</span>
              <Link href={`/${category}` as `/${Category}`} className="font-sport text-[clamp(2.25rem,4vw,3.5rem)] transition-colors hover:text-stone">
                {t(`categories.${category}`)}
              </Link>
              <span className="font-label text-xs text-stone">({counts[category]})</span>
            </li>
          ))}
        </ol>
      </nav>
    </section>
  );
}
```

`src/components/site/home/chapter.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Passepartout } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import type { Category } from "@/lib/categories";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import type { Chapter } from "@/lib/public/content";
import { altText } from "@/lib/public/images";

// Vorschaubilder in lockerem Versatz (Plan 5 gibt ihnen unterschiedliches Tempo).
const PREVIEW_OFFSETS = ["", "lg:mt-20", "lg:mt-8", "lg:mt-28", "lg:mt-12"];

/**
 * Kapitel „Einlauf“ (Spec §6.1), statisch: ein dunkles Band („Licht aus“) mit Kapitelbild, Titel und Zähler,
 * danach die Vorschaubilder bei Tageslicht. Plan 5 fixiert das Kapitel und blendet zwischen beiden Zuständen.
 */
export async function ChapterSection({ chapter, index, locale }: { chapter: Chapter; index: number; locale: Locale }) {
  if (!chapter.image) return null;
  const t = await getTranslations();
  const name = t(`categories.${chapter.category}`);
  const alt = (image: PortfolioImage, number: number) => altText(image, locale, t("home.photoAlt", { category: name, number }));
  const flip = index % 2 === 1;

  return (
    <section aria-labelledby={`chapter-${chapter.category}`} data-chapter={chapter.category} className="mt-28 md:mt-40">
      <div className="bg-hall text-hall-ink">
        <div className="mx-auto grid max-w-[1400px] items-end gap-10 px-4 py-20 md:grid-cols-12 md:gap-8 md:px-8 md:py-32">
          <Passepartout
            image={chapter.image}
            alt={alt(chapter.image, 1)}
            sizes="(min-width: 768px) 56vw, 100vw"
            className={flip ? "md:col-span-7 md:col-start-6 md:row-start-1" : "md:col-span-7"}
          />
          <div className={flip ? "md:col-span-5 md:col-start-1 md:row-start-1" : "md:col-span-5"}>
            <h2 id={`chapter-${chapter.category}`} className="font-sport text-[clamp(4rem,11vw,10.5rem)]">
              {name}
            </h2>
            <p className="mt-5 flex items-center gap-3 font-label text-sm text-hall-ink/70">
              <span aria-hidden="true" className="size-2 rounded-full bg-signal" />
              <span>
                ({chapter.count}
                <span className="sr-only"> {t("home.photos")}</span>)
              </span>
            </p>
          </div>
        </div>
      </div>

      {chapter.previews.length > 0 && (
        <ul className="mx-auto grid max-w-[1400px] grid-cols-2 items-start gap-4 px-4 pt-14 sm:grid-cols-3 md:gap-8 md:px-8 lg:grid-cols-5">
          {chapter.previews.map((image, i) => (
            <li key={image.id} className={PREVIEW_OFFSETS[i]}>
              <Passepartout image={image} alt={alt(image, i + 2)} sizes="(min-width: 1024px) 17vw, (min-width: 640px) 30vw, 46vw" />
            </li>
          ))}
        </ul>
      )}

      <p className="mx-auto max-w-[1400px] px-4 pt-10 md:px-8">
        <Link href={`/${chapter.category}` as `/${Category}`} className="link-draw text-lg">
          {t("home.allPhotos", { category: name })} <span aria-hidden="true">→</span>
        </Link>
      </p>
    </section>
  );
}
```

`src/components/site/home/about-teaser.tsx`:

```tsx
import { Fragment } from "react";
import { getTranslations } from "next-intl/server";
import { PortraitFrame } from "@/components/site/passepartout";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/pathnames";
import { emphasis } from "@/lib/public/text";
import type { Settings } from "@/lib/settings/schema";

/** Über-mich-Teaser (Spec §6.1): Porträt im Passepartout, ein Satz, ein Link. */
export async function AboutTeaser({ settings, locale }: { settings: Settings; locale: Locale }) {
  const t = await getTranslations("home");
  const statement = (locale === "de" ? settings.about_statement_de : settings.about_statement_en) || t("aboutFallback");
  const portrait = settings.about_portrait_id;
  return (
    <section aria-labelledby="about-teaser" className="mx-auto mt-32 grid max-w-[1400px] items-center gap-10 px-4 md:mt-48 md:grid-cols-12 md:gap-8 md:px-8">
      {portrait && <PortraitFrame id={portrait} alt={t("portraitAlt")} className="w-2/3 md:col-span-4 md:col-start-2 md:w-auto md:-rotate-1" />}
      <div className={portrait ? "md:col-span-6 md:col-start-7" : "md:col-span-8 md:col-start-3"}>
        <h2 id="about-teaser" className="sr-only">
          {t("aboutTitle")}
        </h2>
        <p className="font-display pb-[0.08em] text-[clamp(2rem,4.2vw,3.75rem)] leading-[1.05]">
          {emphasis(statement).map((part, index) =>
            part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
          )}
        </p>
        <Link href="/ueber-mich" className="link-draw mt-8 inline-block text-lg">
          {t("aboutLink")} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
```

`src/components/site/home/closing.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import type { Settings } from "@/lib/settings/schema";

/** Abschluss (Spec §6.1): große Kontaktzeile, Instagram, pictrs-Shop. Ohne gepflegte Angaben entfällt er. */
export async function Closing({ settings }: { settings: Settings }) {
  const t = await getTranslations();
  const { contact_email: email, instagram_url: instagram, pictrs_url: shop } = settings;
  if (!email && !instagram && !shop) return null;
  return (
    <section aria-labelledby="closing-title" className="mx-auto mt-32 max-w-[1400px] px-4 md:mt-48 md:px-8">
      <h2 id="closing-title" className="font-label text-xs uppercase tracking-[0.18em] text-stone">
        {t("home.closingTitle")}
      </h2>
      {email && (
        <a href={`mailto:${email}`} className="font-display mt-6 block break-words pb-[0.1em] text-[clamp(2.25rem,6.5vw,6rem)] italic leading-[1.05] transition-colors hover:text-stone">
          {email}
        </a>
      )}
      {(instagram || shop) && (
        <ul className="mt-10 flex flex-wrap gap-8 text-lg">
          {instagram && (
            <li>
              <a href={instagram} target="_blank" rel="noopener" className="link-draw">
                Instagram <span aria-hidden="true">↗</span>
              </a>
            </li>
          )}
          {shop && (
            <li>
              <a href={shop} target="_blank" rel="noopener" className="link-draw">
                {t("nav.shop")} <span aria-hidden="true">↗</span>
              </a>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
```

`src/app/[locale]/page.tsx` komplett ersetzen:

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AboutTeaser } from "@/components/site/home/about-teaser";
import { ChapterSection } from "@/components/site/home/chapter";
import { Closing } from "@/components/site/home/closing";
import { HomeHero } from "@/components/site/home/hero";
import type { Locale } from "@/i18n/pathnames";
import { loadHome, loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const lang = locale as Locale;
  const [t, home, settings] = await Promise.all([getTranslations("home"), loadHome(), loadSettings()]);
  const headline = (lang === "de" ? settings.hero_headline_de : settings.hero_headline_en) || t("headline");

  return (
    <main>
      <HomeHero headline={headline} heroes={home.heroes} counts={home.counts} locale={lang} />
      {home.chapters
        .filter((chapter) => chapter.image)
        .map((chapter, index) => (
          <ChapterSection key={chapter.category} chapter={chapter} index={index} locale={lang} />
        ))}
      <AboutTeaser settings={settings} locale={lang} />
      <Closing settings={settings} />
    </main>
  );
}
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 131 PASS, E2E alle grün. Dazu gehören `routing` (H1 „Hallen, Rauch, Gänsehaut.“, eindeutige EN-Links), `design-system` („01“, Floorball-Link in Archivo) und der neue Startseiten-Test.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(public): home page with hero collage, category index, chapters, about teaser and closing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Kategorieseite, Kategorie-Pille, Lightbox „Licht aus“

**Dateien:**
- Erstellen: `src/components/site/category/category-grid.tsx`, `category-pill.tsx`, `lightbox.tsx`
- Ändern: `src/app/[locale]/[category]/page.tsx` (komplett ersetzen), `test/e2e/public-portfolio.spec.ts` (3 Tests anhängen)

**Schnittstellen:**
- Nutzt:
  - Task 1: `loadCategory`, `imageSources`, `altText`
  - Task 2: `Passepartout`, Messages `category.*`, `lightbox.*`
  - Task 3: `home.photoAlt`, Testdaten aus `beforeAll`
- Stellt bereit:
  - `CategoryGrid({ images: LightboxImage[] })` (Client, besitzt den Lightbox-Zustand)
  - `PublicLightbox({ images, index, onIndex, onClose })`, `type LightboxImage = { id; width; height; color; alt }`
  - `CategoryPill({ current, items: PillItem[] })`, `type PillItem = { category; name; count; thumb: string | null }`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests anhängen**

An `test/e2e/public-portfolio.spec.ts` anhängen:

```ts
test("Kategorieseite: Titel mit Anzahl, alle sichtbaren Bilder, Alt-Texte in Admin-Reihenfolge", async ({ page }) => {
  await page.goto("/hochzeiten");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hochzeiten");
  await expect(page.getByRole("main").getByText("(6)", { exact: true })).toBeVisible();
  const photos = page.getByRole("button", { name: /^Hochzeiten, Foto \d$/ });
  await expect(photos).toHaveCount(6);
  await expect(photos.first()).toHaveAccessibleName("Hochzeiten, Foto 1");
});

test("Lightbox „Licht aus“: Tastatur, Knöpfe, Wischen, Fokus zurück", async ({ page }) => {
  await page.goto("/hochzeiten");
  const first = page.getByRole("button", { name: "Hochzeiten, Foto 1" });
  await first.click();
  const box = page.getByTestId("lightbox");
  await expect(box.getByText("1 / 6")).toBeVisible();
  expect(await box.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(11, 11, 12)");

  await page.keyboard.press("ArrowRight");
  await expect(box.getByText("2 / 6")).toBeVisible();
  await box.getByRole("button", { name: "Vorheriges Foto" }).click();
  await expect(box.getByText("1 / 6")).toBeVisible();

  const { width, height } = page.viewportSize()!;
  await page.mouse.move(width * 0.65, height / 2);
  await page.mouse.down();
  await page.mouse.move(width * 0.3, height / 2, { steps: 6 });
  await page.mouse.up();
  await expect(box.getByText("2 / 6")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(box).toBeHidden();
  await expect(first).toBeFocused();
});

test("Kategorie-Pille klappt die fünf Kategorien auf und wechselt", async ({ page }) => {
  await page.goto("/hochzeiten");
  const pill = page.getByRole("button", { name: "Hochzeiten, Kategorie wechseln" });
  await expect(pill).toHaveAttribute("aria-expanded", "false");
  await pill.click();
  await expect(pill).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#category-menu");
  await expect(menu.getByRole("link")).toHaveCount(5);
  await expect(menu.getByRole("link", { name: /^Hochzeiten/ })).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await pill.click();
  await menu.getByRole("link", { name: /^Studio/ }).click();
  await expect(page).toHaveURL(/\/studio$/);
});
```

```bash
npm run test:e2e -- public-portfolio.spec.ts
```
Erwartet: Die drei neuen Tests schlagen fehl, weil es keine Bild-Buttons, keine Lightbox und keine Pille gibt; der Startseiten-Test bleibt grün.

- [ ] **Schritt 2: Lightbox**

`src/components/site/category/lightbox.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { imageSources } from "@/lib/public/images";

export type LightboxImage = { id: string; width: number; height: number; color: string; alt: string };

type Props = { images: LightboxImage[]; index: number; onIndex: (index: number) => void; onClose: () => void };

/** Lightbox „Licht aus“ (Spec §6.2): Hallenschwarz, Pfeiltasten, Wischen, ESC, dezenter Positionszähler. */
export function PublicLightbox({ images, index, onIndex, onClose }: Props) {
  const t = useTranslations("lightbox");
  const image = images[index];
  const { src, srcSet } = imageSources("portfolio", image);
  const closeButton = useRef<HTMLButtonElement>(null);
  const swipeStart = useRef<number | null>(null);

  // Scrollen sperren; Auslöser merken, bevor der Fokus in die Lightbox springt, und beim Schließen zurückgeben.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && index < images.length - 1) onIndex(index + 1);
      if (event.key === "ArrowLeft" && index > 0) onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, images.length, onClose, onIndex]);

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < images.length) onIndex(next);
  };

  return (
    <div
      data-testid="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt}
      className="fixed inset-0 z-50 flex touch-none select-none flex-col bg-hall text-hall-ink"
      onPointerDown={(event) => {
        swipeStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (start === null) return;
        const distance = event.clientX - start;
        if (Math.abs(distance) > 60) go(distance < 0 ? 1 : -1);
      }}
      onPointerCancel={() => {
        swipeStart.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <p aria-live="polite" className="font-label text-xs text-hall-ink/70">
          {index + 1} / {images.length}
        </p>
        <button ref={closeButton} type="button" onClick={onClose} className="font-label text-xs uppercase tracking-[0.12em]">
          {t("close")}
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-10 md:px-24">
        {/* eslint-disable-next-line @next/next/no-img-element -- eigene Größen aus R2 (srcset) */}
        <img
          key={image.id}
          src={src}
          srcSet={srcSet}
          sizes="100vw"
          alt={image.alt}
          draggable={false}
          className="max-h-full max-w-full object-contain"
          style={{ aspectRatio: `${image.width} / ${image.height}`, backgroundColor: image.color }}
        />
        {index > 0 && (
          <button type="button" aria-label={t("previous")} onClick={() => go(-1)} className="absolute left-3 top-1/2 hidden -translate-y-1/2 p-4 text-2xl md:block">
            ←
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" aria-label={t("next")} onClick={() => go(1)} className="absolute right-3 top-1/2 hidden -translate-y-1/2 p-4 text-2xl md:block">
            →
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Schritt 3: Spalten und Pille**

`src/components/site/category/category-grid.tsx`:

```tsx
"use client";

import { useCallback, useState } from "react";
import { Passepartout } from "@/components/site/passepartout";
import { PublicLightbox, type LightboxImage } from "./lightbox";

// Drei lockere, versetzte Spalten (Spec §6.2); Plan 5 gibt ihnen unterschiedliches Scrolltempo.
const COLUMN_OFFSETS = ["", "lg:mt-[24vh]", "lg:mt-[10vh]"];

export function CategoryGrid({ images }: { images: LightboxImage[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const columns = COLUMN_OFFSETS.map((_, column) =>
    images.map((image, index) => ({ image, index })).filter(({ index }) => index % 3 === column),
  );

  return (
    <>
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-16 px-8 sm:px-14 md:grid-cols-2 md:gap-x-12 md:px-8 lg:grid-cols-3 lg:gap-x-[6vw]">
        {columns.map((column, c) => (
          // Unter lg lösen sich die Spalten auf (display: contents); `order` hält dort die Admin-Reihenfolge.
          <div key={c} className={`contents lg:flex lg:flex-col lg:gap-[16vh] ${COLUMN_OFFSETS[c]}`}>
            {column.map(({ image, index }) => (
              <button key={image.id} type="button" aria-haspopup="dialog" onClick={() => setOpen(index)} style={{ order: index }} className="block w-full cursor-zoom-in text-left">
                <Passepartout image={image} alt={image.alt} sizes="(min-width: 1024px) 28vw, (min-width: 768px) 44vw, 86vw" />
              </button>
            ))}
          </div>
        ))}
      </div>
      {open !== null && <PublicLightbox images={images} index={open} onIndex={setOpen} onClose={close} />}
    </>
  );
}
```

`src/components/site/category/category-pill.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Category } from "@/lib/categories";

export type PillItem = { category: Category; name: string; count: number; thumb: string | null };

/** Schwebende Kategorie-Pille (Spec §6.2): Mini-Vorschau und Name, klappt die fünf Kategorien auf. */
export function CategoryPill({ current, items }: { current: Category; items: PillItem[] }) {
  const t = useTranslations("category");
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = items.find((item) => item.category === current) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4">
      <div ref={root} className="pointer-events-auto relative">
        {open && (
          <ul id="category-menu" className="absolute bottom-full left-1/2 mb-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 bg-paper p-2 shadow-[0_18px_50px_rgb(20_20_18/0.18)]">
            {items.map((item) => (
              <li key={item.category}>
                <Link
                  href={`/${item.category}` as `/${Category}`}
                  aria-current={item.category === current ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline gap-3 px-3 py-2 transition-colors hover:bg-mat"
                >
                  <span className="font-sport text-2xl">{item.name}</span>
                  <span className="ml-auto font-label text-xs text-stone">({item.count})</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="category-menu"
          aria-label={t("switch", { category: active.name })}
          onClick={() => setOpen((value) => !value)}
          className="flex items-center gap-3 rounded-full bg-ink py-1.5 pl-1.5 pr-5 text-paper shadow-[0_10px_30px_rgb(20_20_18/0.25)] transition active:scale-[0.98]"
        >
          {active.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element -- Mini-Vorschau (800er-Größe)
            <img src={active.thumb} alt="" className="size-9 rounded-full object-cover" />
          ) : (
            <span aria-hidden="true" className="size-9 rounded-full bg-stone/40" />
          )}
          <span className="font-sport text-xl">{active.name}</span>
          <span aria-hidden="true" className={`text-xs transition-transform ${open ? "rotate-180" : ""}`}>
            ▲
          </span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Schritt 4: Seite**

`src/app/[locale]/[category]/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CategoryGrid } from "@/components/site/category/category-grid";
import { CategoryPill } from "@/components/site/category/category-pill";
import type { Locale } from "@/i18n/pathnames";
import { CATEGORIES, isCategory } from "@/lib/categories";
import { mediaUrl } from "@/lib/media/keys";
import { loadCategory } from "@/lib/public/data";
import { altText } from "@/lib/public/images";

type Props = { params: Promise<{ locale: string; category: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

// Nur die fünf Kategorien: sonst rendert z. B. /g/vertippt als locale="g" und endet in der ungestylten Next-404.
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isCategory(category)) return {};
  const t = await getTranslations({ locale, namespace: "categories" });
  return { title: t(category) };
}

/** Kategorieseite (Spec §6.2): riesiger Titel bleibt stehen, die Bilder ziehen darüber in drei Spalten vorbei. */
export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategory(category)) notFound();
  setRequestLocale(locale);
  const lang = locale as Locale;
  const [t, content] = await Promise.all([getTranslations(), loadCategory(category)]);
  const name = t(`categories.${category}`);
  const images = content.images.map((image, index) => ({
    id: image.id,
    width: image.width,
    height: image.height,
    color: image.color,
    alt: altText(image, lang, t("home.photoAlt", { category: name, number: index + 1 })),
  }));
  const pill = content.nav.map((item) => ({
    category: item.category,
    name: t(`categories.${item.category}`),
    count: item.count,
    thumb: item.cover ? mediaUrl("portfolio", item.cover.id, 800) : null,
  }));

  return (
    <main className="relative pb-40">
      <div className="sticky top-0 grid h-[100dvh] place-items-center overflow-hidden px-4">
        <div className="flex items-start gap-2 md:gap-4">
          <h1 className="font-sport text-[clamp(4.5rem,18vw,19rem)]">{name}</h1>
          <span className="pt-[0.6em] font-label text-sm text-stone md:text-base">({images.length})</span>
        </div>
      </div>
      <div className="relative z-10 -mt-[45dvh]">
        {images.length === 0 ? (
          <p className="mx-auto max-w-[40ch] px-4 text-center text-lg text-stone">{t("category.empty")}</p>
        ) : (
          <CategoryGrid images={images} />
        )}
      </div>
      <CategoryPill current={category} items={pill} />
    </main>
  );
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 131 PASS, E2E alle grün, darunter die 3 neuen Tests. Der Routing-Test „Kategorien und Seiten haben deutsche Pfade“ prüft weiter die H1 („Floorball“ usw.); der Zähler steht außerhalb der H1.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(public): category pages with offset columns, category pill and lights-out lightbox

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Über mich, Impressum, Datenschutz, Kundenbereich

**Dateien:**
- Erstellen:
  - `src/components/site/text-blocks.tsx`, `src/components/site/legal-page.tsx`
  - `src/app/[locale]/kunden/actions.ts`, `src/app/[locale]/kunden/gallery-code-form.tsx`
  - `test/e2e/public-info.spec.ts`
- Ändern:
  - `src/app/[locale]/ueber-mich/page.tsx`, `impressum/page.tsx`, `datenschutz/page.tsx`, `kunden/page.tsx` (komplett ersetzen)
  - `scripts/check-server-actions.mjs`

**Schnittstellen:**
- Nutzt:
  - Task 1: `loadSettings`, `textBlocks`, `linkParts`, `emphasis`, `galleryCodeToSlug`
  - Task 2: `PortraitFrame`, `link-draw`, Messages `about.*`, `legal.*`, `clients.*`
  - Plan 3: `getGalleryBySlug`, Binding `GALLERY_LIMITER`, E2E-Helfer `createGalleryViaUi`, `publishGallery`, `newContext`, `RUN`
- Stellt bereit:
  - `TextBlocks({ text })`, `LegalPage({ titleKey: "imprint" | "privacy", text })`
  - `openGalleryAction(prev, formData): Promise<CodeState>` mit `type CodeState = { error?: "invalid" | "unknown" | "tooMany"; code?: string }` → Weiterleitung auf `/g/<slug>`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

`test/e2e/public-info.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { RUN, createGalleryViaUi, newContext, publishGallery } from "./helpers/galleries";

test("Über mich: Titel, Statement und Weg zum Kontakt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Über mich");
  await expect(page.getByRole("main").locator(".font-display").first()).not.toBeEmpty();
  await page.getByRole("main").getByRole("link", { name: "Schreib mir" }).click();
  await expect(page).toHaveURL(/\/kontakt$/);
});

test("Impressum und Datenschutz: Titel und Text bzw. Hinweis, auch auf Englisch", async ({ page }) => {
  for (const [path, title] of [
    ["/impressum", "Impressum"],
    ["/datenschutz", "Datenschutz"],
    ["/en/imprint", "Imprint"],
    ["/en/privacy", "Privacy"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    await expect(page.getByRole("main").locator("p").first(), path).not.toBeEmpty();
  }
});

test("Kundenbereich: leerer und unbekannter Code werden erklärt", async ({ page }) => {
  await page.goto("/kunden");
  const code = page.getByLabel("Galerie-Code");
  const open = page.getByRole("button", { name: "Galerie öffnen" });
  await code.fill("***");
  await open.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Bitte gib einen Galerie-Code ein.");
  await expect(code).toHaveValue("***");
  await code.fill(`gibt-es-nicht-${RUN}`);
  await open.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Diese Galerie gibt es nicht. Prüf den Code in deiner Nachricht.");
});

test("Kundenbereich: Code oder Link führt zur Galerie", async ({ browser, page }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const { slug } = await createGalleryViaUi(adminPage, `Code ${RUN}`);
  await publishGallery(adminPage);
  await admin.close();

  await page.goto("/kunden");
  await page.getByLabel("Galerie-Code").fill(`  ${slug.toUpperCase()} `);
  await page.getByRole("button", { name: "Galerie öffnen" }).click();
  await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Code ${RUN}`);

  await page.goto("/en/clients");
  await page.getByLabel("Gallery code").fill(`https://cosmo-photos.de/g/${slug}`);
  await page.getByRole("button", { name: "Open gallery" }).click();
  await expect(page).toHaveURL(new RegExp(`/g/${slug}$`));
});
```

```bash
npm run test:e2e -- public-info.spec.ts
```
Erwartet: FAIL, denn es gibt keinen „Schreib mir“-Link, kein Galerie-Code-Feld und nur den Platzhalter-Text.

- [ ] **Schritt 2: Textblöcke und Pflichtseiten**

`src/components/site/text-blocks.tsx`:

```tsx
import { Fragment } from "react";
import { linkParts, textBlocks } from "@/lib/public/text";

/** Gepflegte Texte als Absätze, Zwischenüberschriften und klickbare Adressen (Spec §6.3). */
export function TextBlocks({ text }: { text: string }) {
  return (
    <>
      {textBlocks(text).map((block, index) =>
        block.kind === "heading" ? (
          <h2 key={index} className="font-display pt-6 text-2xl">
            {block.lines[0]}
          </h2>
        ) : (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 && <br />}
                {linkParts(line).map((part, partIndex) =>
                  part.href ? (
                    <a key={partIndex} href={part.href} className="underline decoration-ink/30 underline-offset-4 hover:decoration-ink">
                      {part.text}
                    </a>
                  ) : (
                    <Fragment key={partIndex}>{part.text}</Fragment>
                  ),
                )}
              </Fragment>
            ))}
          </p>
        ),
      )}
    </>
  );
}
```

`src/components/site/legal-page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { TextBlocks } from "./text-blocks";

/** Impressum und Datenschutz (Spec §6.3): schlichte Textseite, Inhalt aus dem Admin. */
export async function LegalPage({ titleKey, text }: { titleKey: "imprint" | "privacy"; text: string }) {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="max-w-[68ch]">
        <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-none">{t(`pages.${titleKey}`)}</h1>
        <div className="mt-12 space-y-5 leading-relaxed">
          {text.trim() ? <TextBlocks text={text} /> : <p className="text-stone">{t("legal.pending")}</p>}
        </div>
      </div>
    </main>
  );
}
```

`src/app/[locale]/impressum/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import { loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("imprint") };
}

export default async function ImprintPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  return <LegalPage titleKey="imprint" text={locale === "de" ? settings.imprint_de : settings.imprint_en} />;
}
```

`src/app/[locale]/datenschutz/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/site/legal-page";
import { loadSettings } from "@/lib/public/data";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("privacy") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await loadSettings();
  return <LegalPage titleKey="privacy" text={locale === "de" ? settings.privacy_de : settings.privacy_en} />;
}
```

- [ ] **Schritt 3: Über mich**

`src/app/[locale]/ueber-mich/page.tsx` komplett ersetzen:

```tsx
import { Fragment } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PortraitFrame } from "@/components/site/passepartout";
import { TextBlocks } from "@/components/site/text-blocks";
import { Link } from "@/i18n/navigation";
import { loadSettings } from "@/lib/public/data";
import { emphasis } from "@/lib/public/text";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("about") };
}

/** Über mich (Spec §6.3): Porträt im Passepartout, Bodoni-Statement, Text, Referenzen als Liste. */
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations(), loadSettings()]);
  const statement = (locale === "de" ? settings.about_statement_de : settings.about_statement_en) || t("about.statementFallback");
  const text = locale === "de" ? settings.about_text_de : settings.about_text_en;
  const references = settings.references.split("\n").map((line) => line.trim()).filter(Boolean);
  const portrait = settings.about_portrait_id;

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-10 md:px-8 md:pt-16">
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        {portrait && (
          <div className="md:col-span-5 lg:col-span-4">
            <div className="md:sticky md:top-10">
              <PortraitFrame id={portrait} alt={t("home.portraitAlt")} />
            </div>
          </div>
        )}
        <div className={portrait ? "md:col-span-7 lg:col-span-7 lg:col-start-6" : "md:col-span-10 md:col-start-2"}>
          <h1 className="font-label text-xs uppercase tracking-[0.18em] text-stone">{t("pages.about")}</h1>
          <p className="font-display mt-6 pb-[0.08em] text-[clamp(2.5rem,5.5vw,5rem)] leading-[1.02]">
            {emphasis(statement).map((part, index) =>
              part.italic ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>,
            )}
          </p>
          {text && (
            <div className="mt-12 max-w-[62ch] space-y-5 text-lg leading-relaxed">
              <TextBlocks text={text} />
            </div>
          )}
          {references.length > 0 && (
            <section aria-labelledby="references" className="mt-20">
              <h2 id="references" className="font-label text-xs text-stone">
                {t("about.references")}
              </h2>
              <ul className="mt-6 columns-2 gap-8 font-sport text-3xl md:columns-3 md:text-4xl [&>li]:mb-3 [&>li]:break-inside-avoid">
                {references.map((reference) => (
                  <li key={reference}>{reference}</li>
                ))}
              </ul>
            </section>
          )}
          <Link href="/kontakt" className="link-draw mt-16 inline-block text-xl">
            {t("about.cta")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Schritt 4: Kundenbereich**

In `scripts/check-server-actions.mjs` die Zeile `const ALLOW = new Set(["src/app/admin/login/actions.ts", "src/app/g/[slug]/actions.ts"]);` ersetzen durch:

```js
const ALLOW = new Set(["src/app/admin/login/actions.ts", "src/app/g/[slug]/actions.ts", "src/app/[locale]/kunden/actions.ts"]);
```

(Der Kommentar darüber nennt dann auch den Galerie-Code: „Öffentliche Aktionen, die den Zugang erst erzeugen: Admin-Login, Galerie-Passwort, Galerie-Code.“)

`src/app/[locale]/kunden/actions.ts`:

```ts
"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): führt vom Galerie-Code zur Passwortseite der Galerie.
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/env";
import { getGalleryBySlug } from "@/lib/galleries/repo";
import { galleryCodeToSlug } from "@/lib/public/gallery-code";

export type CodeState = { error?: "invalid" | "unknown" | "tooMany"; code?: string };

export async function openGalleryAction(_previous: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "");
  const slug = galleryCodeToSlug(code);
  if (!slug) return { error: "invalid", code };
  // Bremst das Durchprobieren von Codes (gleiches Binding wie die Passwortseite, eigener Schlüssel).
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.GALLERY_LIMITER.limit({ key: `code:${ip}` });
  if (!success) return { error: "tooMany", code };
  const gallery = await getGalleryBySlug(getDb(), slug);
  if (!gallery || gallery.status === "draft") return { error: "unknown", code };
  redirect(`/g/${slug}`);
}
```

`src/app/[locale]/kunden/gallery-code-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { openGalleryAction, type CodeState } from "./actions";

export function GalleryCodeForm() {
  const t = useTranslations("clients");
  const [state, action, pending] = useActionState<CodeState, FormData>(openGalleryAction, {});
  return (
    <form action={action}>
      <label htmlFor="gallery-code" className="block text-sm">
        {t("code")}
      </label>
      <input
        id="gallery-code"
        name="code"
        required
        defaultValue={state.code ?? ""}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={state.error ? true : undefined}
        aria-describedby={state.error ? "gallery-code-hint gallery-code-error" : "gallery-code-hint"}
        className="mt-2 block w-full border-b border-ink/40 bg-transparent py-3 font-label text-lg outline-none transition-colors focus:border-ink aria-[invalid=true]:border-alert"
      />
      <p id="gallery-code-hint" className="mt-3 text-sm text-stone">
        {t("hint")}
      </p>
      {state.error && (
        <p id="gallery-code-error" role="alert" className="mt-3 text-sm text-alert">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <button type="submit" disabled={pending} className="mt-8 rounded-full bg-ink px-7 py-3 text-paper transition active:scale-[0.98] disabled:opacity-60">
        {t("open")}
      </button>
    </form>
  );
}
```

`src/app/[locale]/kunden/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GalleryCodeForm } from "./gallery-code-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("clients") };
}

/** Einstieg Kundenbereich (Spec §6.3): Galerie-Code → Passwortseite der Galerie. */
export default async function ClientsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <main className="mx-auto grid max-w-[1400px] gap-12 px-4 pb-16 pt-10 md:grid-cols-12 md:gap-8 md:px-8 md:pt-16">
      <div className="md:col-span-6">
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("pages.clients")}</h1>
        <p className="mt-6 max-w-[48ch] text-lg text-ink/80">{t("clients.intro")}</p>
      </div>
      <div className="md:col-span-5 md:col-start-8 md:pt-4">
        <GalleryCodeForm />
      </div>
    </main>
  );
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (Wächter: Kunden-Aktion steht in der Ausnahmeliste), Unit 131 PASS, E2E alle grün, darunter die 4 neuen `public-info`-Tests; die Routing-Tests finden weiter „Über mich“, „Kundenbereich“, „Impressum“, „Datenschutz“, „About“, „Clients“, „Imprint“, „Privacy“ als H1.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(public): about, imprint, privacy and client-area pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Kontakt mit Turnstile und Resend

**Dateien:**
- Erstellen:
  - `src/lib/contact/schema.ts`, `turnstile.ts`, `mail.ts`, `submit.ts`, `test/unit/contact.test.ts`
  - `src/app/[locale]/kontakt/actions.ts`, `contact-form.tsx`
  - `test/e2e/contact.spec.ts`
- Ändern: `src/app/[locale]/kontakt/page.tsx` (komplett ersetzen), `wrangler.jsonc`, `.dev.vars.example`, `.dev.vars`, `cloudflare-env.d.ts` (generiert), `scripts/check-server-actions.mjs`
- Löschen: `src/components/placeholder-page.tsx`

**Schnittstellen:**
- Nutzt: Task 1 (`loadSettings`), Task 2 (Messages `contact.*`, Farbe `alert`).
- Stellt bereit:
  - `CONTACT_TOPICS`, `TOPIC_LABELS`, `contactSchema`
  - `verifyTurnstile(token, secret, ip, fetcher?): Promise<boolean>`, `sendMail(mail, apiKey, fetcher?): Promise<boolean>`
  - `contactConfig(env): ContactConfig | null`, `submitContact(form, deps): Promise<ContactState>`
  - `type ContactState = { status: "idle" | "sent" | "invalid" | "tooMany" | "bot" | "failed"; errors?; values? }`
  - `sendContactAction(prev, formData)`, Binding `CONTACT_LIMITER` (3 pro 60 s)

- [ ] **Schritt 1: Fehlschlagenden Unit-Test schreiben**

`test/unit/contact.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contactConfig, submitContact, type ContactConfig } from "@/lib/contact/submit";

const config: ContactConfig = { resendApiKey: "re_test", turnstileSecret: "secret", to: "felix@example.com", from: "Cosmo Photos <onboarding@resend.dev>" };

function form(fields: Record<string, string> = {}) {
  const data = new FormData();
  const values = { name: "Anna Keller", email: "anna@example.org", topic: "wedding", message: "Wir heiraten im Juni in Hamburg.", turnstile: "token", website: "", ...fields };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function fakeFetch(answers: { turnstile?: boolean; resend?: number } = {}) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (String(input).includes("turnstile")) return Response.json({ success: answers.turnstile ?? true });
    return new Response(JSON.stringify({ id: "mail_1" }), { status: answers.resend ?? 200 });
  }) as typeof fetch;
  return { fetcher, calls };
}

const allow = async () => true;

describe("submitContact", () => {
  it("verifies Turnstile and sends one mail via Resend with reply-to, topic and name", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form(), { config, ip: "203.0.113.7", limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls.map((call) => call.url)).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify", "https://api.resend.com/emails"]);
    const verify = calls[0].init?.body as FormData;
    expect([verify.get("secret"), verify.get("response"), verify.get("remoteip")]).toEqual(["secret", "token", "203.0.113.7"]);
    expect((calls[1].init?.headers as Record<string, string>).authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({
      from: "Cosmo Photos <onboarding@resend.dev>",
      to: ["felix@example.com"],
      reply_to: "anna@example.org",
      subject: "Anfrage (Hochzeit) von Anna Keller",
      text: expect.stringContaining("Wir heiraten im Juni in Hamburg."),
    });
  });

  it("returns field errors and keeps the values without calling anything", async () => {
    const { fetcher, calls } = fakeFetch();
    const state = await submitContact(form({ name: " ", email: "keine-mail", message: "kurz" }), { config, ip: null, limit: allow, fetcher });
    expect(state.status).toBe("invalid");
    expect(state.errors).toEqual({ name: true, email: true, message: true });
    expect(state.values?.message).toBe("kurz");
    expect(calls).toEqual([]);
  });

  it("answers bots in the honeypot with a fake success and sends nothing", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form({ website: "https://spam.example" }), { config, ip: null, limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls).toEqual([]);
  });

  it("stops at the rate limit before verifying", async () => {
    const { fetcher, calls } = fakeFetch();
    const state = await submitContact(form(), { config, ip: null, limit: async () => false, fetcher });
    expect(state.status).toBe("tooMany");
    expect(calls).toEqual([]);
  });

  it("rejects a failed Turnstile check without sending", async () => {
    const { fetcher, calls } = fakeFetch({ turnstile: false });
    expect((await submitContact(form(), { config, ip: null, limit: allow, fetcher })).status).toBe("bot");
    expect(calls).toHaveLength(1);
  });

  it("reports a Resend failure and keeps the values", async () => {
    const { fetcher } = fakeFetch({ resend: 500 });
    const state = await submitContact(form(), { config, ip: null, limit: allow, fetcher });
    expect(state.status).toBe("failed");
    expect(state.values?.name).toBe("Anna Keller");
  });

  it("removes line breaks from the subject", async () => {
    const { fetcher, calls } = fakeFetch();
    await submitContact(form({ name: "Anna\nBcc: x@example.com" }), { config, ip: null, limit: allow, fetcher });
    expect(JSON.parse(String(calls[1].init?.body)).subject).toBe("Anfrage (Hochzeit) von Anna Bcc: x@example.com");
  });

  it("only logs with the key 'log' (local, E2E, preview)", async () => {
    const { fetcher, calls } = fakeFetch();
    expect(await submitContact(form(), { config: { ...config, resendApiKey: "log" }, ip: null, limit: allow, fetcher })).toEqual({ status: "sent" });
    expect(calls.map((call) => call.url)).toEqual(["https://challenges.cloudflare.com/turnstile/v0/siteverify"]);
  });
});

describe("contactConfig", () => {
  it("needs Resend key, Turnstile secret and recipient; the sender is optional", () => {
    expect(contactConfig({ RESEND_API_KEY: "re_x", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de" })).toEqual({
      resendApiKey: "re_x",
      turnstileSecret: "s",
      to: "a@b.de",
      from: "Cosmo Photos <onboarding@resend.dev>",
    });
    expect(contactConfig({ RESEND_API_KEY: "re_x", CONTACT_EMAIL: "a@b.de" })).toBeNull();
    expect(contactConfig({ RESEND_API_KEY: "", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de" })).toBeNull();
    expect(contactConfig({ RESEND_API_KEY: "re_x", TURNSTILE_SECRET_KEY: "s", CONTACT_EMAIL: "a@b.de", CONTACT_FROM: "Cosmo Photos <kontakt@cosmo-photos.de>" })?.from).toBe(
      "Cosmo Photos <kontakt@cosmo-photos.de>",
    );
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/lib/contact/submit` wird nicht gefunden; die übrigen 131 Tests bleiben grün.

- [ ] **Schritt 2: Kontakt-Logik implementieren**

`src/lib/contact/schema.ts`:

```ts
import { z } from "zod";

export const CONTACT_TOPICS = ["sport", "wedding", "studio", "gallery", "other"] as const;
export type ContactTopic = (typeof CONTACT_TOPICS)[number];

/** Bezeichnungen im Betreff der Mail an Felix (immer Deutsch). */
export const TOPIC_LABELS: Record<ContactTopic, string> = { sport: "Sport", wedding: "Hochzeit", studio: "Studio", gallery: "Galerie", other: "Sonstiges" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().max(200).regex(EMAIL),
  topic: z.enum(CONTACT_TOPICS).catch("other"),
  message: z.string().trim().min(10).max(5000),
});
```

`src/lib/contact/turnstile.ts`:

```ts
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Prüft das Turnstile-Token serverseitig; jeder Fehler (Netz, Antwort) zählt als „nicht bestanden“. */
export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  fetcher: typeof fetch = (input, init) => fetch(input, init),
): Promise<boolean> {
  if (!token) return false;
  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip);
  try {
    const response = await fetcher(SITEVERIFY, { method: "POST", body });
    if (!response.ok) return false;
    return ((await response.json()) as { success?: boolean }).success === true;
  } catch {
    return false;
  }
}
```

`src/lib/contact/mail.ts`:

```ts
export type Mail = { from: string; to: string; replyTo: string; subject: string; text: string };

/** Versand über die Resend-API. Mit dem Schlüssel „log“ (lokal, E2E, Vorschau) wird nur protokolliert. */
export async function sendMail(mail: Mail, apiKey: string, fetcher: typeof fetch = (input, init) => fetch(input, init)): Promise<boolean> {
  if (apiKey === "log") {
    console.log("[mail:log]", mail.subject);
    return true;
  }
  try {
    const response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ from: mail.from, to: [mail.to], reply_to: mail.replyTo, subject: mail.subject, text: mail.text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
```

`src/lib/contact/submit.ts`:

```ts
import { sendMail } from "./mail";
import { TOPIC_LABELS, contactSchema } from "./schema";
import { verifyTurnstile } from "./turnstile";

export type ContactConfig = { resendApiKey: string; turnstileSecret: string; to: string; from: string };
export type ContactField = "name" | "email" | "message";
export type ContactValues = { name: string; email: string; topic: string; message: string };
export type ContactState = {
  status: "idle" | "sent" | "invalid" | "tooMany" | "bot" | "failed";
  errors?: Partial<Record<ContactField, true>>;
  values?: ContactValues;
};
export type ContactDeps = { config: ContactConfig; ip: string | null; limit: () => Promise<boolean>; fetcher?: typeof fetch };

const DEFAULT_FROM = "Cosmo Photos <onboarding@resend.dev>";

/** Aktiv nur mit Resend-Schlüssel, Turnstile-Secret und Empfänger; sonst zeigt die Seite die Mail-Adresse. */
export function contactConfig(env: Record<string, unknown>): ContactConfig | null {
  const value = (key: string) => (typeof env[key] === "string" && env[key] !== "" ? (env[key] as string) : null);
  const resendApiKey = value("RESEND_API_KEY");
  const turnstileSecret = value("TURNSTILE_SECRET_KEY");
  const to = value("CONTACT_EMAIL");
  if (!resendApiKey || !turnstileSecret || !to) return null;
  return { resendApiKey, turnstileSecret, to, from: value("CONTACT_FROM") ?? DEFAULT_FROM };
}

const field = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
};

/** Reihenfolge: Honeypot → Prüfung → Rate-Limit → Turnstile → Resend. Eingaben kommen bei Fehlern zurück. */
export async function submitContact(form: FormData, deps: ContactDeps): Promise<ContactState> {
  // Honeypot: Bots bekommen ein „Danke“, gesendet wird nichts.
  if (field(form, "website") !== "") return { status: "sent" };

  const values: ContactValues = { name: field(form, "name"), email: field(form, "email"), topic: field(form, "topic"), message: field(form, "message") };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Partial<Record<ContactField, true>> = {};
    for (const issue of parsed.error.issues) errors[issue.path[0] as ContactField] = true;
    return { status: "invalid", errors, values };
  }

  if (!(await deps.limit())) return { status: "tooMany", values };
  if (!(await verifyTurnstile(field(form, "turnstile"), deps.config.turnstileSecret, deps.ip, deps.fetcher))) return { status: "bot", values };

  const { name, email, topic, message } = parsed.data;
  const sender = name.replace(/\s+/g, " ");
  const label = TOPIC_LABELS[topic];
  const sent = await sendMail(
    {
      from: deps.config.from,
      to: deps.config.to,
      replyTo: email,
      subject: `Anfrage (${label}) von ${sender}`,
      text: `${message}\n\n--\n${sender} <${email}>\nThema: ${label}\nGesendet über das Kontaktformular auf cosmo-photos.de.`,
    },
    deps.config.resendApiKey,
    deps.fetcher,
  );
  return sent ? { status: "sent" } : { status: "failed", values };
}
```

```bash
npm test
```
Erwartet: 30 Testdateien, 140 Tests PASS.

- [ ] **Schritt 3: Binding und lokale Werte**

In `wrangler.jsonc` bei den `ratelimits` ergänzen: oben `{ "name": "CONTACT_LIMITER", "namespace_id": "1005", "simple": { "limit": 3, "period": 60 } }`, in `env.preview` `{ "name": "CONTACT_LIMITER", "namespace_id": "1006", "simple": { "limit": 3, "period": 60 } }`.

In `.dev.vars.example` **und** `.dev.vars` am Ende ergänzen (öffentliche Turnstile-Testschlüssel, die immer bestehen; `log` verschickt nichts):

```
RESEND_API_KEY=log
TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
CONTACT_EMAIL=kontakt@example.com
```

```bash
npm run cf-typegen
grep -E "CONTACT_LIMITER|TURNSTILE_SITE_KEY|RESEND_API_KEY|CONTACT_EMAIL" cloudflare-env.d.ts | head
```
Erwartet: Alle vier Namen stehen in den Typen.

- [ ] **Schritt 4: Aktion, Formular, Seite**

In `scripts/check-server-actions.mjs` die `ALLOW`-Zeile ersetzen durch:

```js
const ALLOW = new Set([
  "src/app/admin/login/actions.ts",
  "src/app/g/[slug]/actions.ts",
  "src/app/[locale]/kunden/actions.ts",
  "src/app/[locale]/kontakt/actions.ts",
]);
```

(Kommentar darüber: „Öffentliche Aktionen: Admin-Login, Galerie-Passwort, Galerie-Code, Kontaktformular.“)

`src/app/[locale]/kontakt/actions.ts`:

```ts
"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): Kontaktformular mit Honeypot, Rate-Limit und Turnstile.
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { contactConfig, submitContact, type ContactState } from "@/lib/contact/submit";

export async function sendContactAction(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const { env } = getCloudflareContext();
  const config = contactConfig(env as unknown as Record<string, unknown>);
  if (!config) return { status: "failed" };
  const ip = (await headers()).get("cf-connecting-ip");
  return submitContact(formData, {
    config,
    ip,
    limit: async () => (await env.CONTACT_LIMITER.limit({ key: `contact:${ip ?? "lokal"}` })).success,
  });
}
```

`src/app/[locale]/kontakt/contact-form.tsx`:

```tsx
"use client";

import Script from "next/script";
import { useActionState, useCallback, useEffect, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CONTACT_TOPICS } from "@/lib/contact/schema";
import type { ContactField, ContactState } from "@/lib/contact/submit";
import { sendContactAction } from "./actions";

type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const control =
  "mt-2 block w-full border-b border-ink/40 bg-transparent py-3 text-lg outline-none transition-colors focus:border-ink aria-[invalid=true]:border-alert";

export function ContactForm({ siteKey, fallbackEmail }: { siteKey: string; fallbackEmail: string }) {
  const t = useTranslations("contact");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, { status: "idle" });
  const widget = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<HTMLInputElement>(null);

  // Turnstile explizit rendern; das Token landet direkt im versteckten Feld (kein React-State nötig).
  const renderWidget = useCallback(() => {
    if (!window.turnstile || !widget.current || widgetId.current) return;
    const setToken = (value: string) => {
      if (token.current) token.current.value = value;
    };
    widgetId.current = window.turnstile.render(widget.current, {
      sitekey: siteKey,
      language: locale,
      theme: "light",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
  }, [siteKey, locale]);

  useEffect(() => {
    renderWidget();
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [renderWidget]);

  // Jeder Versuch verbraucht das Token: Feld leeren, Widget zurücksetzen, es holt ein neues.
  useEffect(() => {
    if (state.status === "idle" || !widgetId.current) return;
    if (token.current) token.current.value = "";
    window.turnstile?.reset(widgetId.current);
  }, [state]);

  if (state.status === "sent") {
    return (
      <p role="status" className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.1]">
        {t("sent")}
      </p>
    );
  }

  const invalid = (name: ContactField) => state.errors?.[name] === true;
  const described = (name: ContactField) => (invalid(name) ? `contact-${name}-error` : undefined);
  const general =
    state.status === "tooMany"
      ? t("errors.tooMany")
      : state.status === "bot"
        ? t("errors.bot")
        : state.status === "failed"
          ? fallbackEmail
            ? t("errors.failed", { email: fallbackEmail })
            : t("errors.failedNoMail")
          : null;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />
      <form action={action} className="grid gap-8">
        <div>
          <label htmlFor="contact-name" className="text-sm">
            {t("name")}
          </label>
          <input id="contact-name" name="name" required maxLength={100} autoComplete="name" defaultValue={state.values?.name ?? ""} aria-invalid={invalid("name") || undefined} aria-describedby={described("name")} className={control} />
          {invalid("name") && (
            <p id="contact-name-error" className="mt-2 text-sm text-alert">
              {t("errors.name")}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm">
            {t("email")}
          </label>
          <input id="contact-email" name="email" type="email" required maxLength={200} autoComplete="email" defaultValue={state.values?.email ?? ""} aria-invalid={invalid("email") || undefined} aria-describedby={described("email")} className={control} />
          {invalid("email") && (
            <p id="contact-email-error" className="mt-2 text-sm text-alert">
              {t("errors.email")}
            </p>
          )}
        </div>
        <fieldset>
          <legend className="text-sm">{t("topic")}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {CONTACT_TOPICS.map((topic) => (
              <label key={topic} className="cursor-pointer">
                <input type="radio" name="topic" value={topic} defaultChecked={state.values?.topic === topic} className="peer sr-only" />
                <span className="block rounded-full border border-ink/30 px-4 py-2 text-sm transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {t(`topics.${topic}`)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor="contact-message" className="text-sm">
            {t("message")}
          </label>
          <textarea id="contact-message" name="message" required maxLength={5000} rows={6} defaultValue={state.values?.message ?? ""} aria-invalid={invalid("message") || undefined} aria-describedby={described("message")} className={`${control} resize-y`} />
          {invalid("message") && (
            <p id="contact-message-error" className="mt-2 text-sm text-alert">
              {t("errors.message")}
            </p>
          )}
        </div>
        {/* Honeypot: für Menschen unsichtbar und nicht erreichbar */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <div ref={widget} className="min-h-[65px]" />
        <input ref={token} type="hidden" name="turnstile" defaultValue="" />
        {general && (
          <p role="alert" className="text-sm text-alert">
            {general}
          </p>
        )}
        <button type="submit" disabled={pending} className="justify-self-start rounded-full bg-ink px-8 py-3.5 text-paper transition active:scale-[0.98] disabled:opacity-60">
          {pending ? t("sending") : t("send")}
        </button>
      </form>
    </>
  );
}
```

`src/app/[locale]/kontakt/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { contactConfig } from "@/lib/contact/submit";
import { loadSettings } from "@/lib/public/data";
import { ContactForm } from "./contact-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { title: (await getTranslations({ locale, namespace: "pages" }))("contact") };
}

/** Kontakt (Spec §6.3): Bodoni-Headline, schlichtes Formular; ohne Konfiguration die Mail-Adresse. */
export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, settings] = await Promise.all([getTranslations(), loadSettings()]);
  const { env } = getCloudflareContext();
  const siteKey = typeof env.TURNSTILE_SITE_KEY === "string" ? env.TURNSTILE_SITE_KEY : "";
  const ready = siteKey !== "" && contactConfig(env as unknown as Record<string, unknown>) !== null;
  const email = settings.contact_email;

  return (
    <main className="mx-auto grid max-w-[1400px] gap-16 px-4 pb-16 pt-10 md:grid-cols-12 md:gap-8 md:px-8 md:pt-16">
      <div className="md:col-span-5">
        <h1 className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none">{t("pages.contact")}</h1>
        <p className="font-display mt-6 pb-1 text-[clamp(1.5rem,2.6vw,2.25rem)] italic leading-[1.15] text-ink/80">{t("contact.statement")}</p>
        {email && (
          <div className="mt-12">
            <p className="text-sm text-stone">{t("contact.direct")}</p>
            <a href={`mailto:${email}`} className="link-draw mt-2 inline-block text-lg">
              {email}
            </a>
          </div>
        )}
        {settings.instagram_url && (
          <a href={settings.instagram_url} target="_blank" rel="noopener" className="link-draw mt-6 inline-block text-lg">
            Instagram <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <div className="md:col-span-6 md:col-start-7">
        {ready ? (
          <ContactForm siteKey={siteKey} fallbackEmail={email} />
        ) : (
          <p className="text-lg">
            {t("contact.unavailable")}{" "}
            {email && (
              <a href={`mailto:${email}`} className="underline underline-offset-4">
                {email}
              </a>
            )}
          </p>
        )}
      </div>
    </main>
  );
}
```

Den nicht mehr genutzten Platzhalter löschen:

```bash
git rm src/components/placeholder-page.tsx
grep -rn "placeholder-page" src || echo "keine Verweise"
```
Erwartet: `keine Verweise`.

- [ ] **Schritt 5: E2E-Test**

`test/e2e/contact.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

// Turnstile mit den öffentlichen Testschlüsseln (besteht immer, lädt aber das Skript von Cloudflare).
test("Kontakt: Fehler am Feld, Eingaben bleiben, dann Versand mit Sicherheitsprüfung", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kontakt");
  const token = page.locator('input[name="turnstile"]');

  await page.getByLabel("Name", { exact: true }).fill("Anna Keller");
  await page.getByLabel("E-Mail", { exact: true }).fill("anna@example.org");
  await page.getByText("Hochzeit", { exact: true }).click();
  await page.getByLabel("Nachricht", { exact: true }).fill("kurz");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  await page.getByRole("button", { name: "Nachricht senden" }).click();

  await expect(page.getByText("Deine Nachricht ist etwas kurz (mindestens 10 Zeichen).")).toBeVisible();
  await expect(page.getByLabel("Nachricht", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Anna Keller");
  await expect(page.getByRole("radio", { name: "Hochzeit" })).toBeChecked();

  await page.getByLabel("Nachricht", { exact: true }).fill("Wir heiraten im Juni in Hamburg und suchen noch einen Fotografen.");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.getByRole("status")).toHaveText("Danke! Ich melde mich bald.");
});
```

- [ ] **Schritt 6: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 140 PASS, E2E alle grün, darunter der neue Kontakt-Test; `routing` findet weiter „Kontakt“/„Contact“ als H1.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(public): contact form with Turnstile, rate limit, honeypot and Resend

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Vorschau, Produktion, Kontakt-Secrets

**Dateien:**
- Erstellen: `scripts/set-contact-secrets.sh`
- Ändern: `README.md`, `package.json` (`test:e2e:prod`)

**Schnittstellen:**
- Nutzt: alles aus Task 1–6.
- Stellt bereit: Vorschau und Produktion live. In der Vorschau ist das Kontaktformular mit Testschlüsseln aktiv (`log`, sendet nichts). Die Produktion zeigt bis zu Felix' Schlüsseln die Mail-Adresse.

Die Reihenfolge ist fest: **Vorschau → abschließendes Review → Push → 👤 Felix setzt die Kontakt-Secrets**. Laut Plan-Freigabe ist das erlaubt; der Push auf `main` ist das Produktions-Deployment.

- [ ] **Schritt 1: Secrets-Skript, README, Produktions-Tests**

`scripts/set-contact-secrets.sh`:

```bash
#!/usr/bin/env bash
# Setzt die Secrets des Kontaktformulars. Werte werden verdeckt abgefragt und nie als Argument übergeben.
# Aufruf: bash scripts/set-contact-secrets.sh                (Produktion)
#         bash scripts/set-contact-secrets.sh --env=preview  (Vorschau)
set -euo pipefail
ARGS=("$@")

ask() {
  local name="$1" prompt="$2" value
  read -r -s -p "$prompt: " value
  echo
  if [ -z "$value" ]; then
    echo "  leer, $name bleibt unverändert"
    return
  fi
  printf '%s' "$value" | npx wrangler secret put "$name" ${ARGS[@]+"${ARGS[@]}"} >/dev/null
  echo "  $name gesetzt"
}

ask RESEND_API_KEY "Resend API-Key (beginnt mit re_)"
ask TURNSTILE_SITE_KEY "Turnstile Site-Key"
ask TURNSTILE_SECRET_KEY "Turnstile Secret-Key"
ask CONTACT_EMAIL "Empfänger (bis zur Domain-Prüfung: die E-Mail deines Resend-Kontos)"
```

In `README.md` unter „## Secrets“ die Tabelle um diese Zeile ergänzen:

```markdown
| `RESEND_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL` | Produktion, Vorschau | `bash scripts/set-contact-secrets.sh` (bzw. `-- --env=preview`), siehe unten |
```

und am Ende anfügen:

```markdown
### Kontaktformular

- Es ist nur aktiv, wenn alle vier Kontakt-Secrets gesetzt sind; sonst zeigt `/kontakt` die Mail-Adresse aus „Texte & Links“.
- **Resend:** Bis `cosmo-photos.de` bei Resend geprüft ist (Plan 6, DNS), sendet Resend von `onboarding@resend.dev` und nur an die Adresse des Resend-Kontos. `CONTACT_EMAIL` muss bis dahin genau diese Adresse sein. Danach optional `CONTACT_FROM` (z. B. `Cosmo Photos <kontakt@cosmo-photos.de>`) setzen.
- **Turnstile:** Widget im Cloudflare-Dashboard (Turnstile → Widget hinzufügen). Hostnamen: `cosmo-web.felix-vatterodt.workers.dev`, `cosmo-photos.de`. Modus „Managed“.
- Lokal, in E2E-Tests und in der Vorschau: `RESEND_API_KEY=log` (verschickt nichts) und die öffentlichen Turnstile-Testschlüssel.
- Logo-Pfade: `npm run logo:generate` nach Änderungen an `brand/logo-*.svg` (der Lint prüft es).
```

In `package.json` das Skript `test:e2e:prod` ersetzen durch (neu: `site-frame.spec.ts`, `|Rahmen`):

```json
"test:e2e:prod": "bash scripts/e2e-deployed.sh prod --no-deps routing.spec.ts design-system.spec.ts admin-auth.spec.ts gallery-public.spec.ts site-frame.spec.ts -g \"ohne Anmeldung|gefälscht|Clickjacking|Robust|Deutsch|Englisch|Spracherkennung|Nicht lokalisierte|Tokens|Schriften|unbekannte Galerie|Rahmen\""
```

```bash
chmod +x scripts/set-contact-secrets.sh
npm run lint && npm test
git add -A
git commit -m "docs: contact secrets, logo generation and production smoke tests

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Erwartet: grün, Commit angelegt.

- [ ] **Schritt 2: Vorschau mit Testschlüsseln für das Kontaktformular**

Die Werte sind öffentliche Testschlüssel bzw. `log`, also keine Geheimnisse:

```bash
for pair in "RESEND_API_KEY=log" "TURNSTILE_SITE_KEY=1x00000000000000000000AA" "TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA" "CONTACT_EMAIL=kontakt@example.com"; do
  printf '%s' "${pair#*=}" | npx wrangler secret put "${pair%%=*}" --env preview > /dev/null && echo "${pair%%=*} gesetzt"
done
npx wrangler secret list --env preview | grep -cE "RESEND_API_KEY|TURNSTILE_SITE_KEY|TURNSTILE_SECRET_KEY|CONTACT_EMAIL"
```
Erwartet: viermal „gesetzt“, dann `4`.

- [ ] **Schritt 3: Vorschau deployen und komplett testen**

```bash
npm run deploy:preview
npm run test:e2e:preview
```
Erwartet: Deployment ok, alle E2E-Tests gegen `https://cosmo-web-preview.felix-vatterodt.workers.dev` grün. `public-portfolio` legt in der Vorschau die Kategorie „Hochzeiten“ neu an.

- [ ] **Schritt 4: Abschließendes Review, dann Push (= Produktion)**

Zuerst das abschließende Branch-Review laut executing-plans bzw. subagent-driven-development samt Fix-Runde, dann:

```bash
npm run check:lock
git push origin main
U="https://cosmo-web.felix-vatterodt.workers.dev/"
for i in $(seq 1 60); do
  if curl -s "$U" | grep -q "Zum Inhalt springen"; then echo "LIVE nach ~$((i*10))s"; break; fi
  sleep 10
done
npm run test:e2e:prod
curl -s https://cosmo-web.felix-vatterodt.workers.dev/kontakt | grep -c "Das Formular ist gerade nicht erreichbar"
```
Erwartet:
- `check:lock` grün.
- Die Schleife meldet `LIVE`: Der neue Kopf mit Sprunglink ist in der Produktion.
- `test:e2e:prod` grün (inkl. „Rahmen“).
- Die Kontaktseite zeigt noch den Hinweis (`1`), weil die Produktion noch keine Kontakt-Secrets hat.

- [ ] **Schritt 5: 👤 Felix: Kontaktformular in der Produktion freischalten**

1. Bei resend.com anmelden (kostenlos) → API Keys → „Create API Key“ (Berechtigung „Sending access“).
2. Cloudflare-Dashboard → Turnstile → „Add widget“:
   - Name „Cosmo Kontakt“
   - Hostnamen `cosmo-web.felix-vatterodt.workers.dev` und `cosmo-photos.de`
   - Modus „Managed“
3. Im Projektordner `bash scripts/set-contact-secrets.sh` ausführen. Die vier Werte werden verdeckt abgefragt. `CONTACT_EMAIL` ist die E-Mail-Adresse, mit der du bei Resend angemeldet bist.

Danach (🤖): `/kontakt` in der Produktion zeigt das Formular; eine echte Testnachricht kommt bei Felix an.

