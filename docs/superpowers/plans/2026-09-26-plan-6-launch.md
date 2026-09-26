# Plan 6 · Launch: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Die Seite wird startklar und zieht auf `cosmo-photos.de` um (Spec §14, Phase 6):
- **Adressen:** alte WordPress-Links leiten auf die neuen Seiten, `www` auf die Hauptdomain; Zweitadressen (workers.dev, Vorschau) sind `noindex`.
- **SEO (Spec §10):** Canonical, `hreflang` DE/EN, Open Graph pro Seite (Kategorie = Kapitelbild), strukturierte Daten (Person), `robots.txt`, Sitemap.
- **Marke:** Favicon „C mit Ringausschnitt“ (Spec §5.1), App-Icon, Standard-Vorschaubild für geteilte Links.
- **Sicherheit:** CSP mit Nonce für die öffentlichen Seiten, Grund-Header überall.
- **Performance (Spec §10: LCP < 2,5 s, Lighthouse ≥ 90):**
  - Intro „Seite zuerst“: Die Startseite ist sofort gezeichnet und liegt unter einem Papier-Vorhang.
  - Zeilen-Reveals nur noch unterhalb des ersten Bildschirms.
  - Porträt ohne Lazy-Loading.
  - Bilder aus dem Cloudflare-Cache.
  - Messung mit Lighthouse.
- **Robustheit:**
  - Das Kontaktformular zeigt bei Verbindungsabbruch einen Hinweis statt der Fehlerseite.
  - Die Galerie-Bremse zählt nur Fehlversuche, ein ganzes Team im Hallen-WLAN kommt also gleichzeitig hinein.
  - Test mit einer großen Galerie (über 1 000 Dateien, über 2 GB) auf der Vorschau.
- **Barrierefreiheit:** automatischer axe-Durchgang über alle öffentlichen Seiten und die Galerie; sichtbarer Fokus und kontrastreiche Feldlinien in allen Formularen.
- **Umzug:**
  - Launch-Check gegen die Produktion (Inhalte vollständig?)
  - Anleitung mit Rückweg
  - danach, erst auf Felix' ausdrückliches Go, die Domain auf den Worker

**Architektur:**
- **`src/lib/site.ts`:** eine Quelle für die kanonische Adresse (`https://cosmo-photos.de`) und die Host-Regeln.
  - `custom-worker.ts` setzt die Regeln vor OpenNext durch (Weiterleitung, `noindex`, Grund-Header).
  - `next.config.ts` enthält die WordPress-Weiterleitungen.
- **SEO:**
  - reine Funktionen in `src/lib/seo/*` (URLs, Metadaten, JSON-LD, Robots, Sitemap), unit-getestet
  - Seiten rufen `pageMetadata()` in `generateMetadata` auf
  - `src/app/robots.ts` und `src/app/sitemap.ts` sind dünne Hüllen
- **CSP:** Die Middleware erzeugt pro Anfrage eine Nonce und setzt die CSP auf Anfrage und Antwort.
  - Next versieht damit seine Skripte, das Layout das Boot-Skript, die Kontaktseite das Turnstile-Skript.
  - `strict-dynamic` lässt von Turnstile nachgeladene Skripte zu.
- **„Seite zuerst“:**
  - Der Vorhang (`[data-intro-curtain]`, Schicht 19) ist Teil des Server-Markups der Startseite und nur bei `html[data-intro]` sichtbar. Darunter ist die Seite gezeichnet (LCP), darüber liegen Logo und Navigation im Kopf (Schicht 20).
  - `MotionEffects` zerlegt nur Überschriften, die nicht im ersten Bildschirm stehen.
- **Bilder:** `/media/…` bleibt auf der Hauptdomain. Die Route antwortet aus `caches.default` (Cloudflare-Cache des Standorts), bei Fehlschlag aus R2.
- **Galerie-Bremse:** Fehlversuche stehen in D1 (`unlock_failures`), das Rate-Limit-Binding `GALLERY_LIMITER` entfällt.

**Tech-Stack:**
- Neu: `@axe-core/playwright` 4.13.0 (dev, exakt gepinnt).
- Lighthouse läuft per `npx lighthouse@12` mit dem Chromium von Playwright und ist keine Abhängigkeit.
- Sonst wie Plan 1–5.

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`
- Betroffen: §3.1/§3.4 (Auslieferung der Bilder), §5.1 (Favicon), §5.2 (Intro), §6.4 (Reveals), §7.4 (Galerie-Sicherheit), §10 (Performance, Barrierefreiheit, SEO), §11 (Lighthouse ≥ 90), §12 (Domain, Resend-DNS, Secrets).
- Entscheidungen von Felix am 2026-09-26 (Rückfrage vor diesem Plan):
  - Intro **„Seite zuerst“**
  - Bilder über die **Hauptdomain mit Edge-Cache** statt `img.cosmo-photos.de`

## Planreihe

| Plan | Phase | Status |
|---|---|---|
| 1 · Fundament | Setup, Datenbank, Routing, Tokens, Deploy | ✅ erledigt |
| 2 · Admin-Kern | Login, Upload-Pipeline, Portfolio, Texte | ✅ erledigt |
| 3 · Kundengalerien | Galerien, Passwort, Favoriten, Statistik, ZIP | ✅ erledigt |
| 4 · Öffentliche Seiten | Start, Kategorien, Lightbox, Über mich, Kontakt, Kunden, Pflichtseiten | ✅ erledigt |
| 5 · Bewegung | Intro, Lenis, „Licht aus“, Parallaxe, Übergänge, Mikro-Interaktionen, Reduced Motion | ✅ erledigt |
| **6 · Launch** | SEO, Performance, Barrierefreiheit, Robustheit, Domain-Umzug | **dieser Plan** |

## Globale Vorgaben

- **Regeln aus Plan 1–5 bleiben gültig:**
  - Repo `/Volumes/CosmoDev/cosmo-website`, Branch `main`
  - `npm install --save-exact` + `npm run deps:lock` + `npm run check:lock`
  - Unit-Tests in workerd, E2E gegen `preview:e2e`
  - Kein Em-Dash in sichtbaren Texten
  - WCAG AA
  - Bewegung nur mit `html.has-motion`
  - E2E standardmäßig mit `reducedMotion: "reduce"`, Bewegungs-Tests mit Titel „Bewegung: …“
  - Sitzungs-Flag des Intros `sessionStorage["cosmo-intro"]`
  - Commit-Messages im Conventional-Commits-Stil mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; 👤 = Felix
- **Kanonische Adresse:** `https://cosmo-photos.de`, nur als `SITE_URL` in `src/lib/site.ts`. Canonical, `hreflang`, Sitemap, Open Graph und JSON-LD nutzen immer diese Adresse, auch auf der Vorschau.
- **Schichten (z-index):** Intro-Vorhang 19, Kopf 20, Fortschrittsring 25, Kategorie-Pille 30, Menü/Lightbox 50, Sprunglink 60, Cursor 70.
- **Datenbank:**
  - Neue Migrationen entstehen nur mit `npm run db:generate`.
  - Vor dem Vorschau-Deploy: `npm run db:migrate:preview`.
  - Vor dem Push auf `main`: `npm run db:migrate:remote`. Workers Builds migriert nicht selbst.
- **Push auf `main` = Produktion** (freigegeben mit diesem Plan, wie bisher).
- **Der Domain-Umzug (Task 13) ist davon ausgenommen.** Er braucht das ausdrückliche Go von Felix zum Zeitpunkt des Umzugs, weil er die WordPress-Seite ersetzt.
- **DNS und Dashboards:**
  - Einträge im Cloudflare-Dashboard, bei Resend und bei Turnstile setzt 👤 Felix.
  - Es werden keine API-Tokens angelegt oder verwendet.
  - Mail (MX und SPF bei All-Inkl/kasserver) wird nie angefasst.
- **Lighthouse-Protokoll:** `npm run lighthouse -- <URL> …` (mobil, simuliertes 4G, 3 Läufe je URL nach einem Aufwärm-Aufruf, Median). Kaltstarts des Workers werden getrennt beobachtet und nicht in den Median gemischt.

## Bewusste Abweichungen von der Spec

| Spec | Plan | Grund |
|---|---|---|
| §3.1, §3.4, §12: Portfolio-Bilder über `img.cosmo-photos.de` (R2-Custom-Domain) | `/media/…` auf der Hauptdomain, im Worker aus `caches.default` | Entscheidung Felix (2026-09-26): eine Adresse; das Handy spart eine Verbindung zur zweiten Domain (gerade beim ersten großen Bild); Vorschau identisch; ein Umzugsschritt weniger. Nachteil: Bilder laufen durch den Worker (aus dem Cache) |
| §5.2 / Plan 5: Nach dem Logo-Flug „baut sich die Startseite auf“ (Headline Zeile für Zeile, Collage blendet ein) | „Seite zuerst“: Die Startseite ist sofort gezeichnet und liegt unter einem Papier-Vorhang; der Vorhang hebt sich, während das Logo in den Kopf fliegt, der Inhalt rückt nach | Entscheidung Felix (2026-09-26): LCP-Ziel §10. Lighthouse maß 5,9 s (Start) bzw. 5,1 s (Unterseiten) |
| §6.4: „Überschriften erscheinen Zeile für Zeile“ | nur unterhalb des ersten Bildschirms; oben sind Überschriften sofort da | wie oben: verborgene Überschriften verzögern das LCP um die Zeit bis zum JavaScript |
| §10: strukturierte Daten „Person/Photographer“ | schema.org `Person` mit `jobTitle` | schema.org kennt keinen Typ „Photographer“ |
| §12: Secrets inkl. Absender | `CONTACT_FROM` als normale `var` in `wrangler.jsonc` (nach der Resend-Prüfung) | nicht geheim; so steht er im Repo |
| Plan 3 „für Plan 6“: Aufräum-Job für verwaiste R2-Dateien | nicht in Plan 6 | Kosten im Cent-Bereich, Löschen ist unumkehrbar; wieder aufgreifen, falls R2 unerwartet wächst |

## Review-Fokus

1. **Adressen und Suchmaschinen:**
   - Fälle: `www` mit Pfad und Query; Schrägstrich am Ende; alte WordPress-Pfade (auch mit Query); `/g` gegen `/g/<slug>`; englische Kategorie-Slugs (`/en/football`, `/en/weddings`) in `hreflang`; `workers.dev` und Vorschau nie indexierbar; die Hauptdomain immer.
   - Erwartung: genau ein Sprung auf die richtige Seite; Canonical und `hreflang` stimmen paarweise.
   - *Tests: Task 1 (Unit `hostPolicy`, E2E Weiterleitungen, `noindex`), Task 3 (Unit URLs/Sitemap, E2E Head und Sitemap).*
2. **CSP:**
   - Fälle: jede öffentliche Seite und jeder Zustand (Intro, Lightbox, Menü, View Transition, Turnstile auf `/kontakt`, 404), mit und ohne Bewegung. `/admin` und `/g` behalten ihre eigenen Header.
   - Erwartung: kein einziger CSP-Verstoß; kein Skript ohne Nonce.
   - *Tests: Task 4 (E2E „keine Verstöße“, Nonce am Boot-Skript), Task 1 (Admin behält `same-origin`).*
3. **„Seite zuerst“:**
   - Fälle: Intro überspringen (Taste/Tipp), die 4-s-Sicherheitsnetz-Grenze, Wegnavigieren mitten im Intro, JavaScript fehlt oder bricht ab.
   - Erwartung: Vom ersten Zeichnen an ist entweder der Vorhang da oder die fertige Seite, nie ein Aufblitzen. Der Vorhang verschwindet immer. Keine Überschrift bleibt verborgen.
   - *Tests: Task 5 (E2E Vorhang, Überschriften vor der Hydration sichtbar, Reveal weiter unten).*
4. **Galerie-Bremse:**
   - Fälle: viele gleichzeitige Fehlversuche; mehrere richtige Anmeldungen aus einem WLAN; Codes auf `/kunden` durchprobieren; Uhrzeit-Grenzen.
   - Erwartung: Wer das Passwort kennt, kommt immer hinein. Wer rät, ist nach 5 Fehlversuchen pro Minute gebremst. Die Tabelle wächst nicht unbegrenzt.
   - *Tests: Task 8 (Unit Zählung und Aufräumen, E2E „sechs Personen, dann Raten gebremst“).*
5. **Bilder aus dem Edge-Cache:**
   - Fälle: 404 und Fehler, zweiter Abruf, `content-type` und `etag` aus dem Cache, große Bilder (kein Puffern), `workers.dev` (Cache wirkungslos).
   - Erwartung: nur 200er im Cache; Antworten identisch zu R2.
   - *Tests: Task 6 (Unit Treffer/Fehlschlag/404).*

## Dateistruktur (neu bzw. geändert)

```
src/lib/site.ts                       SITE_URL, hostPolicy, Grund-Header (Task 1)
custom-worker.ts                      Host-Regeln und Header vor OpenNext (Task 1)
next.config.ts                        WordPress-Weiterleitungen, /g → /kunden (Task 1); inlineCss-Versuch (Task 10)
scripts/generate-logo-paths.mjs       erzeugt zusätzlich src/app/icon.svg (Task 2)
scripts/render-brand-images.mjs       apple-icon.png, favicon.ico, og-default.png (Task 2)
src/app/icon.svg · apple-icon.png · favicon.ico · public/og-default.png   (Task 2)
src/lib/seo/urls.ts · metadata.ts · person.ts · robots.ts · sitemap.ts     (Task 3)
src/app/robots.ts · src/app/sitemap.ts                                    (Task 3)
src/app/[locale]/**/page.tsx, layout.tsx, src/messages/*.json             Metadaten (Task 3)
src/lib/csp.ts · src/middleware.ts                                        CSP mit Nonce (Task 4)
src/components/motion/home-intro.tsx · motion-effects.tsx · src/app/globals.css
src/components/site/home/hero.tsx · src/app/[locale]/page.tsx · passepartout.tsx · ueber-mich/page.tsx   (Task 5)
src/lib/media/edge-cache.ts · src/app/media/[...key]/route.ts             (Task 6)
src/app/[locale]/kontakt/contact-form.tsx                                 (Task 7)
src/lib/db/schema.ts · drizzle/0002_*.sql · src/lib/galleries/attempts.ts
src/app/g/[slug]/actions.ts · src/app/[locale]/kunden/actions.ts · wrangler.jsonc · cloudflare-env.d.ts  (Task 8)
test/e2e/helpers/a11y.ts · a11y.spec.ts · Formularfelder (Kontakt, Kunden, Galerie)   (Task 9)
scripts/lighthouse.mjs                                                    (Task 10)
test/e2e/load-gallery.spec.ts                                             (Task 11)
test/e2e/launch.spec.ts · README.md · package.json                        (Task 12)
wrangler.jsonc (routes, CONTACT_FROM) · scripts/e2e-deployed.sh           (Task 13)
```

---

### Task 1: Adressen, Weiterleitungen und Grund-Header

**Dateien:**
- Erstellen: `src/lib/site.ts`, `test/unit/site.test.ts`
- Ändern: `custom-worker.ts`, `next.config.ts`, `test/e2e/routing.spec.ts`

**Schnittstellen:**
- Stellt bereit:
  - `SITE_URL = "https://cosmo-photos.de"`, `CANONICAL_HOST`
  - `hostPolicy(url: URL): { redirect: string | null; indexable: boolean }`
  - `BASE_SECURITY_HEADERS: Record<string, string>`, `HSTS`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/site.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hostPolicy, SITE_URL } from "@/lib/site";

describe("hostPolicy", () => {
  it("leitet www auf die Hauptdomain um, mit Pfad und Query", () => {
    expect(hostPolicy(new URL("https://www.cosmo-photos.de/ueber-mich?x=1"))).toEqual({
      redirect: `${SITE_URL}/ueber-mich?x=1`,
      indexable: false,
    });
  });

  it("nur die Hauptdomain ist indexierbar", () => {
    expect(hostPolicy(new URL("https://cosmo-photos.de/"))).toEqual({ redirect: null, indexable: true });
    expect(hostPolicy(new URL("https://cosmo-web.felix-vatterodt.workers.dev/"))).toEqual({ redirect: null, indexable: false });
    expect(hostPolicy(new URL("https://cosmo-web-preview.felix-vatterodt.workers.dev/floorball"))).toEqual({ redirect: null, indexable: false });
    expect(hostPolicy(new URL("http://localhost:8787/"))).toEqual({ redirect: null, indexable: false });
  });
});
```

An `test/e2e/routing.spec.ts` anhängen:

```ts
test("Alte WordPress-Adressen leiten auf die neuen Seiten um", async ({ request }) => {
  const cases: [string, string][] = [
    ["/biography/", "/ueber-mich"],
    ["/contact-3/", "/kontakt"],
    ["/privacy-policy/", "/datenschutz"],
    ["/cokkie-einstellungen/", "/datenschutz"],
    ["/etv-spieltagsheft/", "/floorball"],
    ["/flv_portfolio/42/", "/"],
    ["/category/sport/", "/"],
    ["/2016/05/19/post-title-3/", "/"],
    ["/g", "/kunden"],
  ];
  for (const [from, to] of cases) {
    const response = await request.get(from);
    expect(pathOf(response.url()), from).toBe(to);
    expect(response.status(), from).toBe(200);
  }
});

test("Zweitadressen (hier localhost) sind noindex; Grund-Header gesetzt, strengere bleiben", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(response.headers()["permissions-policy"]).toContain("camera=()");
  const admin = await request.get("/admin/login");
  expect(admin.headers()["referrer-policy"]).toBe("same-origin");
});
```

```bash
npm test -- site && npm run test:e2e -- routing.spec.ts
```
Erwartet: Der Unit-Test scheitert (Modul `@/lib/site` fehlt), die beiden neuen E2E-Tests scheitern (404 statt Weiterleitung, kein `x-robots-tag`). Die bestehenden Routing-Tests bleiben grün.

- [ ] **Schritt 2: `src/lib/site.ts`**

```ts
/** Kanonische Adresse der Seite (Spec §12). Canonical, hreflang, Sitemap, Open Graph und JSON-LD entstehen hieraus. */
export const SITE_URL = "https://cosmo-photos.de";
export const CANONICAL_HOST = new URL(SITE_URL).host;

export type HostPolicy = { redirect: string | null; indexable: boolean };

/**
 * www → Hauptdomain (301). Nur die Hauptdomain darf in den Index: workers.dev, Vorschau und localhost bekommen
 * noindex (Spec §10), damit nie eine Zweitadresse neben cosmo-photos.de auftaucht.
 */
export function hostPolicy(url: URL): HostPolicy {
  if (url.host === `www.${CANONICAL_HOST}`) {
    return { redirect: `${SITE_URL}${url.pathname}${url.search}`, indexable: false };
  }
  return { redirect: null, indexable: url.host === CANONICAL_HOST };
}

/** Für alle Seiten-Antworten; vorhandene (z. B. strengere für /admin und /g) haben Vorrang. Die CSP setzt die Middleware. */
export const BASE_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

/** Ohne includeSubDomains: Unter cosmo-photos.de laufen auch fremde Dienste (Mail bei All-Inkl). */
export const HSTS = "max-age=31536000";
```

- [ ] **Schritt 3: `custom-worker.ts`**

Import ergänzen:

```ts
import { BASE_SECURITY_HEADERS, HSTS, hostPolicy } from "./src/lib/site";
```

Vor `export default` einfügen:

```ts
/** Grund-Header ergänzen (vorhandene bleiben), Zweitadressen auf noindex. Galerie-Dateien und ZIPs laufen daran vorbei. */
function withSiteHeaders(response: Response, indexable: boolean, secure: boolean): Response {
  const result = new Response(response.body, response);
  for (const [name, value] of Object.entries(BASE_SECURITY_HEADERS)) {
    if (!result.headers.has(name)) result.headers.set(name, value);
  }
  if (secure) result.headers.set("Strict-Transport-Security", HSTS);
  if (!indexable) result.headers.set("X-Robots-Tag", "noindex, nofollow");
  return result;
}
```

Den Rumpf von `fetch` ersetzen durch:

```ts
    if (hasMalformedPath(request.url)) {
      return new Response("400 · Ungültige Adresse / Bad request", {
        status: 400,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    const url = new URL(request.url);
    const policy = hostPolicy(url);
    if (policy.redirect) return Response.redirect(policy.redirect, 301);
    // Galerie-Dateien, Originale und ZIP direkt im Worker (streamend, ohne Next). Unverändert durchreichen:
    // Die ZIP-Antwort braucht ihre feste Content-Length (Fortschrittsbalken).
    const galleryResponse = await handleGalleryEdge(request, env, ctx);
    if (galleryResponse) return galleryResponse;
    return withSiteHeaders(await handler.fetch(request, env, ctx), policy.indexable, url.protocol === "https:");
```

- [ ] **Schritt 4: Weiterleitungen in `next.config.ts`**

In `nextConfig` vor `async headers()` einfügen:

```ts
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
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün (Zahl ≥ 151), E2E alle grün, darunter die zwei neuen Routing-Tests.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(launch): canonical host rules, WordPress redirects and base security headers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Marke: Favicon, App-Icon, Vorschaubild

**Dateien:**
- Ändern: `scripts/generate-logo-paths.mjs` (erzeugt zusätzlich `src/app/icon.svg`), `package.json` (`brand:render`), `test/e2e/site-frame.spec.ts`
- Erstellen: `scripts/render-brand-images.mjs`, `src/app/icon.svg` (generiert), `src/app/apple-icon.png`, `public/og-default.png`
- Ersetzen: `src/app/favicon.ico` (bisher das Next-Standard-Icon)

**Schnittstellen:**
- Stellt bereit: `/icon.svg`, `/apple-icon.png`, `/favicon.ico`, `/og-default.png` (1200 × 630, Standard-Vorschaubild in Task 3)

- [ ] **Schritt 1: Fehlschlagenden E2E-Test anhängen**

An `test/e2e/site-frame.spec.ts` anhängen:

```ts
test("Rahmen: Favicon, App-Icon und Vorschaubild sind eingebunden und erreichbar", async ({ page, request }) => {
  await page.goto("/");
  const svgIcon = await page.locator('head link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
  const appleIcon = await page.locator('head link[rel="apple-touch-icon"]').getAttribute("href");
  expect(svgIcon).toMatch(/^\/icon\.svg/);
  expect(appleIcon).toMatch(/^\/apple-icon\.png/);
  const files: [string, string][] = [
    [svgIcon!, "image/svg+xml"],
    [appleIcon!, "image/png"],
    ["/favicon.ico", "image/x-icon"],
    ["/og-default.png", "image/png"],
  ];
  for (const [path, type] of files) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toContain(type);
  }
  // „C“ mit Ringausschnitt (Spec §5.1)
  expect(await (await request.get(svgIcon!)).text()).toContain('viewBox="2 14 53 53"');
});
```

```bash
npm run test:e2e -- site-frame.spec.ts
```
Erwartet: Der neue Test scheitert (kein `link[rel=icon][type=image/svg+xml]`).

- [ ] **Schritt 2: Favicon als SVG generieren**

`scripts/generate-logo-paths.mjs` komplett ersetzen:

```js
// Erzeugt src/components/site/logo-paths.ts und src/app/icon.svg aus brand/logo-wordmark.svg und brand/logo-lockup.svg.
// Mit --check (Teil von npm run lint) wird nur geprüft, ob beide Dateien zu den SVGs passen.
import { readFileSync, writeFileSync } from "node:fs";

const PATHS_OUT = "src/components/site/logo-paths.ts";
const ICON_OUT = "src/app/icon.svg";
// Index des Rings in der Wortmarke (wie LOGO_RING_INDEX in src/lib/motion/logo-pieces.ts); 0–2 sind die Teile des C.
const RING = 14;

function read(file) {
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((match) => match[1]);
  if (!viewBox || paths.length === 0) throw new Error(`${file}: viewBox oder Pfade fehlen`);
  return { viewBox, paths };
}

const wordmark = read("brand/logo-wordmark.svg");
const lockup = read("brand/logo-lockup.svg");

const paths =
  "// Generiert von scripts/generate-logo-paths.mjs aus brand/*.svg – nicht von Hand ändern (npm run logo:generate).\n" +
  `export const WORDMARK = ${JSON.stringify(wordmark, null, 2)} as const;\n\n` +
  `export const LOCKUP = ${JSON.stringify(lockup, null, 2)} as const;\n`;

// Favicon (Spec §5.1): „C“ mit Ringausschnitt – die drei Teile des C und der Ring, auf das C zugeschnitten
// (C: x 17,7–50,7, y 16,1–65,4; der Ring beginnt bei x 3,6). Im dunklen Browser-Tab hell.
const icon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 14 53 53">' +
  "<style>path{fill:#141414}@media (prefers-color-scheme:dark){path{fill:#eceae4}}</style>" +
  [0, 1, 2, RING].map((index) => `<path d="${wordmark.paths[index]}"/>`).join("") +
  "</svg>\n";

const outputs = [
  [PATHS_OUT, paths],
  [ICON_OUT, icon],
];

if (process.argv.includes("--check")) {
  const stale = outputs.filter(([file, content]) => {
    try {
      return readFileSync(file, "utf8") !== content;
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`${stale.map(([file]) => file).join(", ")} passt nicht zu brand/*.svg – npm run logo:generate ausführen.`);
    process.exit(1);
  }
  console.log("Logo-Pfade und Favicon aktuell.");
} else {
  for (const [file, content] of outputs) {
    writeFileSync(file, content);
    console.log(`geschrieben: ${file}`);
  }
}
```

```bash
npm run logo:generate && git diff --stat src/components/site/logo-paths.ts
```
Erwartet: `geschrieben:` für beide Dateien; `logo-paths.ts` unverändert (kein Diff).

- [ ] **Schritt 3: Bilder rendern**

`scripts/render-brand-images.mjs`:

```js
// Rendert die Marken-Bilder aus den SVGs (nach Logo-Änderungen erneut; das Ergebnis liegt im Repo):
// src/app/apple-icon.png (180 px), src/app/favicon.ico (32 px, PNG im ICO), public/og-default.png (1200 × 630).
import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";

const PAPER = "#f1efea";
const icon = readFileSync("src/app/icon.svg", "utf8");
const lockup = readFileSync("brand/logo-lockup.svg", "utf8");
const sized = (svg, width) => svg.replace("<svg ", `<svg width="${width}" `);

const browser = await chromium.launch();
const page = await browser.newPage({ colorScheme: "light" });

async function render(svg, width, height) {
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<!doctype html><body style="margin:0;width:${width}px;height:${height}px;display:grid;place-items:center;background:${PAPER}">${svg}</body>`,
  );
  return page.screenshot({ type: "png" });
}

/** ICO-Datei mit einem einzelnen PNG (von allen aktuellen Browsern unterstützt). */
function icoFromPng(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // Typ: Icon
  header.writeUInt16LE(1, 4); // ein Bild
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0);
  entry.writeUInt8(size, 1);
  entry.writeUInt16LE(1, 4); // Farbebenen
  entry.writeUInt16LE(32, 6); // Bit pro Pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

writeFileSync("src/app/apple-icon.png", await render(sized(icon, 124), 180, 180));
writeFileSync("src/app/favicon.ico", icoFromPng(await render(sized(icon, 28), 32, 32), 32));
writeFileSync("public/og-default.png", await render(sized(lockup, 640), 1200, 630));
await browser.close();
console.log("geschrieben: src/app/apple-icon.png, src/app/favicon.ico, public/og-default.png");
```

In `package.json` bei den Skripten nach `"logo:generate"` ergänzen:

```json
    "brand:render": "node scripts/render-brand-images.mjs",
```

```bash
npm run brand:render && file src/app/apple-icon.png src/app/favicon.ico public/og-default.png
```
Erwartet: `PNG image data, 180 x 180`, `MS Windows icon resource … 32x32`, `PNG image data, 1200 x 630`.

Sichtprüfung: die drei Bilder mit dem Read-Werkzeug ansehen.
- Das C mit Ringausschnitt ist mittig und erkennbar.
- Das Vorschaubild zeigt den Lockup mittig auf Papier.

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (inkl. `logo:generate --check` für beide Dateien), Unit grün, E2E alle grün.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(launch): favicon with ring cut-out, apple icon and default share image

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: SEO: Canonical, hreflang, Open Graph, JSON-LD, robots.txt, Sitemap

**Dateien:**
- Erstellen:
  - `src/lib/seo/urls.ts`, `metadata.ts`, `person.ts`, `robots.ts`, `sitemap.ts`
  - `src/app/robots.ts`, `src/app/sitemap.ts`
  - `test/unit/seo.test.ts`, `test/e2e/seo.spec.ts`
- Ändern:
  - `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `[category]/page.tsx`
  - `ueber-mich/page.tsx`, `kontakt/page.tsx`, `kunden/page.tsx`, `impressum/page.tsx`, `datenschutz/page.tsx`
  - `src/messages/de.json`, `src/messages/en.json`

**Schnittstellen:**
- Nutzt: Task 1 (`SITE_URL`, `hostPolicy`), Task 2 (`/og-default.png`), `PATHNAMES`/`externalPath`, `mediaUrl`, `targetSize`, `Settings`.
- Stellt bereit:
  - `localizedUrl(path, locale)`, `languageAlternates(path)`, `type PublicPath`
  - `pageMetadata({ path, locale, title, description, image?, absoluteTitle? })`, `portfolioOgImage(image, alt)`, `DEFAULT_OG_IMAGE`, `SITE_NAME`
  - `personJsonLd(settings, locale)`, `jsonLdScript(data)`
  - `robotsRules(indexable)`, `sitemapEntries()`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/seo.test.ts`:

```ts
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
    expect(localizedUrl("/", "de")).toBe(`${SITE_URL}/`);
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
      url: `${SITE_URL}/`,
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
```

`test/e2e/seo.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const SITE = "https://cosmo-photos.de";

const headOf = (page: Page) => ({
  canonical: () => page.locator('head link[rel="canonical"]').getAttribute("href"),
  alternate: (lang: string) => page.locator(`head link[rel="alternate"][hreflang="${lang}"]`).getAttribute("href"),
  property: (name: string) => page.locator(`head meta[property="${name}"]`).first().getAttribute("content"),
  description: () => page.locator('head meta[name="description"]').getAttribute("content"),
});

test("Suchmaschinen: Startseite mit Canonical, hreflang, Open Graph und strukturierten Daten", async ({ page }) => {
  await page.goto("/");
  const head = headOf(page);
  expect(await head.canonical()).toBe(`${SITE}/`);
  expect(await head.alternate("de")).toBe(`${SITE}/`);
  expect(await head.alternate("en")).toBe(`${SITE}/en`);
  expect(await head.alternate("x-default")).toBe(`${SITE}/`);
  expect(await head.property("og:locale")).toBe("de_DE");
  expect(await head.property("og:image")).toMatch(/^https:\/\/cosmo-photos\.de\//);
  const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(data).toMatchObject({ "@type": "Person", name: "Felix Vatterodt", address: { addressLocality: "Hamburg" } });
});

test("Suchmaschinen: englische Kategorie mit lokalisiertem Pfad und deutschem Gegenstück", async ({ page }) => {
  await page.goto("/en/weddings");
  const head = headOf(page);
  expect(await head.canonical()).toBe(`${SITE}/en/weddings`);
  expect(await head.alternate("de")).toBe(`${SITE}/hochzeiten`);
  expect(await head.property("og:locale")).toBe("en_US");
  expect(await head.description()).toBe("Wedding photography from Hamburg by Felix Vatterodt.");
  expect(await page.title()).toBe("Weddings · Cosmo Photos");
});

test("Suchmaschinen: Sitemap mit beiden Sprachen, robots.txt passend zur Adresse", async ({ request, baseURL }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain(`<loc>${SITE}/en/weddings</loc>`);
  expect(sitemap).toContain(`hreflang="de" href="${SITE}/hochzeiten"`);
  expect(sitemap).not.toContain("/g/");
  const robots = await (await request.get("/robots.txt")).text();
  if (new URL(baseURL!).host === "cosmo-photos.de") {
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  } else {
    expect(robots).toMatch(/^Disallow: \/\s*$/m);
  }
  const old = await request.get("/wp-sitemap.xml");
  expect(new URL(old.url()).pathname).toBe("/sitemap.xml");
});
```

```bash
npm test -- seo && npm run test:e2e -- seo.spec.ts
```
Erwartet: Der Unit-Test scheitert (Module fehlen), die E2E-Tests scheitern (kein Canonical, 404 für Sitemap).

- [ ] **Schritt 2: SEO-Bausteine**

`src/lib/seo/urls.ts`:

```ts
import { externalPath, type Locale, type PATHNAMES } from "@/i18n/pathnames";
import { SITE_URL } from "@/lib/site";

export type PublicPath = keyof typeof PATHNAMES;

/** Absolute URL einer öffentlichen Seite: Deutsch ohne Präfix, Englisch mit /en und lokalisiertem Pfad (Spec §3.2). */
export function localizedUrl(path: PublicPath, locale: Locale): string {
  const external = externalPath(path, locale);
  if (locale === "de") return `${SITE_URL}${external}`;
  return `${SITE_URL}/en${external === "/" ? "" : external}`;
}

/** hreflang-Paar (Spec §10); x-default ist die deutsche Fassung. */
export function languageAlternates(path: PublicPath): Record<"de" | "en" | "x-default", string> {
  return { de: localizedUrl(path, "de"), en: localizedUrl(path, "en"), "x-default": localizedUrl(path, "de") };
}
```

Falls `PATHNAMES` in `src/i18n/pathnames.ts` nur als Wert exportiert ist, den Import auf `import { externalPath, PATHNAMES, type Locale } from "@/i18n/pathnames";` ändern und `keyof typeof PATHNAMES` beibehalten.

`src/lib/seo/metadata.ts`:

```ts
import type { Metadata } from "next";
import type { Locale } from "@/i18n/pathnames";
import { targetSize } from "@/lib/image/sizing";
import { mediaUrl } from "@/lib/media/keys";
import { SITE_URL } from "@/lib/site";
import { languageAlternates, localizedUrl, type PublicPath } from "./urls";

export type OgImage = { url: string; width?: number; height?: number; alt?: string };

export const SITE_NAME = "Cosmo Photos";
export const DEFAULT_OG_IMAGE: OgImage = { url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: SITE_NAME };

const OG_LOCALE = { de: "de_DE", en: "en_US" } as const;

type Input = {
  path: PublicPath;
  locale: Locale;
  /** Seitentitel; das Layout ergänzt „· Cosmo Photos“ (außer bei absoluteTitle). */
  title: string;
  description: string;
  image?: OgImage | null;
  absoluteTitle?: boolean;
};

/** Metadaten einer öffentlichen Seite (Spec §10): Canonical, hreflang, Open Graph und Twitter-Karte. */
export function pageMetadata({ path, locale, title, description, image = null, absoluteTitle = false }: Input): Metadata {
  const url = localizedUrl(path, locale);
  const fullTitle = absoluteTitle ? title : `${title} · ${SITE_NAME}`;
  const images = [image ?? DEFAULT_OG_IMAGE];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url,
      title: fullTitle,
      description,
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === "de" ? "en" : "de"]],
      images,
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((entry) => entry.url) },
  };
}

/** Vorschaubild aus dem Portfolio: die 1600er-Größe mit ihren echten Maßen (kleine Originale werden nicht vergrößert). */
export function portfolioOgImage(image: { id: string; width: number; height: number }, alt: string): OgImage {
  const { width, height } = targetSize(image.width, image.height, 1600);
  return { url: `${SITE_URL}${mediaUrl("portfolio", image.id, 1600)}`, width, height, alt };
}
```

`src/lib/seo/person.ts`:

```ts
import type { Locale } from "@/i18n/pathnames";
import { mediaUrl } from "@/lib/media/keys";
import type { Settings } from "@/lib/settings/schema";
import { SITE_URL } from "@/lib/site";
import { localizedUrl } from "./urls";

/** Strukturierte Daten (Spec §10): schema.org kennt keinen „Photographer“, deshalb Person mit Berufsbezeichnung. */
export function personJsonLd(settings: Settings, locale: Locale): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Felix Vatterodt",
    alternateName: "Cosmo Photos",
    jobTitle: locale === "de" ? "Fotograf" : "Photographer",
    url: localizedUrl("/", locale),
    ...(settings.about_portrait_id ? { image: `${SITE_URL}${mediaUrl("site", settings.about_portrait_id, 1600)}` } : {}),
    ...(settings.instagram_url ? { sameAs: [settings.instagram_url] } : {}),
    address: { "@type": "PostalAddress", addressLocality: "Hamburg", addressCountry: "DE" },
    knowsAbout: locale === "de" ? ["Floorball", "Volleyball", "Fußball", "Hochzeiten", "Studiofotografie"] : ["Floorball", "Volleyball", "Football", "Weddings", "Studio photography"],
  };
}

/** Als Inhalt eines <script type="application/ld+json">: „<“ maskiert, damit Texte das Element nie schließen. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
```

`src/lib/seo/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Nur die Hauptdomain wird gecrawlt (Galerien und Admin nie); Zweitadressen sperren alles (Task 1: noindex). */
export function robotsRules(indexable: boolean): MetadataRoute.Robots {
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/g/", "/api/"] }, sitemap: `${SITE_URL}/sitemap.xml` };
}
```

`src/lib/seo/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { PATHNAMES } from "@/i18n/pathnames";
import { languageAlternates, localizedUrl, type PublicPath } from "./urls";

/** Sitemap DE/EN mit hreflang (Spec §10): jede öffentliche Seite in beiden Sprachen. Galerien bleiben draußen. */
export function sitemapEntries(): MetadataRoute.Sitemap {
  return (Object.keys(PATHNAMES) as PublicPath[]).flatMap((path) =>
    (["de", "en"] as const).map((locale) => ({
      url: localizedUrl(path, locale),
      alternates: { languages: languageAlternates(path) },
      changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.7,
    })),
  );
}
```

`src/app/robots.ts`:

```ts
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { robotsRules } from "@/lib/seo/robots";
import { hostPolicy } from "@/lib/site";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  return robotsRules(hostPolicy(new URL(`https://${host}`)).indexable);
}
```

`src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo/sitemap";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries();
}
```

- [ ] **Schritt 3: Beschreibungen (DE/EN)**

In `src/messages/de.json` im Objekt `"meta"` nach `"description"` ergänzen:

```json
    "descriptions": {
      "floorball": "Floorball-Fotografie aus Hamburg von Felix Vatterodt.",
      "volleyball": "Volleyball-Fotografie aus Hamburg von Felix Vatterodt.",
      "fussball": "Fußball-Fotografie aus Hamburg von Felix Vatterodt.",
      "hochzeiten": "Hochzeitsfotografie aus Hamburg von Felix Vatterodt.",
      "studio": "Studiofotografie aus Hamburg von Felix Vatterodt.",
      "about": "Felix Vatterodt fotografiert als Cosmo Photos Sport, Hochzeiten und Studio in Hamburg.",
      "contact": "Anfrage für Fotos in Hamburg: Schreib Cosmo Photos eine Nachricht.",
      "clients": "Kundenbereich von Cosmo Photos: Galerie-Code eingeben, Fotos ansehen und herunterladen.",
      "imprint": "Impressum von Cosmo Photos, Felix Vatterodt, Hamburg.",
      "privacy": "Datenschutzerklärung von Cosmo Photos."
    }
```

In `src/messages/en.json` entsprechend:

```json
    "descriptions": {
      "floorball": "Floorball photography from Hamburg by Felix Vatterodt.",
      "volleyball": "Volleyball photography from Hamburg by Felix Vatterodt.",
      "fussball": "Football photography from Hamburg by Felix Vatterodt.",
      "hochzeiten": "Wedding photography from Hamburg by Felix Vatterodt.",
      "studio": "Studio photography from Hamburg by Felix Vatterodt.",
      "about": "Felix Vatterodt photographs sports, weddings and studio work in Hamburg as Cosmo Photos.",
      "contact": "Photos in Hamburg: send Cosmo Photos a message.",
      "clients": "Cosmo Photos client area: enter your gallery code to view and download your photos.",
      "imprint": "Imprint of Cosmo Photos, Felix Vatterodt, Hamburg.",
      "privacy": "Privacy policy of Cosmo Photos."
    }
```

- [ ] **Schritt 4: Metadaten in Layout und Seiten**

`src/app/[locale]/layout.tsx`:
- Import ergänzen: `import { SITE_URL } from "@/lib/site";`
- Im Rückgabewert von `generateMetadata` `metadataBase: new URL(SITE_URL),` als erste Eigenschaft ergänzen (Titel-Template und Beschreibung bleiben).

`src/app/[locale]/page.tsx`:
- Importe ergänzen:

```tsx
import type { Metadata } from "next";
import { jsonLdScript, personJsonLd } from "@/lib/seo/person";
import { pageMetadata, portfolioOgImage } from "@/lib/seo/metadata";
```

- vor `export default` einfügen:

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, home] = await Promise.all([getTranslations({ locale, namespace: "meta" }), loadHome()]);
  const hero = home.heroes[0];
  return pageMetadata({
    path: "/",
    locale: locale as Locale,
    title: t("title"),
    absoluteTitle: true,
    description: t("description"),
    image: hero ? portfolioOgImage(hero, t("title")) : null,
  });
}
```

- als erstes Kind von `<main>` einfügen:

```tsx
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(personJsonLd(settings, lang)) }} />
```

`src/app/[locale]/[category]/page.tsx`: `generateMetadata` ersetzen durch

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isCategory(category)) return {};
  const [t, content] = await Promise.all([getTranslations({ locale }), loadCategory(category)]);
  const name = t(`categories.${category}`);
  const cover = content.nav.find((item) => item.category === category)?.cover;
  return pageMetadata({
    path: `/${category}`,
    locale: locale as Locale,
    title: name,
    description: t(`meta.descriptions.${category}`),
    image: cover ? portfolioOgImage(cover, name) : null,
  });
}
```
Import ergänzen: `import { pageMetadata, portfolioOgImage } from "@/lib/seo/metadata";`. Falls `Locale` dort noch nicht importiert ist: `import type { Locale } from "@/i18n/pathnames";`.

`src/app/[locale]/ueber-mich/page.tsx`: `generateMetadata` ersetzen durch

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const [t, settings] = await Promise.all([getTranslations({ locale }), loadSettings()]);
  const portrait = settings.about_portrait_id;
  return pageMetadata({
    path: "/ueber-mich",
    locale: locale as Locale,
    title: t("pages.about"),
    description: t("meta.descriptions.about"),
    image: portrait ? { url: `${SITE_URL}${mediaUrl("site", portrait, 1600)}`, alt: t("home.portraitAlt") } : null,
  });
}
```
Importe ergänzen: `pageMetadata` aus `@/lib/seo/metadata`, `SITE_URL` aus `@/lib/site`, `mediaUrl` aus `@/lib/media/keys`, `loadSettings` aus `@/lib/public/data` (falls nicht vorhanden), `type Locale` aus `@/i18n/pathnames`.

`kontakt/page.tsx`, `kunden/page.tsx`, `impressum/page.tsx`, `datenschutz/page.tsx`: `generateMetadata` jeweils ersetzen durch (Pfad und Schlüssel je Seite: `"/kontakt"`/`contact`, `"/kunden"`/`clients`, `"/impressum"`/`imprint`, `"/datenschutz"`/`privacy`):

```tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata({ path: "/kontakt", locale: locale as Locale, title: t("pages.contact"), description: t("meta.descriptions.contact") });
}
```
Importe: `pageMetadata` aus `@/lib/seo/metadata`, `type Locale` aus `@/i18n/pathnames`.

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün (inkl. `seo`), E2E alle grün, darunter die drei SEO-Tests. Bestehende Titel-Tests (z. B. „Weddings · Cosmo Photos“) bleiben grün.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(launch): canonical, hreflang, open graph, person json-ld, robots and sitemap

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: CSP mit Nonce für die öffentlichen Seiten

**Dateien:**
- Erstellen: `src/lib/csp.ts`, `test/unit/csp.test.ts`, `test/e2e/security.spec.ts`
- Ändern: `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/kontakt/page.tsx`, `src/app/[locale]/kontakt/contact-form.tsx`

**Schnittstellen:**
- Stellt bereit:
  - `contentSecurityPolicy(nonce: string, dev?: boolean): string`, `createNonce(): string`
  - Anfrage-Header `x-nonce` (nur für Seiten unter `[locale]`)

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/csp.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, createNonce } from "@/lib/csp";

describe("contentSecurityPolicy", () => {
  it("Skripte nur mit Nonce und strict-dynamic, Turnstile als einzige Fremdquelle, kein Einbetten", () => {
    const policy = contentSecurityPolicy("abc");
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic' https://challenges.cloudflare.com");
    expect(policy).toContain("frame-src https://challenges.cloudflare.com");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).not.toContain("unsafe-eval");
  });

  it("Entwicklung (next dev): unsafe-eval für React Refresh", () => {
    expect(contentSecurityPolicy("abc", true)).toContain("'unsafe-eval'");
  });
});

describe("createNonce", () => {
  it("128 Bit zufällig, Base64", () => {
    const nonce = createNonce();
    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(createNonce()).not.toBe(nonce);
  });
});
```

`test/e2e/security.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";

const collectViolations = () => {
  const store = window as unknown as { cspViolations: string[] };
  store.cspViolations = [];
  document.addEventListener("securitypolicyviolation", (event) => store.cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`));
};
const violations = (page: Page) => page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);

test("CSP: öffentliche Seiten senden eine CSP mit Nonce, das Boot-Skript trägt sie; Admin behält seine", async ({ page }) => {
  const response = await page.goto("/");
  const csp = response!.headers()["content-security-policy"];
  const nonce = csp.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(csp).toContain("'strict-dynamic'");
  expect(csp).toContain("frame-ancestors 'none'");
  // Das nonce-Attribut ist im DOM verborgen, die Property bleibt lesbar.
  expect(await page.locator("body > script").first().evaluate((script) => (script as HTMLScriptElement).nonce)).toBe(nonce);
  expect((await page.request.get("/")).headers()["content-security-policy"]).not.toBe(csp);
  expect((await page.request.get("/admin/login")).headers()["content-security-policy"]).toBe("frame-ancestors 'none'");
});

for (const motion of ["reduce", "no-preference"] as const) {
  test(`CSP: keine Verstöße auf Start, Kategorie, Über mich und Kontakt (${motion === "reduce" ? "ohne" : "mit"} Bewegung)`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: "de-DE", reducedMotion: motion });
    await context.addInitScript(collectViolations);
    const page = await context.newPage();

    await page.goto("/"); // mit Bewegung inklusive Intro
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.waitForTimeout(motion === "no-preference" ? 3500 : 300);
    expect(await violations(page), "/").toEqual([]);

    await page.goto("/floorball");
    const photo = page.getByRole("button", { name: "Floorball, Foto 1" });
    if ((await photo.count()) > 0) {
      await photo.click();
      await expect(page.getByTestId("lightbox")).toBeVisible();
    }
    expect(await violations(page), "/floorball").toEqual([]);

    await page.goto("/ueber-mich");
    expect(await violations(page), "/ueber-mich").toEqual([]);

    await page.goto("/kontakt");
    const token = page.locator('input[name="turnstile"]');
    if ((await token.count()) > 0) await expect(token).not.toHaveValue("", { timeout: 20_000 });
    expect(await violations(page), "/kontakt").toEqual([]);
    await context.close();
  });
}
```

```bash
npm test -- csp && npm run test:e2e -- security.spec.ts
```
Erwartet: Der Unit-Test scheitert (Modul fehlt), der erste E2E-Test scheitert (keine CSP). Die Verstoß-Tests bestehen schon jetzt, weil es ohne CSP keine Verstöße gibt; nach der Umsetzung sichern sie ab, dass die CSP nichts blockiert.

- [ ] **Schritt 2: `src/lib/csp.ts`**

```ts
/**
 * CSP der öffentlichen Seiten (Plan 6): Skripte nur mit der Nonce dieser Anfrage; strict-dynamic lässt Skripte zu,
 * die ein vertrauenswürdiges Skript nachlädt (Turnstile). Styles bleiben inline erlaubt (React-style-Attribute, GSAP).
 */
export function contentSecurityPolicy(nonce: string, dev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** 128 Bit aus dem Kryptografie-Zufall, Base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
```

- [ ] **Schritt 3: Middleware**

`src/middleware.ts` komplett ersetzen (Matcher unverändert übernehmen):

```ts
import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy, createNonce } from "./lib/csp";

// Bewusst middleware.ts statt proxy.ts: OpenNext unterstützt keine Node-Middleware (Next 16 proxy = Node).
const handleI18nRouting = createMiddleware(routing);

/**
 * Pro Anfrage eine Nonce: Next liest die CSP aus den Anfrage-Headern und versieht seine Skripte damit; das Layout
 * holt sie für das Boot-Skript aus x-nonce. next-intl reicht die Anfrage-Header weiter (request: { headers }).
 */
export default function middleware(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  const response = handleI18nRouting(new NextRequest(request, { headers }));
  response.headers.set("content-security-policy", policy);
  return response;
}

export const config = {
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, /media (Bilder), Next-Interna und Dateien mit Endung.
  // /api/… läuft bewusst durch die Middleware (es gibt keine API-Routen): So erreicht nie eine ungültige
  // „Sprache“ das dynamische [locale]-Layout, das sonst die ungestaltete Next-404 statt global-not-found zeigt.
  matcher: ["/((?!g(?:/|$)|admin(?:/|$)|media(?:/|$)|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Schritt 4: Nonce an Boot-Skript und Turnstile**

`src/app/[locale]/layout.tsx`:
- Import ergänzen: `import { headers } from "next/headers";`
- In `LocaleLayout` nach `setRequestLocale(locale);` ergänzen: `const nonce = (await headers()).get("x-nonce") ?? undefined;`
- `<script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />` ersetzen durch `<script nonce={nonce} dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />`

`src/app/[locale]/kontakt/page.tsx`:
- Import ergänzen: `import { headers } from "next/headers";`
- `<ContactForm siteKey={siteKey} fallbackEmail={email} />` ersetzen durch `<ContactForm siteKey={siteKey} fallbackEmail={email} nonce={(await headers()).get("x-nonce") ?? undefined} />`

`src/app/[locale]/kontakt/contact-form.tsx`:
- Signatur: `export function ContactForm({ siteKey, fallbackEmail, nonce }: { siteKey: string; fallbackEmail: string; nonce?: string }) {`
- `<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />` ersetzen durch `<Script nonce={nonce} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} />`

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün (inkl. `csp`), E2E alle grün. Besonders zu beachten:
- die drei CSP-Tests
- der Kontakt-Test mit Turnstile
- alle Bewegungs-Tests (GSAP, View Transitions)

Bei einem Verstoß erst die Ursache klären (welche Direktive, welche Quelle), dann die Richtlinie gezielt ergänzen und im Ledger begründen. Nie `'unsafe-inline'` für Skripte.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(launch): nonce-based content security policy for public pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: „Seite zuerst“: Intro-Vorhang, Überschriften oben sofort, Porträt ohne Lazy-Loading

**Dateien:**
- Ändern:
  - `src/components/motion/home-intro.tsx` (komplett), `src/components/motion/motion-effects.tsx`
  - `src/app/globals.css`, `src/app/[locale]/page.tsx`, `src/components/site/home/hero.tsx`
  - `src/components/site/passepartout.tsx`, `src/app/[locale]/ueber-mich/page.tsx`
  - `test/e2e/motion.spec.ts`, `test/e2e/admin-settings.spec.ts`

**Schnittstellen:**
- Nutzt: Plan 5 (`bootMotion`, `INTRO_SEEN_KEY`, `introStart`, `LOGO_LETTER_DELAYS`, `useMotion`, `[data-site-logo]`, `[data-ring-mask]`, `[data-logo-photos]`, `data-intro="headline|collage|nav"`).
- Stellt bereit:
  - Anker `[data-intro-curtain]` (Klasse `intro-curtain`)
  - `PortraitFrame({ …, priority? })`
  - `MotionEffects` zerlegt nur `[data-reveal]` unterhalb des ersten Bildschirms

- [ ] **Schritt 1: Tests anpassen und ergänzen (zuerst rot)**

In `test/e2e/motion.spec.ts`:

a) Den Test „Bewegung: Intro „Orbit“ läuft beim ersten Besuch und nur einmal pro Sitzung“ komplett ersetzen durch:

```ts
  test("Bewegung: Intro „Orbit“ läuft beim ersten Besuch und nur einmal pro Sitzung", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const curtain = page.locator("[data-intro-curtain]");
    await expect(html).toHaveAttribute("data-intro", "running");
    // „Seite zuerst“: Die Startseite ist schon gezeichnet und liegt unter dem Vorhang (das LCP wartet nicht aufs Intro).
    await expect(curtain).toBeVisible();
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading.locator(".reveal-line")).toHaveCount(0);
    await expect(page.locator("[data-site-logo] [data-logo-photos]")).toBeAttached();
    await expect(html).toHaveAttribute("data-intro", "done", { timeout: 6000 });
    await expect(curtain).toBeHidden();
    await expect
      .poll(() => page.locator("[data-site-logo]").evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    await page.reload();
    await expect(html).not.toHaveAttribute("data-intro", /pending|running/);
    await expect(heading).toBeVisible();
  });

  test("Bewegung: ohne JavaScript deckt der Vorhang höchstens 4 s, dann ist die Seite da", async ({ page }) => {
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-intro", "pending");
    await expect(page.locator("[data-intro-curtain]")).toBeVisible();
    await expect(page.locator("[data-intro-curtain]")).toBeHidden({ timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("[data-site-logo]")).toBeVisible();
  });
```

b) Im `describe("Überschriften und Fußzeile")` den Test „Bewegung: Überschriften erscheinen Zeile für Zeile hinter einer Maske“ komplett ersetzen durch:

```ts
  test("Bewegung: Überschriften im ersten Bildschirm sind sofort da, schon vor der Hydration, ohne Zerlegen", async ({ page }) => {
    await page.addInitScript(skipIntro);
    // Ohne Next-Skripte (keine Hydration): Nur CSS und das Inline-Boot-Skript wirken.
    await page.route("**/_next/static/**/*.js", (route) => route.abort());
    await page.goto("/ueber-mich");
    await expect(page.locator("html")).toHaveClass(/has-motion/);
    expect(await page.locator("main p[data-reveal]").evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
    await page.unroute("**/_next/static/**/*.js");
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/lenis/);
    await expect(page.locator("main p[data-reveal] .reveal-line")).toHaveCount(0);
  });

  test("Bewegung: weiter unten erscheinen Überschriften Zeile für Zeile hinter einer Maske", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser
    const lines = statement.locator(".reveal-line");
    await expect(lines.first()).toBeAttached();
    await statement.scrollIntoViewIfNeeded();
    await expect
      .poll(() => lines.first().evaluate((element) => getComputedStyle(element).transform))
      .toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
  });
```

c) Den Test „Bewegung: Unterlängen bleiben nach dem Zeilen-Reveal vollständig (wie ohne Bewegung)“ komplett ersetzen durch:

```ts
test("Bewegung: Unterlängen bleiben nach dem Zeilen-Reveal vollständig (wie ohne Bewegung)", async ({ browser }) => {
  const measure = async (motion: "reduce" | "no-preference") => {
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
      locale: "de-DE",
      reducedMotion: motion,
      viewport: { width: 1280, height: 480 },
    });
    await context.addInitScript(skipIntro);
    const page: Page = await context.newPage();
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser, unterhalb des ersten Bildschirms
    await statement.scrollIntoViewIfNeeded();
    if (motion === "no-preference") {
      const line = statement.locator(".reveal-line").first();
      await expect(line).toBeAttached();
      await expect.poll(() => line.evaluate((element) => getComputedStyle(element).transform)).toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
    }
    const box = (await statement.boundingBox())!;
    const text = (await statement.innerText()).replace(/\s+/g, " ").trim();
    const row = await lowestInk(page, { x: box.x, y: box.y, width: box.width, height: box.height + 40 });
    await context.close();
    return { text, row };
  };
  // Der Teaser-Text kommt aus den Einstellungen; parallel laufende Admin-Tests können ihn ändern → gleiches Paar abwarten.
  await expect(async () => {
    const moving = await measure("no-preference");
    const still = await measure("reduce");
    expect(moving.text).toBe(still.text);
    expect(Math.abs(moving.row - still.row)).toBeLessThanOrEqual(1);
  }).toPass({ timeout: 30_000 });
});
```

d) Den Test „Bewegung: zerlegte Absätze bleiben für Screenreader lesbar“ komplett ersetzen durch:

```ts
  test("Bewegung: zerlegte Absätze bleiben für Screenreader lesbar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 480 });
    await page.addInitScript(skipIntro);
    await page.goto("/");
    const statement = page.locator("main p[data-reveal]"); // Über-mich-Teaser, zerlegt
    await expect(statement.locator(".reveal-line").first()).toBeAttached();
    const firstWord = (await statement.textContent())!.trim().split(/\s+/)[0];
    expect(await page.locator("main").ariaSnapshot()).toContain(`paragraph: ${firstWord}`);
  });
```

In `test/e2e/admin-settings.spec.ts` im Test „Porträt hochladen, speichern und behalten“ am Ende ergänzen:

```ts
  // Über mich (Plan 6): Das Porträt ist dort oft das größte Element (LCP) und lädt deshalb sofort.
  await page.goto("/ueber-mich");
  const portraitImage = page.locator("main .passepartout img");
  await expect(portraitImage).toHaveAttribute("loading", "eager");
  await expect(portraitImage).toHaveAttribute("fetchpriority", "high");
```

```bash
npm run test:e2e -- motion.spec.ts admin-settings.spec.ts
```
Erwartet:
- Rot:
  - Intro-Test und Vorhang-ohne-JavaScript (kein `[data-intro-curtain]`)
  - „erster Bildschirm“ (`visibility: hidden` vor der Hydration)
  - Porträt-Test (`loading="lazy"`)
- Grün schon jetzt: die umgezogenen Tests zu weiter unten liegenden Überschriften (Reveal, Unterlängen, Screenreader). Sie prüfen den Teaser, den diese Änderung nicht betreffen darf.

- [ ] **Schritt 2: Intro „Seite zuerst“**

`src/components/motion/home-intro.tsx` komplett ersetzen:

```tsx
"use client";

import { useRef } from "react";
import { INTRO_SEEN_KEY } from "@/lib/motion/boot";
import { introStart } from "@/lib/motion/geometry";
import { LOGO_LETTER_DELAYS } from "@/lib/motion/logo-pieces";
import { gsap, useGSAP } from "./gsap";
import { useMotion } from "./motion-root";

// Übergabe (Spec §5.2): PHOTOS geht, das Logo fliegt in den Kopf, der Vorhang hebt sich; ≈ 3,2 s steht die Seite frei.
const HANDOVER = 2.15;

/**
 * Intro „Orbit“ beim ersten Besuch der Startseite pro Sitzung, als „Seite zuerst“ (Plan 6): Die Startseite ist schon
 * gezeichnet (schnelles LCP) und liegt unter einem Papier-Vorhang. Darüber zieht der Ring seine Bahn, C-O-S-M-O wachsen
 * aus ihm, PHOTOS setzt sich; dann fliegt das Kopf-Logo – dasselbe Element, per FLIP – an seinen Platz, der Vorhang
 * hebt sich und die Seite rückt nach (nur transform). Klick, Tipp oder Taste springen ans Ende.
 */
export function HomeIntro() {
  const { lenis } = useMotion();
  const released = useRef(false);

  useGSAP(() => {
    const root = document.documentElement;
    const logo = document.querySelector<HTMLElement>("[data-site-logo]");
    const svg = logo?.querySelector("svg");
    const mask = svg?.querySelector<SVGPathElement>("[data-ring-mask]");
    const curtain = document.querySelector<HTMLElement>("[data-intro-curtain]");
    if (root.dataset.intro !== "pending" || !logo || !svg || !mask || !curtain) return;

    try {
      sessionStorage.setItem(INTRO_SEEN_KEY, "seen");
    } catch {
      // ohne Speicher läuft das Intro eben bei jedem Besuch
    }
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    lenis.current?.stop();

    const photos = svg.querySelector<SVGGElement>("[data-logo-photos]");
    const page = gsap.utils.toArray<HTMLElement>("[data-intro='headline'], [data-intro='collage']");
    const nav = gsap.utils.toArray<HTMLElement>("nav[data-intro='nav'] > *, button[data-intro='nav']");
    const from = introStart(logo.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight });
    const length = mask.getTotalLength();

    // Startzustände sofort (vor dem nächsten Zeichnen), erst dann „running“ (zeigt das Logo).
    gsap.set(logo, { x: from.x, y: from.y, scale: from.scale, transformOrigin: "0 0" });
    gsap.set(mask, { strokeDasharray: `${length} ${length}`, strokeDashoffset: length });
    gsap.set(svg.querySelectorAll("[data-piece='u']"), { y: 44 });
    gsap.set(svg.querySelectorAll("[data-piece='d']"), { y: -34 });
    if (photos) {
      gsap.set(photos, { opacity: 1 });
      gsap.set(photos.children, { opacity: 0, y: 4 });
    }
    // Nur transform: Die Seite ist bereits gezeichnet (LCP), sie rückt beim Heben des Vorhangs lediglich nach.
    gsap.set(page, { y: 48 });
    gsap.set(nav, { opacity: 0, y: -8 });
    root.dataset.intro = "running";

    // Ab hier steht die Startseite: Scrollen frei, Zustand „done“ (blendet den Vorhang per CSS aus, auch beim Überspringen).
    const release = () => {
      if (released.current) return;
      released.current = true;
      root.dataset.intro = "done";
      root.style.overflow = overflow;
      lenis.current?.start();
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
    const finish = () => {
      release();
      gsap.set([logo, curtain, ...page], { clearProps: "transform" });
      gsap.set(nav, { clearProps: "opacity,transform" });
      if (photos) gsap.set(photos, { opacity: 0 });
    };

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(mask, { strokeDashoffset: 0, duration: 1.2, ease: "power1.inOut" }, 0.1);
    LOGO_LETTER_DELAYS.forEach((at, letter) => {
      tl.to(svg.querySelectorAll(`[data-letter='${letter}']`), { y: 0, duration: 0.95, ease: "expo.out" }, at);
    });
    if (photos) {
      tl.to(photos.children, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.055 }, 1.25);
      tl.to(photos.children, { opacity: 0, duration: 0.25, stagger: 0.02 }, HANDOVER);
    }
    tl.to(logo, { x: 0, y: 0, scale: 1, duration: 1.05, ease: "expo.inOut" }, HANDOVER)
      .to(curtain, { yPercent: -100, duration: 0.95, ease: "expo.inOut" }, HANDOVER + 0.15)
      .to(page, { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, HANDOVER + 0.35)
      .to(nav, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.04 }, HANDOVER + 0.7)
      .call(release, undefined, HANDOVER + 1.05);

    const skip = () => tl.progress(1);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      tl.kill();
      finish();
    };
  }, []);

  return null;
}
```

- [ ] **Schritt 3: Vorhang im Markup, Anker ohne Verstecken**

`src/app/[locale]/page.tsx`: Im `<main>`
- direkt vor `<HomeIntro />` einfügen:

```tsx
      {/* Intro-Vorhang („Seite zuerst“, Plan 6): nur sichtbar, solange html[data-intro] gesetzt ist. */}
      <div data-intro-curtain aria-hidden="true" className="intro-curtain" />
```

- den Block `{/* Alles unter dem Hero erscheint im Intro zuletzt. */}` samt `<div data-intro="rest" data-intro-hide>` … `</div>` durch seinen Inhalt ersetzen, ohne Hülle und ohne Kommentar: Kapitel, `AboutTeaser`, `Closing` stehen direkt in `<main>`.

`src/components/site/home/hero.tsx`:
- `<h1 id="hero-title" data-intro="headline" data-intro-hide data-reveal="lines" className=` → `<h1 id="hero-title" data-intro="headline" data-reveal="lines" className=`
- `<div data-intro="collage" data-intro-hide className="grid grid-cols-2` → `<div data-intro="collage" className="isolate grid grid-cols-2`. `isolate` hält die `lg:z-10`/`lg:z-20` der Abzüge in einem eigenen Stapelkontext, sonst lägen sie über dem Vorhang (19).
- `<nav id="arbeiten" aria-label={t("home.index")} data-intro="index" data-intro-hide className=` → `<nav id="arbeiten" aria-label={t("home.index")} className=`

`data-intro-hide` bleibt nur an Kopf-Logo, Navigation und Menü-Knopf (liegen über dem Vorhang und dürfen vor dem Intro nicht an ihrem Endplatz aufblitzen).

`src/app/globals.css`:
- den Block

```css
/* Intro „Orbit“ (Spec §5.2): Bis das Intro startet, sind Logo und Startseite unsichtbar (bootMotion, Sicherheitsnetz 4 s). */
html[data-intro="pending"] [data-intro-hide] {
  visibility: hidden;
}
```

ersetzen durch

```css
/* Intro „Orbit“, „Seite zuerst“ (Plan 6): Die Startseite ist gezeichnet und liegt unter einem Papier-Vorhang (Schicht
   19); Logo und Navigation im Kopf (Schicht 20) liegen darüber und warten unsichtbar auf das Intro. bootMotion merkt das
   Intro vor und nimmt es nach 4 s zurück, falls kein JavaScript kommt. */
.intro-curtain {
  display: none;
}
html[data-intro="pending"] .intro-curtain,
html[data-intro="running"] .intro-curtain {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 19;
  background: var(--color-paper);
}
html[data-intro="pending"] [data-intro-hide] {
  visibility: hidden;
}
```

- den Block

```css
/* Zeilen-Reveal (Spec §6.4): bis zum Zerlegen unsichtbar; das Sicherheitsnetz zeigt nach 3 s alles (z. B. Skriptfehler). */
.has-motion [data-reveal] {
  visibility: hidden;
  animation: reveal-fallback 0s 3s forwards;
}
@keyframes reveal-fallback {
  to {
    visibility: visible;
  }
}
```

ersatzlos löschen (die folgende Regel `.reveal-line-mask` bleibt).

- [ ] **Schritt 4: Reveals nur unterhalb des ersten Bildschirms**

`src/components/motion/motion-effects.tsx`:
- Die Zeile `const intro = document.documentElement.dataset.intro;` löschen.
- In der Schleife über `[data-reveal='lines']` die Zeilen

```ts
        element.style.animation = "none";
        // Die Startseiten-Headline gehört während des Intros dem Intro.
        if ((intro === "pending" || intro === "running") && element.closest("[data-intro-hide]")) {
          gsap.set(element, { visibility: "visible" });
          continue;
        }
```

  ersetzen durch

```ts
        // „Seite zuerst“ (Plan 6): Was im ersten Bildschirm der Seite steht, ist sofort da (LCP). Zeilen-Reveals nur für
        // Inhalte, die beim Scrollen hereinkommen; gemessen ab Seitenanfang, unabhängig von der aktuellen Scrollposition.
        if (element.getBoundingClientRect().top + window.scrollY < window.innerHeight) continue;
```

- In `onSplit(self)` die Zeile `gsap.set(element, { visibility: "visible" });` löschen.
- Im Kopfkommentar `[data-reveal="lines"]: Zeilen erscheinen hinter einer Maske, wenn sie sichtbar werden (Spec §6.4).` ergänzen um `Nur unterhalb des ersten Bildschirms.`

- [ ] **Schritt 5: Porträt sofort laden**

`src/components/site/passepartout.tsx`, `PortraitFrame`:
- Signatur: `export function PortraitFrame({ id, alt, className = "", priority = false }: { id: string; alt: string; className?: string; priority?: boolean }) {`
- `<Photo src={mediaUrl("site", id, 1600)} alt={alt} />` → `<Photo src={mediaUrl("site", id, 1600)} alt={alt} priority={priority} />`
- Kommentar ergänzen: `/** … `priority`: auf „Über mich“ das größte Element (LCP), dort sofort laden. */`

`src/app/[locale]/ueber-mich/page.tsx`: `<PortraitFrame id={portrait} alt={t("home.portraitAlt")} />` → `<PortraitFrame id={portrait} alt={t("home.portraitAlt")} priority />`

- [ ] **Schritt 6: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün, E2E alle grün, darunter die neuen bzw. geänderten Intro-, Überschriften- und Porträt-Tests. Die Kapitel-, Lightbox- und Seitenwechsel-Tests aus Plan 5 bleiben grün.

- [ ] **Schritt 7: Sichtprüfung**

Mit laufender Vorschau (`npm run preview:e2e` im Hintergrund, Daten wie in Plan 5 per `PLAYWRIGHT_BASE_URL=http://localhost:8787 npx playwright test public-portfolio.spec.ts motion-portfolio.spec.ts` befüllen):
- Screenshots mit `reducedMotion: "no-preference"`, frischer Kontext (neue Sitzung), `/` bei 1440 × 900 und 390 × 844.
- Zeitpunkte: 0,6 / 1,4 / 2,4 / 2,8 / 3,2 / 4 s nach `data-intro="running"`.

Erwartet:
- Bis 2,2 s nur Papier mit Ring, Buchstaben und PHOTOS (von der Seite ist nichts zu sehen).
- Ab 2,3 s fliegt das Logo nach oben links, der Vorhang hebt sich nach oben, die Seite rückt von unten nach.
- Bei 4 s sieht die Seite aus wie ohne Intro: Kopf pixelgleich zur Aufnahme mit `reducedMotion: "reduce"`, wie in Plan 5 per Pixelvergleich prüfen.
- Kein Collage-Abzug liegt über dem Vorhang.

Befunde, die davon abweichen, vor dem Commit beheben.

- [ ] **Schritt 8: Commit**

```bash
git add -A
git commit -m "perf(launch): page-first intro curtain, reveals only below the first screen, eager portrait

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Bilder aus dem Cloudflare-Cache

**Dateien:**
- Erstellen: `src/lib/media/edge-cache.ts`, `test/unit/media-cache.test.ts`
- Ändern: `src/app/media/[...key]/route.ts`

**Schnittstellen:**
- Stellt bereit: `cachedMedia(request, cache, waitUntil, load): Promise<Response>`

- [ ] **Schritt 1: Fehlschlagenden Unit-Test schreiben**

`test/unit/media-cache.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { cachedMedia } from "@/lib/media/edge-cache";

const IMAGE_HEADERS = { "content-type": "image/webp", "cache-control": "public, max-age=31536000, immutable", etag: '"abc"' };

async function setup() {
  const cache = await caches.open(`media-${crypto.randomUUID()}`);
  const pending: Promise<unknown>[] = [];
  return { cache, pending, waitUntil: (promise: Promise<unknown>) => void pending.push(promise) };
}

describe("cachedMedia", () => {
  it("lädt beim ersten Abruf aus R2, danach aus dem Cache (gleiche Header)", async () => {
    const { cache, pending, waitUntil } = await setup();
    let loads = 0;
    const load = async () => {
      loads++;
      return new Response("bild", { headers: IMAGE_HEADERS });
    };
    const request = new Request("https://cosmo-photos.de/media/portfolio/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/800");
    expect(await (await cachedMedia(request, cache, waitUntil, load)).text()).toBe("bild");
    await Promise.all(pending);
    const second = await cachedMedia(request, cache, waitUntil, load);
    expect(await second.text()).toBe("bild");
    expect(second.headers.get("content-type")).toBe("image/webp");
    expect(second.headers.get("etag")).toBe('"abc"');
    expect(loads).toBe(1);
  });

  it("speichert 404 nie", async () => {
    const { cache, pending, waitUntil } = await setup();
    let loads = 0;
    const load = async () => {
      loads++;
      return new Response("Not found", { status: 404 });
    };
    const request = new Request("https://cosmo-photos.de/media/portfolio/3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d/1600");
    expect((await cachedMedia(request, cache, waitUntil, load)).status).toBe(404);
    await Promise.all(pending);
    expect((await cachedMedia(request, cache, waitUntil, load)).status).toBe(404);
    expect(loads).toBe(2);
  });
});
```

```bash
npm test -- media-cache
```
Erwartet: FAIL, Modul `@/lib/media/edge-cache` fehlt.

- [ ] **Schritt 2: `src/lib/media/edge-cache.ts`**

```ts
/**
 * Öffentliche Bilder aus dem Cloudflare-Cache des Standorts (Plan 6, statt img.cosmo-photos.de): Die Schlüssel sind
 * unveränderlich (UUID), ein Treffer gilt ein Jahr (Cache-Control der Antwort). Nur 200er landen im Cache.
 * Auf *.workers.dev ist der Cache wirkungslos (jeder Abruf trifft R2), auf der eigenen Domain greift er.
 * Der Body wird nie gepuffert: clone() teilt den Stream zwischen Antwort und Cache.
 */
export async function cachedMedia(
  request: Request,
  cache: Cache,
  waitUntil: (promise: Promise<unknown>) => void,
  load: () => Promise<Response>,
): Promise<Response> {
  const key = new Request(request.url, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  const response = await load();
  if (response.status === 200) waitUntil(cache.put(key, response.clone()));
  return response;
}
```

```bash
npm test -- media-cache
```
Erwartet: PASS (2 Tests).

- [ ] **Schritt 3: Route nutzt den Cache**

`src/app/media/[...key]/route.ts` komplett ersetzen:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getEnv } from "@/lib/env";
import { cachedMedia } from "@/lib/media/edge-cache";
import { parseMediaKey } from "@/lib/media/keys";

type Params = { params: Promise<{ key: string[] }> };

/** Öffentliche Bilder (Portfolio, Porträt). Schlüssel enthalten eine UUID → unveränderlich, aus dem Edge-Cache. */
export async function GET(request: Request, { params }: Params) {
  const key = parseMediaKey((await params).key);
  if (!key) return new Response("Not found", { status: 404 });
  const { ctx } = getCloudflareContext();
  return cachedMedia(request, caches.default, (promise) => ctx.waitUntil(promise), async () => {
    const object = await getEnv().MEDIA.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      headers: {
        "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        etag: object.httpEtag,
      },
    });
  });
}
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün (inkl. `media-cache`), E2E alle grün (alle Bilder der Vorschau laden weiter über `/media/…`).

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "perf(launch): serve public images from the Cloudflare edge cache

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Kontaktformular: Hinweis statt Fehlerseite bei Verbindungsabbruch

**Dateien:**
- Ändern: `src/app/[locale]/kontakt/contact-form.tsx`, `test/e2e/contact.spec.ts`

**Schnittstellen:**
- Nutzt: `sendContactAction`, `ContactState` (`status: "failed"`, `values`)

- [ ] **Schritt 1: Fehlschlagenden E2E-Test anhängen**

An `test/e2e/contact.spec.ts` anhängen:

```ts
test("Kontakt: Verbindungsabbruch beim Senden zeigt einen Hinweis statt der Fehlerseite, Eingaben bleiben", async ({ page }) => {
  await page.goto("/kontakt");
  const token = page.locator('input[name="turnstile"]');
  await page.getByLabel("Name", { exact: true }).fill("Anna Keller");
  await page.getByLabel("E-Mail", { exact: true }).fill("anna@example.org");
  await page.getByText("Hochzeit", { exact: true }).click();
  await page.getByLabel("Nachricht", { exact: true }).fill("Wir heiraten im Juni in Hamburg und suchen noch einen Fotografen.");
  await expect(token).not.toHaveValue("", { timeout: 20_000 });
  // Die Server-Aktion geht als POST an /kontakt; hier reißt die Verbindung ab (z. B. Funkloch).
  await page.route("**/kontakt", (route) => (route.request().method() === "POST" ? route.abort("connectionreset") : route.continue()));
  await page.getByRole("button", { name: "Nachricht senden" }).click();
  await expect(page.getByText("Das hat leider nicht geklappt", { exact: false })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Da ist etwas schiefgelaufen." })).toHaveCount(0);
  await expect(page.getByLabel("Nachricht", { exact: true })).toHaveValue(/Wir heiraten im Juni/);
  await expect(page.getByRole("radio", { name: "Hochzeit" })).toBeChecked();
});
```

```bash
npm run test:e2e -- contact.spec.ts
```
Erwartet: Der neue Test scheitert (die Fehlerseite „Da ist etwas schiefgelaufen.“ erscheint).

- [ ] **Schritt 2: Wrapper um die Aktion**

In `src/app/[locale]/kontakt/contact-form.tsx` vor `export function ContactForm` einfügen:

```tsx
/**
 * Netzwerk- oder Serverfehler (Antwort abgebrochen, Worker neu gestartet): Hinweis mit Mail-Adresse statt Fehlerseite,
 * die Eingaben bleiben. Die Aktion leitet nie um, deshalb verschluckt der Wrapper keine Weiterleitung.
 */
async function submitContact(previous: ContactState, formData: FormData): Promise<ContactState> {
  try {
    return await sendContactAction(previous, formData);
  } catch {
    const text = (name: string) => String(formData.get(name) ?? "");
    return { status: "failed", values: { name: text("name"), email: text("email"), topic: text("topic"), message: text("message") } };
  }
}
```

In `ContactForm` `useActionState<ContactState, FormData>(sendContactAction, { status: "idle" })` ersetzen durch `useActionState<ContactState, FormData>(submitContact, { status: "idle" })`.

- [ ] **Schritt 3: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (der Server-Action-Wächter akzeptiert den Client-Wrapper), Unit grün, E2E alle grün, darunter beide Kontakt-Tests.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "fix(contact): show the failure notice instead of the error page when the connection drops

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Galerie-Bremse zählt nur Fehlversuche

**Dateien:**
- Erstellen: `src/lib/galleries/attempts.ts`, `drizzle/0002_*.sql` (per `npm run db:generate`), `test/unit/unlock-attempts.test.ts`
- Ändern:
  - `src/lib/db/schema.ts`, `src/app/g/[slug]/actions.ts`, `src/app/[locale]/kunden/actions.ts`
  - `wrangler.jsonc`, `cloudflare-env.d.ts` (per `npm run cf-typegen`)
  - `test/e2e/gallery-client.spec.ts`

**Schnittstellen:**
- Stellt bereit:
  - `UNLOCK_LIMIT = 5`, `UNLOCK_WINDOW_SECONDS = 60`
  - `isLockedOut(db, key, now)`, `recordFailure(db, key, now)`
  - Tabelle `unlock_failures(key, at)`
- Entfällt: Binding `GALLERY_LIMITER` (Produktion und Vorschau)

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/unlock-attempts.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";
import { isLockedOut, recordFailure, UNLOCK_LIMIT, UNLOCK_WINDOW_SECONDS } from "@/lib/galleries/attempts";

const db = () => createDb(env.DB);
const NOW = 1_800_000_000;

beforeEach(async () => {
  await db().delete(unlockFailures);
});

describe("Galerie-Bremse (nur Fehlversuche)", () => {
  it("sperrt erst nach 5 Fehlversuchen innerhalb einer Minute", async () => {
    for (let i = 0; i < UNLOCK_LIMIT - 1; i++) await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW)).toBe(false);
    await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW)).toBe(true);
  });

  it("zählt pro Schlüssel und nur im Zeitfenster", async () => {
    for (let i = 0; i < UNLOCK_LIMIT; i++) await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:andere", NOW)).toBe(false);
    expect(await isLockedOut(db(), "gallery:1.2.3.4:team", NOW + UNLOCK_WINDOW_SECONDS)).toBe(false);
  });

  it("räumt Einträge älter als einen Tag auf", async () => {
    await recordFailure(db(), "code:9.9.9.9", NOW - 90_000);
    await recordFailure(db(), "gallery:1.2.3.4:team", NOW);
    expect(await db().select().from(unlockFailures)).toEqual([{ key: "gallery:1.2.3.4:team", at: NOW }]);
  });
});
```

An `test/e2e/gallery-client.spec.ts` anhängen (Importe aus `./helpers/galleries` ergänzen, falls nicht vorhanden: `createGalleryViaUi`, `galleryPassword`, `newContext`, `publishGallery`, `RUN`, `unlockGallery`, `uploadJpegs`):

```ts
test("Galerie: ein ganzes Team im selben WLAN öffnet sie nacheinander; Raten ist nach 5 Fehlversuchen gebremst", async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const { slug } = await createGalleryViaUi(adminPage, `Team ${RUN}`);
  await uploadJpegs(adminPage, ["team-1.jpg"]);
  await publishGallery(adminPage);
  const password = await galleryPassword(adminPage);
  await admin.close();

  // Sechs richtige Anmeldungen innerhalb einer Minute, alle von derselben Adresse (bisher war nach fünf Schluss).
  for (let person = 0; person < 6; person++) {
    const guest = await newContext(browser);
    await unlockGallery(await guest.newPage(), slug, password);
    await guest.close();
  }

  const guest = await newContext(browser);
  const page = await guest.newPage();
  await page.goto(`/g/${slug}`);
  const alert = page.locator("form").getByRole("alert");
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByLabel("Passwort").fill(`falsch-${attempt}`);
    await page.getByRole("button", { name: "Öffnen" }).click();
    await expect(alert).toHaveText("Falsches Passwort.");
  }
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(alert).toHaveText("Zu viele Versuche. Bitte eine Minute warten.");
  await guest.close();
});
```

```bash
npm test -- unlock-attempts && npm run test:e2e -- gallery-client.spec.ts
```
Erwartet: Der Unit-Test scheitert (Modul fehlt). Der E2E-Test scheitert bei der sechsten richtigen Anmeldung (das Binding bremst nach fünf).

- [ ] **Schritt 2: Tabelle und Migration**

In `src/lib/db/schema.ts` am Ende anfügen:

```ts
/** Fehlversuche beim Öffnen einer Galerie bzw. beim Galerie-Code (Bremse nur für Fehlversuche, Plan 6). */
export const unlockFailures = sqliteTable(
  "unlock_failures",
  {
    key: text("key").notNull(),
    at: integer("at").notNull(),
  },
  (t) => [index("unlock_failures_key_at_idx").on(t.key, t.at)],
);
```

```bash
npm run db:generate && ls drizzle
```
Erwartet: Eine neue Datei `drizzle/0002_….sql` mit `CREATE TABLE \`unlock_failures\`` und dem Index; `drizzle/meta` aktualisiert. Nichts sonst geändert (`git diff --stat drizzle` zeigt nur die neue Migration und die Metadaten).

- [ ] **Schritt 3: `src/lib/galleries/attempts.ts`**

```ts
import { and, count, eq, gt, lt } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { unlockFailures } from "@/lib/db/schema";

export const UNLOCK_LIMIT = 5;
export const UNLOCK_WINDOW_SECONDS = 60;
const KEEP_SECONDS = 86_400;

/**
 * Bremse nur für Fehlversuche (Plan 6, Spec §7.4): Ein ganzes Team im selben Hallen-WLAN kann dieselbe Galerie
 * gleichzeitig öffnen; wer rät, ist nach 5 Fehlversuchen pro Minute und Schlüssel gebremst.
 * Schlüssel: `gallery:<IP>:<slug>` (Passwort) bzw. `code:<IP>` (Galerie-Code auf /kunden).
 */
export async function isLockedOut(db: Db, key: string, now: number): Promise<boolean> {
  const [row] = await db
    .select({ failures: count() })
    .from(unlockFailures)
    .where(and(eq(unlockFailures.key, key), gt(unlockFailures.at, now - UNLOCK_WINDOW_SECONDS)));
  return (row?.failures ?? 0) >= UNLOCK_LIMIT;
}

/** Merkt einen Fehlversuch und räumt nebenbei alles älter als einen Tag weg (kein Cron nötig). */
export async function recordFailure(db: Db, key: string, now: number): Promise<void> {
  await db.batch([
    db.insert(unlockFailures).values({ key, at: now }),
    db.delete(unlockFailures).where(lt(unlockFailures.at, now - KEEP_SECONDS)),
  ]);
}
```

- [ ] **Schritt 4: Aktionen umstellen, Binding entfernen**

`src/app/g/[slug]/actions.ts`:
- Import `getCloudflareContext` entfernen, `import { isLockedOut, recordFailure } from "@/lib/galleries/attempts";` ergänzen.
- Den Anfang von `unlockGalleryAction` bis einschließlich der Passwortprüfung ersetzen durch:

```ts
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const key = `gallery:${ip}:${slug}`;
  if (await isLockedOut(db, key, now)) return { error: "tooMany" };

  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") redirect(`/g/${slug}`);
  if (!(await checkGalleryPassword(gallery, String(formData.get("password") ?? "")))) {
    await recordFailure(db, key, now);
    return { error: "wrongPassword" };
  }
```

`src/app/[locale]/kunden/actions.ts`:
- Import `getCloudflareContext` entfernen, `import { isLockedOut, recordFailure } from "@/lib/galleries/attempts";` ergänzen.
- Den Rumpf nach `if (!slug) return { error: "invalid", code };` ersetzen durch:

```ts
  // Bremst das Durchprobieren von Codes: nur unbekannte Codes zählen (eigener Schlüssel pro Adresse).
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const key = `code:${ip}`;
  if (await isLockedOut(db, key, now)) return { error: "tooMany", code };
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || gallery.status === "draft") {
    await recordFailure(db, key, now);
    return { error: "unknown", code };
  }
  redirect(`/g/${slug}`);
```

`wrangler.jsonc`: In beiden `ratelimits`-Listen (oben und unter `env.preview`) den Eintrag `GALLERY_LIMITER` löschen. Die Namespaces `1003`/`1004` werden nicht wiederverwendet.

```bash
npm run cf-typegen && grep -c GALLERY_LIMITER cloudflare-env.d.ts
```
Erwartet: `0`.

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün (inkl. `unlock-attempts`), E2E alle grün, darunter der Team-Test und die bestehenden Tests zu falschem Passwort und Galerie-Code.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(galleries): count only failed unlock attempts, so whole teams can open a gallery at once

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Barrierefreiheit: axe-Durchgang, Fokus und Feldlinien

**Dateien:**
- Ändern:
  - `package.json`, `package-lock.json` (`@axe-core/playwright` 4.13.0, dev)
  - `src/app/[locale]/kontakt/contact-form.tsx`, `src/app/[locale]/kunden/gallery-code-form.tsx`
  - `src/app/g/[slug]/password-form.tsx`, `src/app/g/[slug]/name-dialog.tsx`
  - `test/e2e/site-frame.spec.ts`
- Erstellen: `test/e2e/helpers/a11y.ts`, `test/e2e/a11y.spec.ts`
- Ergänzen: `test/e2e/public-portfolio.spec.ts` (Kategorie „Hochzeiten“), `test/e2e/motion-portfolio.spec.ts` (Kategorie „Floorball“, mit Bewegung)

**Schnittstellen:**
- Nutzt: `newContext`, Galerie-Helfer (`createGalleryViaUi`, `uploadJpegs`, `publishGallery`, `galleryPassword`, `unlockGallery`, `RUN`).
- Stellt bereit: `expectNoViolations(page, label)` in `test/e2e/helpers/a11y.ts`.
- Seiten mit Bildern werden in den beiden seriellen Portfolio-Dateien geprüft, die ihre Kategorie selbst befüllen. Ein eigenes Befüllen hier würde mit anderen Dateien kollidieren: `admin-portfolio` leert „Studio“, `admin-api` nutzt „Volleyball“, und „Fußball“ muss für den Leere-Kategorie-Test leer bleiben.

- [ ] **Schritt 1: axe installieren**

```bash
npm install --save-dev --save-exact @axe-core/playwright@4.13.0 && npm run deps:lock
```
Erwartet: `package.json` enthält `"@axe-core/playwright": "4.13.0"`, `check:lock` grün.

- [ ] **Schritt 2: Tests schreiben (zuerst rot)**

An `test/e2e/site-frame.spec.ts` anhängen:

```ts
test("Rahmen: Formularfelder zeigen beim Fokus einen deutlichen Unterstrich (WCAG 2.4.7)", async ({ page }) => {
  await page.goto("/kunden");
  const field = page.getByLabel("Galerie-Code");
  expect(await field.evaluate((element) => getComputedStyle(element).boxShadow)).toBe("none");
  await field.focus();
  expect(await field.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
});
```

`test/e2e/helpers/a11y.ts`:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.2 AA (Spec §10). Das Turnstile-Iframe ist Fremdinhalt von Cloudflare und bleibt außen vor.
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function expectNoViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).exclude("iframe[src*='challenges.cloudflare.com']").analyze();
  const found = results.violations.map(
    (violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`,
  );
  expect(found, label).toEqual([]);
}
```

`test/e2e/a11y.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { expectNoViolations } from "./helpers/a11y";
import { createGalleryViaUi, galleryPassword, newContext, publishGallery, RUN, unlockGallery, uploadJpegs } from "./helpers/galleries";

for (const path of ["/", "/en", "/ueber-mich", "/kontakt", "/kunden", "/impressum", "/datenschutz", "/en/about", "/en/contact", "/gibt-es-nicht"]) {
  test(`Barrierefreiheit (axe): ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page, path);
  });
}

test("Barrierefreiheit (axe): Kundengalerie (Passwortseite und Galerie), Feldlinie wie auf den öffentlichen Seiten", async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const { slug } = await createGalleryViaUi(adminPage, `A11y ${RUN}`);
  await uploadJpegs(adminPage, ["a11y-1.jpg", "a11y-2.jpg"]);
  await publishGallery(adminPage);
  const password = await galleryPassword(adminPage);
  await admin.close();

  const guest = await newContext(browser);
  const page = await guest.newPage();
  await page.goto("/kunden");
  const publicLine = await page.getByLabel("Galerie-Code").evaluate((element) => getComputedStyle(element).borderBottomColor);
  await page.goto(`/g/${slug}`);
  expect(await page.getByLabel("Passwort").evaluate((element) => getComputedStyle(element).borderBottomColor)).toBe(publicLine);
  await expectNoViolations(page, "Passwortseite");
  await unlockGallery(page, slug, password);
  await expectNoViolations(page, "Galerie");
  await guest.close();
});
```

An `test/e2e/public-portfolio.spec.ts` anhängen (Import `import { expectNoViolations } from "./helpers/a11y";` ergänzen):

```ts
test("Barrierefreiheit (axe): Kategorie, Lightbox und Handy-Menü", async ({ page }) => {
  await page.goto("/hochzeiten");
  await expectNoViolations(page, "/hochzeiten");
  await page.getByRole("button", { name: "Hochzeiten, Foto 1" }).click();
  await expect(page.getByTestId("lightbox")).toBeVisible();
  await expectNoViolations(page, "/hochzeiten mit Lightbox");
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menü" }).click();
  await expectNoViolations(page, "Handy-Menü");
});
```

An `test/e2e/motion-portfolio.spec.ts` anhängen (Import `import { expectNoViolations } from "./helpers/a11y";` ergänzen):

```ts
test("Bewegung: Barrierefreiheit (axe) auf Startseite und Kategorie", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-chapter="floorball"]')).toBeVisible();
  await expectNoViolations(page, "/ mit Bewegung");
  await page.goto("/floorball");
  await expectNoViolations(page, "/floorball mit Bewegung");
});
```

```bash
npm run test:e2e -- site-frame.spec.ts a11y.spec.ts public-portfolio.spec.ts motion-portfolio.spec.ts
```
Erwartet:
- Rot:
  - Fokus-Test (`box-shadow: none` auch im Fokus)
  - Kundengalerie-Test (Feldlinie `ink/30` statt `ink/60`)
- axe-Ergebnisse notieren: Lighthouse maß 100 für Barrierefreiheit, deshalb wenige oder keine Befunde erwartet.
- Jeder Befund wird in Schritt 4 behoben, nicht ausgeschlossen.

- [ ] **Schritt 3: Fokus-Unterstrich und Feldlinien**

- Die Klassenliste jedes Textfelds bekommt zusätzlich `focus-visible:shadow-[inset_0_-2px_0_0_var(--color-ink)]` (die Linie wird im Fokus deutlich dicker, ohne das Layout zu verschieben). Betroffen:
  - `const control = …` in `contact-form.tsx`
  - das Eingabefeld in `gallery-code-form.tsx`
  - das Passwortfeld in `password-form.tsx`
  - das Namensfeld in `name-dialog.tsx`
- In `password-form.tsx` und `name-dialog.tsx` zusätzlich `border-ink/30` → `border-ink/60` (Nicht-Text-Kontrast ≥ 3:1, wie die öffentlichen Felder seit Plan 4).

- [ ] **Schritt 4: axe-Befunde beheben**

Für jeden Befund aus Schritt 2:
1. Ursache im Markup finden.
2. Beheben.
3. Im Ledger festhalten: `Task 9: axe <Regel> auf <Seite> – <Ursache> – <Korrektur>`.

Ausnahmen per `exclude` sind nur für Fremdinhalte erlaubt (Turnstile), nie für eigenes Markup.

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit grün, E2E alle grün, darunter alle axe-Tests, der Fokus-Test und der Galerie-Test.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(a11y): axe checks for public and gallery pages, visible focus and contrasting field lines

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Performance messen (Vorschau), inlineCss-Versuch

**Dateien:**
- Erstellen: `scripts/lighthouse.mjs`
- Ändern: `package.json` (`lighthouse`), `.gitignore` (`.lighthouse/`), `README.md` (Abschnitt „Performance“), ggf. `next.config.ts` (`experimental.inlineCss`)

**Schnittstellen:**
- Stellt bereit: `npm run lighthouse -- <URL> …` (Median aus 3 Läufen, mobil)

- [ ] **Schritt 1: Messskript**

`scripts/lighthouse.mjs`:

```js
// Lighthouse (mobil, simuliertes 4G) mit dem Chromium von Playwright; keine zusätzliche Abhängigkeit.
// Aufruf: npm run lighthouse -- <URL> [<URL> …]  → je URL ein Aufwärm-Aufruf, dann 3 Läufe, Median.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const urls = process.argv.slice(2);
if (urls.length === 0) {
  console.error("Aufruf: npm run lighthouse -- <URL> …");
  process.exit(1);
}
mkdirSync(".lighthouse", { recursive: true });
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

for (const url of urls) {
  await fetch(url); // Worker aufwärmen: Kaltstarts werden getrennt beobachtet
  const runs = [];
  for (let run = 0; run < 3; run++) {
    const out = `.lighthouse/${new URL(url).host}${new URL(url).pathname.replaceAll("/", "_")}-${run}.json`;
    execFileSync(
      "npx",
      ["-y", "lighthouse@12", url, "--quiet", "--chrome-flags=--headless=new", "--only-categories=performance,accessibility,best-practices,seo", "--output=json", `--output-path=${out}`],
      { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: "inherit" },
    );
    runs.push(JSON.parse(readFileSync(out, "utf8")));
  }
  const score = (id) => Math.round(median(runs.map((report) => report.categories[id].score * 100)));
  const value = (id) => median(runs.map((report) => report.audits[id].numericValue));
  const phases = runs[0].audits["largest-contentful-paint-element"]?.details?.items?.[1]?.items ?? [];
  console.log(
    `${url}\n` +
      `  Performance ${score("performance")} · Barrierefreiheit ${score("accessibility")} · Best Practices ${score("best-practices")} · SEO ${score("seo")}\n` +
      `  LCP ${(value("largest-contentful-paint") / 1000).toFixed(2)} s · FCP ${(value("first-contentful-paint") / 1000).toFixed(2)} s · ` +
      `TBT ${Math.round(value("total-blocking-time"))} ms · CLS ${value("cumulative-layout-shift").toFixed(3)} · TTFB ${Math.round(value("server-response-time"))} ms\n` +
      `  LCP-Phasen (Lauf 1): ${phases.map((phase) => `${phase.phase} ${Math.round(phase.timing)} ms`).join(" · ")}`,
  );
}
```

`package.json`: nach `"test:e2e:prod"` ergänzen:

```json
    "lighthouse": "node scripts/lighthouse.mjs",
```

`.gitignore`: Zeile `.lighthouse/` ergänzen.

- [ ] **Schritt 2: Vorschau mit allen Änderungen**

```bash
npm run check:lock && npm run db:migrate:preview && npm run deploy:preview && npm run test:e2e:preview
```
Erwartet:
- `check:lock` grün.
- Die Migration `0002_…` ist auf der Vorschau-Datenbank angewendet.
- Deploy ok.
- Alle E2E-Tests gegen die Vorschau grün.

- [ ] **Schritt 3: Messen**

```bash
P=https://cosmo-web-preview.felix-vatterodt.workers.dev
npm run lighthouse -- $P/ $P/floorball $P/ueber-mich $P/en
```
Erwartet (Median):
- **Ziel (Spec §10/§11):** Performance ≥ 90 und LCP < 2,5 s auf allen vier Seiten.
- **Weitere Kategorien:** Barrierefreiheit und Best Practices ≥ 90.
- **SEO:** Auf der Vorschau ist sie wegen `noindex` gewollt niedriger und wird nach dem Umzug gemessen (Task 13).
- **Vergleich zu vorher** (Plan-6-Messung vor der Umsetzung): Start 65 / 5,9 s, Floorball 80 / 5,1 s, Über mich 80 / 5,1 s.

Ergebnisse als `Task 10: Lighthouse <Seite>: <Werte>` ins Ledger.

- [ ] **Schritt 4: inlineCss-Versuch**

Lighthouse meldete das CSS (≈ 11 KB gzip) als render-blockierend.
1. In `next.config.ts` `experimental: { globalNotFound: true }` → `experimental: { globalNotFound: true, inlineCss: true }` ändern.
2. `npm run test:e2e` muss grün sein.
3. `npm run deploy:preview`, dann Schritt 3 wiederholen.

**Entscheidung:**
- **Behalten**, wenn auf mindestens drei der vier Seiten Performance um ≥ 2 Punkte steigt oder das LCP um ≥ 150 ms sinkt, ohne dass eine Seite schlechter wird.
- **Sonst zurücknehmen**, erneut `npm run deploy:preview` ausführen und die Messung im Ledger begründen.

- [ ] **Schritt 5: Wenn das Ziel verfehlt wird**

Bleibt eine Seite unter 90 oder über 2,5 s:
1. Die LCP-Phasen (TTFB, Ladeverzögerung, Ladezeit, Render-Verzögerung) aus dem Skript-Output als `Task 10: Ruling:` ins Ledger schreiben.
2. Weitermachen; Felix entscheidet in der Schlussnachricht.

Bekannter Resthebel sind Worker-Kaltstarts (6-MB-Bundle, TTFB kalt 0,7–1,7 s, warm ≈ 0,2 s).

- [ ] **Schritt 6: Kaltstarts beobachten und dokumentieren**

```bash
for i in $(seq 1 8); do curl -s -o /dev/null -w "%{time_starttransfer}\n" https://cosmo-web-preview.felix-vatterodt.workers.dev/ueber-mich; sleep 90; done
```
Erwartet: eine Liste von TTFB-Werten. Verteilung (warm/kalt) ins Ledger.

In `README.md` am Ende einen Abschnitt ergänzen:

```markdown
### Performance

- Messen: `npm run lighthouse -- <URL> …` (mobil, simuliertes 4G, Median aus 3 Läufen nach einem Aufwärm-Aufruf; Berichte in `.lighthouse/`).
- Ziel (Spec §10/§11): Performance, Barrierefreiheit, Best Practices und SEO ≥ 90, LCP < 2,5 s. SEO erst auf `cosmo-photos.de` aussagekräftig (Vorschau und workers.dev sind `noindex`).
- Das Intro läuft als „Seite zuerst“: Die Startseite ist gezeichnet, bevor das Intro endet. Zeilen-Reveals gibt es nur unterhalb des ersten Bildschirms.
- Worker-Kaltstarts (großes OpenNext-Bundle) kosten beim ersten Aufruf nach einer Pause bis zu ≈ 1,5 s Serverzeit.
```

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "perf(launch): lighthouse measurement script and results

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Große Galerie auf der Vorschau (über 1 000 Dateien, über 2 GB)

**Dateien:**
- Erstellen: `test/e2e/load-gallery.spec.ts`
- Ändern: `playwright.config.ts` (nur mit `LOAD=1`), `package.json` (`test:load`)

**Schnittstellen:**
- Nutzt: Upload-Route `PUT /admin/api/galleries/:id/images/:imageId/original` (Header `x-file-name`, `x-width`, `x-height`, `x-color`; JPEG-Signatur), ZIP-Route `/g/:slug/zip?set=all&part=n` (Teile ≤ 2 GB und ≤ 500 Dateien).

- [ ] **Schritt 1: Lasttest schreiben**

`playwright.config.ts`: `testIgnore: ["**/._*"],` ersetzen durch

```ts
  // Lasttest und Launch-Check nur auf Zuruf (npm run test:load / test:launch).
  testIgnore: ["**/._*", ...(process.env.LOAD ? [] : ["**/load-gallery.spec.ts"]), ...(process.env.LAUNCH ? [] : ["**/launch.spec.ts"])],
```

`package.json`: nach `"lighthouse"` ergänzen:

```json
    "test:load": "LOAD=1 bash scripts/e2e-deployed.sh preview --project=chromium load-gallery.spec.ts",
```

`test/e2e/load-gallery.spec.ts`:

```ts
import { execFileSync } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync, statSync } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { expect, test } from "@playwright/test";
import { createGalleryViaUi, galleryPassword, newContext, publishGallery, RUN, unlockGallery } from "./helpers/galleries";

// Nur auf Zuruf gegen die Vorschau (npm run test:load): 1 100 Originale à 2 MiB (≈ 2,15 GiB) → 3 ZIP-Teile
// (≤ 500 Dateien je Teil). Erfolgskriterium 3 der Spec: mehrere GB zuverlässig herunterladen.
const FILES = 1100;
const BYTES = 2 * 1024 * 1024;
const PARTS = 3;

/** Gültiger JPEG-Anfang (SOI + APP0), danach Zufall: besteht die Typprüfung, lässt sich nicht komprimieren. */
function syntheticJpeg(): Buffer {
  const body = Buffer.alloc(BYTES);
  for (let offset = 0; offset < BYTES; offset += 65_536) crypto.getRandomValues(body.subarray(offset, Math.min(offset + 65_536, BYTES)));
  body.set([0xff, 0xd8, 0xff, 0xe0], 0);
  return body;
}

test("Lasttest: 1 100 Originale hochladen, alle ZIP-Teile laden und mit unzip prüfen", async ({ browser, baseURL }) => {
  test.setTimeout(4 * 60 * 60 * 1000);
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  const { id, slug } = await createGalleryViaUi(page, `Lasttest ${RUN}`);

  const started = Date.now();
  let next = 0;
  const uploader = async () => {
    while (next < FILES) {
      const index = next++;
      const name = `LAST_${String(index + 1).padStart(4, "0")}.jpg`;
      const response = await page.request.put(`/admin/api/galleries/${id}/images/${crypto.randomUUID()}/original`, {
        data: syntheticJpeg(),
        headers: { "content-type": "image/jpeg", "x-file-name": encodeURIComponent(name), "x-width": "6000", "x-height": "4000", "x-color": "#5a6b7c" },
        timeout: 180_000,
      });
      expect(response.status(), name).toBeLessThan(300);
    }
  };
  await Promise.all([uploader(), uploader(), uploader()]);
  console.log(`Upload: ${FILES} Dateien in ${Math.round((Date.now() - started) / 1000)} s`);

  await page.reload();
  await publishGallery(page);
  const password = await galleryPassword(page);
  const guest = await newContext(browser);
  await unlockGallery(await guest.newPage(), slug, password);
  const cookie = (await guest.cookies()).map((entry) => `${entry.name}=${entry.value}`).join("; ");

  mkdirSync("test-results/load", { recursive: true });
  for (let part = 1; part <= PARTS; part++) {
    const response = await fetch(`${baseURL}/g/${slug}/zip?set=all&part=${part}`, { headers: { cookie } });
    expect(response.status, `Teil ${part}`).toBe(200);
    const length = Number(response.headers.get("content-length"));
    expect(length, `Teil ${part}: Content-Length`).toBeGreaterThan(0);
    const file = `test-results/load/teil-${part}.zip`;
    const t0 = Date.now();
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(file));
    expect(statSync(file).size, `Teil ${part}: Größe`).toBe(length);
    execFileSync("unzip", ["-tq", file], { stdio: "inherit" });
    console.log(`Teil ${part}: ${(length / 1024 ** 3).toFixed(2)} GiB in ${Math.round((Date.now() - t0) / 1000)} s`);
  }
  expect((await fetch(`${baseURL}/g/${slug}/zip?set=all&part=${PARTS + 1}`, { headers: { cookie } })).status).not.toBe(200);
  await guest.close();
  rmSync("test-results/load", { recursive: true, force: true });

  // Aufräumen: Galerie samt R2-Dateien löschen.
  await page.goto(`/admin/galerien/${id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Galerie löschen" }).click();
  await expect(page).toHaveURL(/\/admin\/galerien$/);
  await admin.close();
});
```

- [ ] **Schritt 2: Laufen lassen und den Worker beobachten**

In einem zweiten Terminal (im Hintergrund):

```bash
npx wrangler tail --env preview --format json > test-results/tail-load.json
```

Dann:

```bash
npm run test:load
```

Danach das Tail beenden und auswerten:

```bash
grep -o '"outcome":"[a-zA-Z]*"' test-results/tail-load.json | sort | uniq -c
grep -o '"cpuTime":[0-9]*' test-results/tail-load.json | sort -t: -k2 -n | tail -5
```

Erwartet:
- Der Test ist grün: 3 Teile, jeder mit passender `Content-Length` und `unzip -t` ohne Fehler.
- Im Tail nur `"outcome":"ok"` (kein `exceededCpu`, kein `exception`).
- Die höchsten CPU-Zeiten liegen deutlich unter 30 000 ms.
- Upload-Dauer und Download-Zeiten je Teil ins Ledger.

- [ ] **Schritt 3: Falls die CPU nicht reicht**

Bei `exceededCpu`:
1. In `wrangler.jsonc` oben und unter `env.preview` `"limits": { "cpu_ms": 300000 }` ergänzen.
2. `npm run deploy:preview`, dann Schritt 2 wiederholen.
3. Im Ledger begründen.

Ohne `exceededCpu` bleibt die Konfiguration unverändert.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "test(launch): on-demand load test for large galleries (1100 originals, 3 zip parts)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Launch-Check, Anleitung, Vorschau, Review, Push

**Dateien:**
- Erstellen: `test/e2e/launch.spec.ts`
- Ändern: `package.json` (`test:launch`, `test:e2e:prod`), `README.md` (Abschnitt „Umzug auf cosmo-photos.de“)

**Schnittstellen:**
- Stellt bereit: `npm run test:launch` (prüft die Produktion auf Vollständigkeit der Inhalte)

- [ ] **Schritt 1: Launch-Check**

`test/e2e/launch.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

// Nur auf Zuruf gegen die Produktion (npm run test:launch): Ist alles da, was Besucher sehen? Voraussetzung für Task 13.
const CATEGORIES = [
  ["floorball", "Floorball"],
  ["volleyball", "Volleyball"],
  ["fussball", "Fußball"],
  ["hochzeiten", "Hochzeiten"],
  ["studio", "Studio"],
] as const;

test("Launch: Startseite mit Hero-Bildern", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-intro='collage'] img").first()).toBeVisible();
});

for (const [slug, name] of CATEGORIES) {
  test(`Launch: ${name} hat Bilder`, async ({ page }) => {
    await page.goto(`/${slug}`);
    await expect(page.getByText("Hier kommen bald Bilder.")).toHaveCount(0);
    await expect(page.getByRole("button", { name: `${name}, Foto 1` })).toBeVisible();
  });
}

test("Launch: Über mich mit Porträt", async ({ page }) => {
  await page.goto("/ueber-mich");
  await expect(page.locator("main .passepartout img")).toHaveCount(1);
});

test("Launch: Impressum und Datenschutz sind ausgefüllt", async ({ page }) => {
  for (const path of ["/impressum", "/datenschutz"]) {
    await page.goto(path);
    await expect(page.getByText("Dieser Text folgt in Kürze."), path).toHaveCount(0);
  }
});

test("Launch: Kontaktformular ist aktiv (Secrets gesetzt)", async ({ page }) => {
  await page.goto("/kontakt");
  await expect(page.getByRole("button", { name: "Nachricht senden" })).toBeVisible();
  await expect(page.locator('input[name="turnstile"]')).toBeAttached();
});

test("Launch: Instagram und Shop sind verlinkt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href*="instagram.com"]').first()).toBeAttached();
  await expect(page.locator('a[href*="pictrs"]').first()).toBeAttached();
});
```

`package.json`:
- nach `"test:load"` ergänzen:

```json
    "test:launch": "LAUNCH=1 bash scripts/e2e-deployed.sh prod --no-deps launch.spec.ts",
```

- `test:e2e:prod`:
  - `seo.spec.ts security.spec.ts` nach `motion.spec.ts` ergänzen
  - im `-g`-Muster `|Alte WordPress|Suchmaschinen|CSP` vor dem schließenden `\"` ergänzen

```bash
npm run test:launch
```
Erwartet: Stand heute rot (Produktion ohne Fotos, Porträt, Rechtstexte, Kontakt-Secrets). Das ist die Checkliste für Felix. Die Liste der roten Tests kommt in die Schlussnachricht.

- [ ] **Schritt 2: Anleitung für den Umzug**

In `README.md` am Ende ergänzen:

```markdown
### Umzug auf cosmo-photos.de

**Vorher (👤 Felix):**
1. Fotos je Kategorie, Porträt, Texte, Impressum und Datenschutz im Admin; Instagram- und Shop-Link unter „Texte & Links“.
2. Kontakt-Secrets setzen: `bash scripts/set-contact-secrets.sh`.
3. Turnstile: im Widget den Hostnamen `cosmo-photos.de` ergänzen.
4. Resend: Domain `cosmo-photos.de` hinzufügen. Die angezeigten DNS-Einträge im Cloudflare-DNS anlegen („Auto configure“ bei Resend oder von Hand): MX und TXT auf `send`, DKIM `resend._domainkey`. Warten, bis Resend „Verified“ zeigt, und die Absenderadresse festlegen (z. B. `kontakt@cosmo-photos.de`).
5. `npm run test:launch` ist grün.

**Umzug (Plan 6, Task 13):**
1. 👤 Cloudflare → `cosmo-photos.de` → DNS: die Einträge für `cosmo-photos.de` (A/AAAA) und, falls vorhanden, `www` fotografieren, dann löschen.
   **Nicht anfassen:** MX, TXT (SPF, DMARC), den Platzhalter `*` und alle übrigen Einträge. Die Mail bei All-Inkl läuft unverändert weiter.
2. `routes` (Custom Domains `cosmo-photos.de` und `www.cosmo-photos.de`) und `CONTACT_FROM` in `wrangler.jsonc`, Push auf `main`. Workers Builds verbindet die Domains (≈ 2–3 Minuten).
3. Prüfen:
   - Neue Seite unter `https://cosmo-photos.de`; `www` leitet um.
   - Alte WordPress-Adressen leiten um.
   - MX und SPF unverändert.
   - `npm run test:e2e:prod` und `npm run test:launch` grün.
   - Lighthouse auf der Domain.

**Rückweg:**
1. Workers & Pages → `cosmo-web` → Einstellungen → Domains & Routes: `cosmo-photos.de` und `www.cosmo-photos.de` entfernen.
2. Die fotografierten A/AAAA-Einträge wieder anlegen (Proxy an). Die WordPress-Seite ist sofort zurück.
3. Danach `routes` aus `wrangler.jsonc` entfernen, sonst verbindet der nächste Push die Domains erneut.

**Nachher (👤, optional):**
- Google Search Console: Domain-Property per DNS-TXT, Sitemap `https://cosmo-photos.de/sitemap.xml` einreichen.
- Den WordPress-Webspace erst kündigen, wenn alles läuft. Die Mail liegt im selben All-Inkl-Paket.
```

- [ ] **Schritt 3: Commit**

```bash
git add -A
git commit -m "docs(launch): launch check against production and domain move runbook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Schritt 4: Vorschau, abschließendes Review, Produktion**

Die Reihenfolge ist fest:

```bash
npm run check:lock && npm run deploy:preview && npm run test:e2e:preview
```
Erwartet: alle E2E-Tests gegen die Vorschau grün.

Dann:
1. Abschließendes Branch-Review laut executing-plans bzw. subagent-driven-development, samt Fix-Runde. Jede Korrektur RED→GREEN, danach Suite grün, `deploy:preview` + `test:e2e:preview` grün.
2. Produktion:

```bash
npm run db:migrate:remote
git push origin main
U="https://cosmo-web.felix-vatterodt.workers.dev/"
for i in $(seq 1 60); do
  if curl -s "$U" | grep -q 'rel="canonical"'; then echo "LIVE nach ~$((i*10))s"; break; fi
  sleep 10
done
npm run test:e2e:prod
```
Erwartet:
- Die Migration `0002_…` ist auf der Produktions-Datenbank angewendet, **vor** dem Push. Der neue Code braucht die Tabelle.
- `LIVE`.
- `test:e2e:prod` grün, inklusive der neuen Tests zu Weiterleitungen, Suchmaschinen und CSP.

- [ ] **Schritt 5: 👤 Felix schaut es sich an**

1. Neues privates Fenster → https://cosmo-web.felix-vatterodt.workers.dev: das Intro „Seite zuerst“ (Papier-Vorhang hebt sich, die Seite rückt nach), Scrollen, Kategorie, Lightbox.
2. Dasselbe auf dem Handy.
3. Die Liste aus dem Launch-Check (Schritt 1) abarbeiten; danach `npm run test:launch` erneut.

---

### Task 13: Umzug auf cosmo-photos.de (erst auf Felix' Go)

**Nur ausführen, wenn alle Voraussetzungen erfüllt sind:**
1. `npm run test:launch` ist grün (Inhalte vollständig).
2. Resend zeigt die Domain als „Verified“; Felix hat die Absenderadresse genannt.
3. Turnstile kennt den Hostnamen `cosmo-photos.de`.
4. Felix gibt ausdrücklich das Go, und zwar jetzt, nicht aus einer früheren Freigabe.

Bis dahin endet Plan 6 nach Task 12. Dieser Task wird später auf Zuruf ausgeführt.

**Dateien:**
- Ändern: `wrangler.jsonc` (oben: `routes`, `CONTACT_FROM`), `scripts/e2e-deployed.sh` (Produktion = Domain), `README.md` (Adressen)

- [ ] **Schritt 1: 👤 DNS vorbereiten**

Felix, im Cloudflare-Dashboard unter `cosmo-photos.de` → DNS:
1. Die Einträge `cosmo-photos.de` (A und AAAA) und, falls vorhanden, `www` fotografieren (für den Rückweg).
2. Diese Einträge löschen.

**Bleiben:** MX, TXT (SPF, DMARC), `*` und alle übrigen Einträge.

- [ ] **Schritt 2: Domains verbinden**

In `wrangler.jsonc` oben (nicht unter `env.preview`) nach `"vars"` ergänzen:

```jsonc
  // Hauptdomain (Plan 6, Task 13): Workers Builds verbindet die Custom Domains beim Deploy. www leitet im Worker um.
  "routes": [
    { "pattern": "cosmo-photos.de", "custom_domain": true },
    { "pattern": "www.cosmo-photos.de", "custom_domain": true }
  ],
```

Die obersten `"vars"` ergänzen: `"CONTACT_FROM": "Cosmo Photos <ABSENDER>"`, wobei `ABSENDER` die von Felix genannte, bei Resend geprüfte Adresse ist.

`scripts/e2e-deployed.sh`: `prod)    export PLAYWRIGHT_BASE_URL="https://cosmo-web.felix-vatterodt.workers.dev" ;;` → `prod)    export PLAYWRIGHT_BASE_URL="https://cosmo-photos.de" ;;`

`README.md`: die Produktions-Adresse auf `https://cosmo-photos.de` ändern. workers.dev bleibt für Tests erreichbar (`noindex`).

```bash
git add -A
git commit -m "feat(launch): serve production on cosmo-photos.de

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
for i in $(seq 1 60); do
  if curl -sI https://cosmo-photos.de/ | grep -qi "content-security-policy"; then echo "DOMAIN LIVE nach ~$((i*10))s"; break; fi
  sleep 10
done
```
Erwartet: `DOMAIN LIVE`.

- [ ] **Schritt 3: Prüfen**

```bash
dig +short MX cosmo-photos.de
dig +short TXT cosmo-photos.de
curl -sI https://cosmo-photos.de/ | grep -iE "^(x-robots-tag|strict-transport-security|content-security-policy)"
curl -sI https://www.cosmo-photos.de/ueber-mich | grep -iE "^(HTTP|location)"
curl -sIL https://cosmo-photos.de/biography/ | grep -iE "^(HTTP|location)"
npm run test:e2e:prod && npm run test:launch
npm run lighthouse -- https://cosmo-photos.de/ https://cosmo-photos.de/floorball https://cosmo-photos.de/ueber-mich https://cosmo-photos.de/en
```
Erwartet:
- **Mail und SPF:** `10 w01e49d9.kasserver.com.` und `"v=spf1 a mx include:spf.kasserver.com ~all"` stehen unverändert da.
- **Header der Domain:** kein `x-robots-tag`, `strict-transport-security` und `content-security-policy` gesetzt.
- **www:** `301` mit `location: https://cosmo-photos.de/ueber-mich`.
- **Alte Adressen:** `/biography/` endet mit `200` auf `/ueber-mich`.
- **Tests:** beide Suiten grün, gegen die Domain.
- **Lighthouse:** Performance, Barrierefreiheit, Best Practices und SEO ≥ 90, LCP < 2,5 s. Die Werte kommen in den Abschnitt „Review nach Abschluss“.

- [ ] **Schritt 4: 👤 Felix prüft von Hand**

1. Eine Testnachricht über das Kontaktformular: Sie kommt vom neuen Absender an.
2. Einen Galerie-Link auf dem Handy öffnen und ein Foto herunterladen.
3. Optional: Google Search Console und Sitemap (siehe README).

Bei Problemen: Rückweg laut README und Ursache klären.
