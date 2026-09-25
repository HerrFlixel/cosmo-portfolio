# Plan 3 · Kundengalerien: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Felix legt im Admin Kundengalerien an, lädt Originale hoch und verschickt Link und Passwort. Kunden öffnen die Galerie mit dem Passwort, sehen die Bilder, markieren Favoriten unter ihrem Namen und laden einzeln oder als ZIP (in Teilen ≤ 2 GB) herunter. Felix sieht Favoriten und Statistik.

**Architektur:**
- **Speicher:** eigener, **privater** R2-Bucket `GALLERIES` (`cosmo-galleries` / `cosmo-galleries-preview`). Keine Custom Domain, niemals öffentlich.
- **Upload:**
  - Der Browser erzeugt Vorschau (800 px) und Web-Größe (2400 px).
  - Das Original wird **im Worker selbst gestreamt**: `custom-worker.ts` → `src/edge/galleries.ts`, vorbei an Next. Der Worker berechnet dabei CRC32 und Größe und legt erst danach den DB-Eintrag an.
- **Auslieferung:** Bilder, Originale und ZIP-Streams laufen ebenfalls im Worker. Er prüft ein HMAC-signiertes Galerie-Cookie (`cosmo_galerie`, Pfad `/g/<slug>`, 30 Tage).
  - Das ZIP ist STORE ohne Kompression, mit exakter `Content-Length` (`FixedLengthStream`) und in Teile ≤ 2 GB geteilt.
- **Seiten und Formulare:** Die Galerie-Seite `/g/[slug]` und der Admin sind Next-Seiten mit Server Actions. Die Galerie-Passwörter liegen als PBKDF2-Hash (Prüfung) und AES-GCM-verschlüsselt (Anzeige im Admin) in der Datenbank.

**Tech-Stack:** wie Plan 1–2, keine neuen Pakete.

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`
- Betroffen: §3.2 (Routen `/g/…`), §3.3 (Upload), §3.4 (ZIP), §7 (Kundenbereich), §8 (Admin-Galerien), §9 (`galleries`, `gallery_images`, `favorites`, `gallery_events`), §10 und §11.
- Offene Punkte aus Plan 2, die hier erledigt werden:
  - Originale streamen
  - eigener Weg für Originale
  - eigener Bucket wegen Custom-Domain-Risiko
  - `updated_at` aktualisieren
  - wiederholte Registrierung derselben Bild-ID ohne 500
  - Slugs kleinschreiben

## Planreihe

| Plan | Phase | Status |
|---|---|---|
| 1 · Fundament | Setup, Datenbank, Routing, Tokens, Deploy | ✅ erledigt |
| 2 · Admin-Kern | Login, Upload-Pipeline, Portfolio, Texte | ✅ erledigt |
| **3 · Kundengalerien** | Galerien, Passwort, Favoriten, Statistik, ZIP | **dieser Plan** |
| 4 · Öffentliche Seiten | Start, Kategorien, Lightbox, Über mich, Kontakt, Pflichtseiten | folgt |
| 5 · Bewegung | Intro „Orbit“, Lenis, „Licht aus“, Parallaxe, Übergänge | folgt |
| 6 · Launch | SEO, Performance, Barrierefreiheit, Domain-Umzug | folgt |

## Globale Vorgaben

- **Regeln aus Plan 1 und 2 bleiben gültig:**
  - Repo `/Volumes/CosmoDev/cosmo-website`, Branch `main`
  - `npm install --save-exact` + `npm run deps:lock`
  - Edge-`middleware.ts`, `custom-worker.ts` als `main`
  - Tests in workerd bzw. gegen `preview:e2e`, Admin-E2E mit gespeicherter Sitzung (`ADMIN_STATE`)
  - `alert`-Prüfungen eingegrenzt
- **Galerie-Dateien liegen nur im Bucket `GALLERIES`.** Schlüssel: `<galleryId>/<imageId>/<thumb|preview|original>`. Die öffentliche `/media`-Route und der `MEDIA`-Bucket bleiben für Portfolio und Website.
- **Galerie-Varianten:** `thumb` = 800 px, `preview` = 2400 px (WebP, sonst JPEG, max. 10 MB), `original` = unverändertes **JPEG**, max. **95 MB** (Cloudflare-Request-Limit 100 MB).
- **Zugang:**
  - Cookie `cosmo_galerie`: HttpOnly, Secure, SameSite=Lax, `Path=/g/<slug>`, **30 Tage**.
  - Signiert mit `GALLERY_SECRET` (≥ 32 Zeichen, neues Secret).
  - Enthält eine Passwort-Version: Ändert Felix das Passwort, verlieren alte Cookies den Zugang.
- **Besuchername:** Cookie `cosmo_besucher` (nicht HttpOnly, `Path=/g/<slug>`, 1 Jahr), 1–40 Zeichen nach Trimmen, für Favoriten und Statistik.
- **Passwort-Rate-Limit:** Binding `GALLERY_LIMITER`, **5 Versuche pro 60 s** je IP und Galerie. Die Spec nennt 10 Minuten, das Binding erlaubt aber nur 10 oder 60 s → 60 s.
- **Standard-Passwort** `wort-wort-NN` aus einer festen Wortliste; das Standard-Ablaufdatum ist +30 Tage. „Verlängern“ rechnet +30 Tage ab dem späteren Zeitpunkt von jetzt und dem bisherigen Ablaufdatum.
- **ZIP:**
  - STORE, UTF-8-Dateinamen (Flag 0x0800), feste Zeitstempel (1.1.2026).
  - Doppelte Namen werden `name (2).jpg`, gezählt über die ganze Auswahl, damit sich Teile beim Entpacken nicht überschreiben.
  - Teile ≤ 2 000 000 000 Bytes, **kein Zip64 nötig** (jeder Teil < 4 GiB).
  - Dateiname `Cosmo-Photos_<slug>[_Favoriten][_Teil-N-von-M].zip`.
- **Statistik ohne IP-Adressen.** Ereignisse: `view`, `download_image`, `download_zip`, `favorite_add`, `favorite_remove`.
- **Sortierung** der Galeriebilder nach Dateiname (ohne Groß/Klein-Unterschied).
- **Datum:** Ablauf = Ende des gewählten Tages in Berlin (`endOfBerlinDay`); Anzeige und Eingabefelder rechnen immer mit `Europe/Berlin`.
- **Sprache der Galerie:** Cookie `NEXT_LOCALE` (wie die öffentliche Seite), sonst `Accept-Language` (deutsch → `de`, sonst `en`), dazu ein Umschalter.
- **Server Actions:** Jede Admin-Aktion ruft `requireAdmin()`. Die öffentliche Galerie-Aktion (Passwort) steht in der Ausnahmeliste von `scripts/check-server-actions.mjs`.
- Commit-Messages im Conventional-Commits-Stil mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 👤 = Felix.

## Bewusste Abweichungen von der Spec

| Spec | Plan | Grund |
|---|---|---|
| §3.3: Originale über 90 MB per R2-Multipart in 50-MB-Teilen | Originale bis 95 MB in **einem** Request, größere werden mit klarer Meldung abgelehnt | JPEG-Exporte aktueller Kameras (bis 100 MP) liegen deutlich darunter. Multipart bräuchte drei weitere Routen und eine CRC-Verkettung und lässt sich später ergänzen, ohne das Datenmodell zu ändern |
| §3.3: CRC32 im Browser | CRC32 und Größe berechnet der **Worker** beim Streamen | So wird genau das geprüft, was im Bucket liegt, und ein Browserfehler kann keinen falschen ZIP-Header erzeugen |
| §3.4: ZIP „Zip64-fähig“ | klassisches ZIP, Teile ≤ 2 GB | Jeder Teil bleibt unter 4 GiB und unter 65 535 Dateien, Zip64 würde also nie gebraucht. Andernfalls bricht `zipStream` mit einer klaren Meldung ab |
| §7.2: Sperre nach 5 Fehlversuchen in 10 Minuten | 5 Versuche pro 60 s (je IP und Galerie) | Das Rate-Limit-Binding (Spec §2) kennt nur 10 s oder 60 s |
| §7.1: Raster „virtualisiert“ | `loading="lazy"` + `content-visibility: auto` | Lädt und zeichnet nur, was sichtbar ist, ohne zusätzliche Bibliothek; reicht für Galerien mit rund 1 000 Bildern |
| §7.4: Cookies signiert und HttpOnly | Das Namens-Cookie `cosmo_besucher` ist unsigniert und wird per JavaScript gesetzt | Es ist nur ein Anzeigename ohne Rechte; der Zugang hängt allein am signierten HttpOnly-Cookie `cosmo_galerie` |
| §8: „Reiter“ Favoriten/Statistik | Abschnitte untereinander auf der Detailseite | gleiche Inhalte, weniger Klicks |
| §6 `/kunden` (Feld „Galerie-Code“), §7.4 `robots.txt` | nicht in diesem Plan | gehören zu Plan 4 (öffentliche Seiten) bzw. Plan 6 (SEO) |

## Review-Fokus

1. **Zugriff auf fremde oder gesperrte Galerien:** Dateien und ZIP ohne Cookie, mit dem Cookie einer anderen Galerie, nach Passwortwechsel; Entwurf, abgelaufen; Bild-ID aus einer anderen Galerie. Erwartung: 401/404/410, nie Daten. *Tests: Task 1 (`gallery-token`), Task 4 (`edge-galleries.test.ts`).*
2. **Große und kaputte Originale:** 40 MB, über 95 MB, getarntes Nicht-JPEG, fehlende Größenangabe, Upload bricht zwischen Varianten und Original ab. Erwartung: klare 4xx, kein DB-Eintrag, keine Datei-Leichen. *Tests: Task 2 (`addImage`), Task 4 (Upload-Fälle).*
3. **ZIP-Integrität:** Umlaute und doppelte Dateinamen, Galerie über 2 GB (Teile), exakte `Content-Length`, richtige CRCs, echtes `unzip -t`. *Tests: Task 3 (`zip.test.ts`), Task 4 (Länge und CRC), Task 7 (E2E mit `unzip -t`).*
4. **Besuchernamen:** leer, 200 Zeichen, Emoji, „Anna“ vs. „anna“, gleiche Bilder bei zwei Personen. Erwartung: sauber begrenzt, Favoriten pro Name getrennt. *Tests: Task 2 (`normalizeVisitorName`, Favoriten), Task 8 (E2E).*
5. **Passwort:** falsch (gebremst), geändert (alte Cookies ungültig), Galerie läuft ab, während das Cookie noch gilt. *Tests: Task 1 (Token-Version), Task 4 (410), Task 7 (E2E).*

---

## Dateistruktur (neu bzw. geändert)

```
wrangler.jsonc                      # + r2 GALLERIES, ratelimits GALLERY_LIMITER (auch env.preview)
vitest.config.mts                   # + r2Buckets GALLERIES
.dev.vars.example / .dev.vars       # + GALLERY_SECRET (Test)
next.config.ts                      # + headers() für /g/:path*
custom-worker.ts                    # + handleGalleryEdge vor OpenNext
package.json                        # test:e2e:prod + gallery-public.spec.ts
scripts/check-server-actions.mjs    # + Ausnahme src/app/g/[slug]/actions.ts
README.md                           # Galerien: Bucket, Secret, Migration
drizzle/0001_gallery_password_cipher.sql
src/lib/db/schema.ts                # + galleries.password_cipher, updated_at $onUpdate
src/lib/bindings.ts / env.ts        # + GALLERIES
src/lib/auth/origin.ts              # sameHost (aus admin.ts herausgelöst)
src/lib/auth/session.ts             # + ADMIN_COOKIE (aus admin.ts, damit der Worker ihn ohne Next nutzen kann)
src/lib/auth/signed.ts              # signPayload / verifyPayload (HMAC)
src/lib/crypto/box.ts               # encryptText / decryptText (AES-GCM)
src/lib/format.ts                   # formatBytes, formatDate, formatDateInput, endOfBerlinDay
src/lib/cookies.ts                  # readCookie
src/lib/galleries/{slug,password,token,keys,locale,message,repo,secret,upload,i18n}.ts
src/lib/zip/{crc32,zip}.ts          # CRC32, ZIP-Stream, Teile (zipPartsFor)
src/edge/galleries.ts               # Worker-Routen: Upload Original/Varianten, Admin-Vorschau, Dateien, ZIP
src/lib/image/process.ts / upload.ts      # processImage(file, sizes), putWithRetry exportiert
src/components/admin/upload-zone.tsx      # von portfolio/[category] hierher verschoben (geteilt)
src/app/admin/(protected)/layout.tsx      # Navigation „Galerien“
src/app/admin/(protected)/galerien/{page.tsx,actions.ts,new-gallery-form.tsx,labels.ts}
src/app/admin/(protected)/galerien/[id]/{page.tsx,actions.ts,gallery-settings.tsx,password-panel.tsx,message-panel.tsx,gallery-images.tsx,delete-button.tsx,favorites-panel.tsx,events-panel.tsx}
src/app/g/layout.tsx
src/app/g/[slug]/{page.tsx,actions.ts,password-form.tsx,gallery-view.tsx,lightbox.tsx,locale-switch.tsx,name-dialog.tsx}
src/app/g/[slug]/api/favorites/route.ts
src/messages/de.json / en.json      # + Namespace "gallery"
test/unit/{slug,gallery-password,box,signed,gallery-token,crc32,format,gallery-locale,gallery-message,gallery-repo,zip,edge-galleries}.test.ts
test/e2e/helpers/galleries.ts
test/e2e/{admin-galleries,gallery-client,gallery-public,gallery-favorites}.spec.ts
```

---

### Task 1: Grundlagen (Schema, Bucket, Secrets, reine Helfer)

**Dateien:**
- Erstellen:
  - `src/lib/auth/signed.ts`, `src/lib/crypto/box.ts`, `src/lib/format.ts`, `src/lib/cookies.ts`
  - `src/lib/galleries/slug.ts`, `src/lib/galleries/password.ts`, `src/lib/galleries/token.ts`, `src/lib/galleries/keys.ts`, `src/lib/galleries/locale.ts`, `src/lib/galleries/message.ts`
  - `src/lib/zip/crc32.ts`, `drizzle/0001_gallery_password_cipher.sql` (generiert)
  - Tests: `test/unit/{slug,gallery-password,box,signed,gallery-token,crc32,format,gallery-locale,gallery-message}.test.ts`
- Ändern: `src/lib/db/schema.ts`, `wrangler.jsonc`, `vitest.config.mts`, `.dev.vars.example`, `.dev.vars`, `src/lib/bindings.ts`, `src/lib/env.ts`, `cloudflare-env.d.ts`

**Schnittstellen:**
- Stellt bereit:
  - `signPayload(payload: object, secret): Promise<string>`, `verifyPayload<T>(token | undefined, secret): Promise<T | null>`
  - `encryptText(plain, secret): Promise<string>`, `decryptText(box, secret): Promise<string>` (wirft bei falschem Schlüssel oder Manipulation)
  - `formatBytes(bytes, locale: "de" | "en"): string`, `formatDate(iso, locale): string`, `formatDateInput(iso): string` (Berliner Tag als `YYYY-MM-DD`), `endOfBerlinDay(date): string`, `readCookie(request | headerValue, name): string | undefined`
  - `slugify(title): string`, `SLUG_PATTERN`, `generateGalleryPassword(randomInt?): string`
  - `GALLERY_COOKIE = "cosmo_galerie"`, `VISITOR_COOKIE = "cosmo_besucher"`, `GALLERY_ACCESS_SECONDS`, `createGalleryToken(secret, gallery: { id; passwordHash }, nowSeconds)`, `verifyGalleryToken(token, secret, gallery, nowSeconds): Promise<boolean>`
  - `GALLERY_VARIANTS`, `type GalleryVariant`, `galleryKey(galleryId, imageId, variant)`
  - `type GalleryLocale = "de" | "en"`, `resolveGalleryLocale(cookieLocale, acceptLanguage): GalleryLocale`
  - `galleryMessage({ locale, url, password, expiresAt }): string`
  - `crc32(bytes): number`, `crc32Update(crc, bytes): number`, `CRC32_START`, `crc32Finish(crc): number`
  - Schema: `galleries.passwordCipher`, `updatedAt` wird bei jedem Update gesetzt
  - Bindings `GALLERIES` (R2), `GALLERY_LIMITER` (Rate-Limit), Secret `GALLERY_SECRET`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, slugify } from "@/lib/galleries/slug";

describe("slugify", () => {
  it("makes readable lowercase slugs with German transliteration", () => {
    expect(slugify("Final4 Zwickau 2026")).toBe("final4-zwickau-2026");
    expect(slugify("Hochzeit Müller & Groß")).toBe("hochzeit-mueller-gross");
    expect(slugify("Café Olé!")).toBe("cafe-ole");
  });

  it("falls back to 'galerie' and never ends with a dash", () => {
    expect(slugify("  *** ")).toBe("galerie");
    const long = slugify("a".repeat(59) + " b c d e f");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
  });

  it("produces slugs that match SLUG_PATTERN", () => {
    for (const title of ["Derby ETV vs. SVE", "ÄÖÜ äöü ß", "x"]) expect(slugify(title)).toMatch(SLUG_PATTERN);
    expect("Grosse-Galerie").not.toMatch(SLUG_PATTERN);
    expect("a--b").not.toMatch(SLUG_PATTERN);
  });
});
```

`test/unit/gallery-password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateGalleryPassword } from "@/lib/galleries/password";

describe("generateGalleryPassword", () => {
  it("builds 'word-word-NN' from two different words", () => {
    for (let i = 0; i < 50; i++) {
      const password = generateGalleryPassword();
      expect(password).toMatch(/^[a-z]{3,}-[a-z]{3,}-[1-9][0-9]$/);
      const [a, b] = password.split("-");
      expect(a).not.toBe(b);
    }
  });

  it("is deterministic with an injected random source", () => {
    expect(generateGalleryPassword(() => 0)).toBe(generateGalleryPassword(() => 0));
  });
});
```

`test/unit/box.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decryptText, encryptText } from "@/lib/crypto/box";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";

describe("encryptText / decryptText", () => {
  it("round-trips and uses a fresh IV each time", async () => {
    const a = await encryptText("rauch-hallen-47", SECRET);
    const b = await encryptText("rauch-hallen-47", SECRET);
    expect(a).not.toBe(b);
    expect(a.startsWith("v1.")).toBe(true);
    expect(await decryptText(a, SECRET)).toBe("rauch-hallen-47");
  });

  it("fails with another secret or a tampered box", async () => {
    const box = await encryptText("geheim", SECRET);
    await expect(decryptText(box, "anderes-secret-mit-mindestens-32-zeichen")).rejects.toThrow();
    const i = box.length - 2; // vorletztes Zeichen: das letzte kann reine Füllbits tragen
    const tampered = box.slice(0, i) + (box[i] === "A" ? "B" : "A") + box.slice(i + 1);
    await expect(decryptText(tampered, SECRET)).rejects.toThrow();
    await expect(decryptText("kaputt", SECRET)).rejects.toThrow("Ungültiges Format.");
  });
});
```

`test/unit/signed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { signPayload, verifyPayload } from "@/lib/auth/signed";

const SECRET = "signier-secret-mit-mindestens-32-zeichen";

describe("signPayload / verifyPayload", () => {
  it("returns the payload for a valid token", async () => {
    const token = await signPayload({ g: "abc", exp: 5 }, SECRET);
    expect(await verifyPayload(token, SECRET)).toEqual({ g: "abc", exp: 5 });
  });

  it("returns null for other secrets, tampering and garbage", async () => {
    const token = await signPayload({ g: "abc" }, SECRET);
    expect(await verifyPayload(token, "anderes-secret-mit-mindestens-32-zeichen")).toBeNull();
    const [, sig] = token.split(".");
    expect(await verifyPayload(`${btoa('{"g":"xyz"}').replace(/=+$/, "")}.${sig}`, SECRET)).toBeNull();
    for (const bad of [undefined, "", "a.b.c", "!!!.???"]) expect(await verifyPayload(bad, SECRET)).toBeNull();
  });
});
```

`test/unit/gallery-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { GALLERY_ACCESS_SECONDS, createGalleryToken, verifyGalleryToken } from "@/lib/galleries/token";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const NOW = 1_800_000_000;
const gallery = { id: "g1", passwordHash: "pbkdf2-sha256$100000$salt$hashhashhashhash-A" };

describe("gallery access tokens", () => {
  it("grant access to exactly this gallery for 30 days", async () => {
    expect(GALLERY_ACCESS_SECONDS).toBe(30 * 24 * 60 * 60);
    const token = await createGalleryToken(SECRET, gallery, NOW);
    expect(await verifyGalleryToken(token, SECRET, gallery, NOW + GALLERY_ACCESS_SECONDS - 1)).toBe(true);
    expect(await verifyGalleryToken(token, SECRET, gallery, NOW + GALLERY_ACCESS_SECONDS)).toBe(false);
  });

  it("do not open another gallery", async () => {
    const token = await createGalleryToken(SECRET, gallery, NOW);
    expect(await verifyGalleryToken(token, SECRET, { ...gallery, id: "g2" }, NOW)).toBe(false);
  });

  it("stop working after the password was changed", async () => {
    const token = await createGalleryToken(SECRET, gallery, NOW);
    const changed = { ...gallery, passwordHash: "pbkdf2-sha256$100000$salt$anderesPasswortHash-B" };
    expect(await verifyGalleryToken(token, SECRET, changed, NOW)).toBe(false);
  });

  it("reject missing or foreign tokens", async () => {
    expect(await verifyGalleryToken(undefined, SECRET, gallery, NOW)).toBe(false);
    const foreign = await createGalleryToken("anderes-secret-mit-mindestens-32-zeichen", gallery, NOW);
    expect(await verifyGalleryToken(foreign, SECRET, gallery, NOW)).toBe(false);
  });
});
```

`test/unit/crc32.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CRC32_START, crc32, crc32Finish, crc32Update } from "@/lib/zip/crc32";

const ascii = (s: string) => new TextEncoder().encode(s);

describe("crc32", () => {
  it("matches the standard check value", () => {
    expect(crc32(ascii("123456789"))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it("gives the same result when fed in chunks", () => {
    let crc = CRC32_START;
    crc = crc32Update(crc, ascii("1234"));
    crc = crc32Update(crc, ascii("56789"));
    expect(crc32Finish(crc)).toBe(0xcbf43926);
  });
});
```

`test/unit/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { endOfBerlinDay, formatBytes, formatDate, formatDateInput } from "@/lib/format";
import { readCookie } from "@/lib/cookies";

describe("formatBytes", () => {
  it("uses decimal units and the locale's decimal separator", () => {
    expect(formatBytes(3_200_000_000, "de")).toBe("3,2 GB");
    expect(formatBytes(3_200_000_000, "en")).toBe("3.2 GB");
    expect(formatBytes(950_000, "de")).toBe("950 KB");
    expect(formatBytes(0, "de")).toBe("0 B");
  });
});

describe("formatDate", () => {
  it("formats in German and British English (Berlin time)", () => {
    expect(formatDate("2026-10-24T21:59:00.000Z", "de")).toBe("24.10.2026");
    expect(formatDate("2026-10-24T21:59:00.000Z", "en")).toBe("24 Oct 2026");
  });
});

describe("formatDateInput / endOfBerlinDay", () => {
  it("round-trips a chosen day in summer and winter without shifting it", () => {
    for (const day of ["2026-07-01", "2026-10-24", "2026-12-31"]) {
      expect(endOfBerlinDay(day)).toBe(`${day}T21:59:59.000Z`);
      expect(formatDateInput(endOfBerlinDay(day))).toBe(day);
      expect(formatDate(endOfBerlinDay(day), "de")).toBe(day.split("-").reverse().join("."));
    }
  });

  it("uses the Berlin calendar day for date inputs", () => {
    expect(formatDateInput("2026-01-10T23:30:00.000Z")).toBe("2026-01-11");
  });
});

describe("readCookie", () => {
  it("reads and decodes a cookie from a header", () => {
    expect(readCookie("a=1; cosmo_besucher=Anna%20M%C3%BCller; b=2", "cosmo_besucher")).toBe("Anna Müller");
    expect(readCookie("a=1", "cosmo_besucher")).toBeUndefined();
    expect(readCookie("cosmo_besucher=%E0%A4%A", "cosmo_besucher")).toBeUndefined();
    expect(readCookie(null, "x")).toBeUndefined();
  });
});
```

`test/unit/gallery-locale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveGalleryLocale } from "@/lib/galleries/locale";

describe("resolveGalleryLocale", () => {
  it("prefers the explicit cookie", () => {
    expect(resolveGalleryLocale("en", "de-DE,de;q=0.9")).toBe("en");
    expect(resolveGalleryLocale("de", "en-US")).toBe("de");
  });

  it("falls back to Accept-Language: German → de, everything else → en", () => {
    expect(resolveGalleryLocale(undefined, "de-AT,de;q=0.9")).toBe("de");
    expect(resolveGalleryLocale(undefined, "en-US,en;q=0.9")).toBe("en");
    expect(resolveGalleryLocale(undefined, "fr-FR")).toBe("en");
    expect(resolveGalleryLocale("xx", null)).toBe("de");
  });
});
```

`test/unit/gallery-message.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { galleryMessage } from "@/lib/galleries/message";

const base = { url: "https://cosmo-photos.de/g/final4-2026", password: "rauch-hallen-47" };

describe("galleryMessage", () => {
  it("writes a German message with link, password and expiry", () => {
    const text = galleryMessage({ ...base, locale: "de", expiresAt: "2026-10-24T21:59:00.000Z" });
    expect(text).toContain("https://cosmo-photos.de/g/final4-2026");
    expect(text).toContain("Passwort: rauch-hallen-47");
    expect(text).toContain("bis 24.10.2026");
  });

  it("writes an English message and handles unlimited galleries", () => {
    const text = galleryMessage({ ...base, locale: "en", expiresAt: null });
    expect(text).toContain("Password: rauch-hallen-47");
    expect(text).toContain("stays online");
  });
});
```

```bash
npm test
```
Erwartet: FAIL, die neun neuen Dateien melden „Cannot find package '@/lib/…'“. Die bisherigen 57 Tests bleiben grün.

- [ ] **Schritt 2: Reine Helfer implementieren**

`src/lib/auth/signed.ts`:

```ts
import { fromBase64Url, toBase64Url } from "./encoding.ts";

const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Token: base64url(JSON).base64url(HMAC-SHA256). */
export async function signPayload(payload: object, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifyPayload<T>(token: string | undefined, secret: string): Promise<T | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(parts[1]), encoder.encode(parts[0]));
    return valid ? (JSON.parse(new TextDecoder().decode(fromBase64Url(parts[0]))) as T) : null;
  } catch {
    return null;
  }
}
```

`src/lib/crypto/box.ts`:

```ts
import { fromBase64Url, toBase64Url } from "@/lib/auth/encoding";

const encoder = new TextEncoder();

async function aesKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** Verschlüsselt kurze Texte (Galerie-Passwörter) für die Anzeige im Admin. Format: v1.<iv>.<ciphertext>. */
export async function encryptText(plain: string, secret: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), encoder.encode(plain));
  return `v1.${toBase64Url(iv)}.${toBase64Url(cipher)}`;
}

export async function decryptText(box: string, secret: string): Promise<string> {
  const [version, iv, cipher] = box.split(".");
  if (version !== "v1" || !iv || !cipher) throw new Error("Ungültiges Format.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, await aesKey(secret), fromBase64Url(cipher));
  return new TextDecoder().decode(plain);
}
```

`src/lib/format.ts`:

```ts
export type Locale = "de" | "en";

const UNITS = ["B", "KB", "MB", "GB", "TB"];
const BERLIN = "Europe/Berlin";

/** Dezimale Einheiten (1 GB = 10⁹ Byte), wie sie Betriebssysteme und Browser anzeigen. */
export function formatBytes(bytes: number, locale: Locale): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const number = new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: unit >= 2 ? 1 : 0 }).format(value);
  return `${number} ${UNITS[unit]}`;
}

export function formatDate(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "de"
    ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: BERLIN }).format(date)
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: BERLIN }).format(date);
}

/** Kalendertag in Berlin als YYYY-MM-DD (Wert für <input type="date">). */
export function formatDateInput(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: BERLIN }).format(new Date(iso));
}

/**
 * Ablaufzeitpunkt für einen gewählten Tag: 21:59:59 UTC liegt in Sommer- und Winterzeit noch am selben Berliner Tag
 * (23:59:59 bzw. 22:59:59 Ortszeit) – Anzeige und Eingabefeld zeigen also immer den gewählten Tag.
 */
export function endOfBerlinDay(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ungültiges Datum: ${date}`);
  return `${date}T21:59:59.000Z`;
}
```

`src/lib/cookies.ts`:

```ts
/** Liest ein Cookie aus einem Request oder einem Cookie-Header; kaputte Kodierung → undefined. */
export function readCookie(source: Request | string | null, name: string): string | undefined {
  const header = typeof source === "string" || source === null ? source : source.headers.get("cookie");
  for (const part of (header ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key !== name) continue;
    try {
      return decodeURIComponent(rest.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}
```

`src/lib/galleries/slug.ts`:

```ts
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lesbarer Kurzname für /g/<slug>: klein, ASCII, Bindestriche, max. 60 Zeichen. */
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return slug || "galerie";
}
```

`src/lib/galleries/password.ts`:

```ts
const WORDS = [
  "abend", "anstoss", "ball", "bank", "blende", "blitz", "block", "bogen", "brise", "dach",
  "derby", "dunst", "ecke", "einlauf", "feld", "finale", "flanke", "foto", "funke", "glanz",
  "halle", "hafen", "himmel", "jubel", "kamera", "kante", "kurve", "libero", "licht", "linse",
  "meer", "moment", "nebel", "netz", "parade", "pause", "pokal", "rauch", "regen", "ring",
  "sand", "satz", "schatten", "schuss", "sieg", "sonne", "spiel", "sprung", "stern", "sturm",
  "tor", "tribuene", "wand", "welle", "wind", "wolke", "zeit", "ziel", "jubelruf", "anpfiff",
];

const cryptoRandomInt = (max: number) => crypto.getRandomValues(new Uint32Array(1))[0] % max;

/** Merkbares Passwort „wort-wort-NN“ (60 × 59 × 90 ≈ 320 000 Kombinationen, dazu Rate-Limit). */
export function generateGalleryPassword(randomInt: (max: number) => number = cryptoRandomInt): string {
  const first = WORDS[randomInt(WORDS.length)];
  const rest = WORDS.filter((word) => word !== first);
  const second = rest[randomInt(rest.length)];
  return `${first}-${second}-${10 + randomInt(90)}`;
}
```

`src/lib/galleries/token.ts`:

```ts
import { signPayload, verifyPayload } from "@/lib/auth/signed";

export const GALLERY_COOKIE = "cosmo_galerie";
export const VISITOR_COOKIE = "cosmo_besucher";
export const GALLERY_ACCESS_SECONDS = 30 * 24 * 60 * 60;

type GalleryRef = { id: string; passwordHash: string };
type Payload = { g: string; v: string; exp: number };

/** Ein Stück des Hashes: ändert sich mit dem Passwort → alte Zugänge werden ungültig. */
const passwordVersion = (passwordHash: string) => passwordHash.slice(-12);

export function createGalleryToken(secret: string, gallery: GalleryRef, nowSeconds: number): Promise<string> {
  return signPayload({ g: gallery.id, v: passwordVersion(gallery.passwordHash), exp: nowSeconds + GALLERY_ACCESS_SECONDS }, secret);
}

export async function verifyGalleryToken(token: string | undefined, secret: string, gallery: GalleryRef, nowSeconds: number): Promise<boolean> {
  const payload = await verifyPayload<Partial<Payload>>(token, secret);
  return (
    payload !== null &&
    payload.g === gallery.id &&
    payload.v === passwordVersion(gallery.passwordHash) &&
    typeof payload.exp === "number" &&
    payload.exp > nowSeconds
  );
}
```

`src/lib/galleries/keys.ts`:

```ts
export const GALLERY_VARIANTS = ["thumb", "preview", "original"] as const;
export type GalleryVariant = (typeof GALLERY_VARIANTS)[number];

/** Schlüssel im privaten Bucket GALLERIES. */
export function galleryKey(galleryId: string, imageId: string, variant: GalleryVariant): string {
  return `${galleryId}/${imageId}/${variant}`;
}
```

`src/lib/galleries/locale.ts`:

```ts
import type { Locale } from "@/lib/format";

export type GalleryLocale = Locale;

/** Cookie NEXT_LOCALE (wie die öffentliche Seite) → sonst Browsersprache (deutsch → de, sonst en). */
export function resolveGalleryLocale(cookieLocale: string | undefined, acceptLanguage: string | null): GalleryLocale {
  if (cookieLocale === "de" || cookieLocale === "en") return cookieLocale;
  if (acceptLanguage === null) return "de";
  return /^\s*de\b/i.test(acceptLanguage) ? "de" : "en";
}
```

`src/lib/galleries/message.ts`:

```ts
import { formatDate, type Locale } from "@/lib/format";

type Input = { locale: Locale; url: string; password: string; expiresAt: string | null };

/** Fertiger Text zum Einfügen in Mail oder WhatsApp (Spec §7.1). */
export function galleryMessage({ locale, url, password, expiresAt }: Input): string {
  if (locale === "de") {
    const availability = expiresAt ? `Die Galerie ist bis ${formatDate(expiresAt, "de")} online.` : "Die Galerie bleibt dauerhaft online.";
    return `Hallo!\n\nDeine Fotos sind online:\n${url}\n\nPasswort: ${password}\n${availability}\n\nViele Grüße\nFelix · Cosmo Photos`;
  }
  const availability = expiresAt ? `The gallery is online until ${formatDate(expiresAt, "en")}.` : "The gallery stays online.";
  return `Hi!\n\nYour photos are online:\n${url}\n\nPassword: ${password}\n${availability}\n\nBest regards\nFelix · Cosmo Photos`;
}
```

`src/lib/zip/crc32.ts`:

```ts
const TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export const CRC32_START = 0xffffffff;

/** Laufende CRC32 (für Streams): mit CRC32_START beginnen, am Ende crc32Finish. */
export function crc32Update(crc: number, bytes: Uint8Array): number {
  let c = crc;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return c >>> 0;
}

export const crc32Finish = (crc: number) => (crc ^ 0xffffffff) >>> 0;

export const crc32 = (bytes: Uint8Array) => crc32Finish(crc32Update(CRC32_START, bytes));
```

```bash
npm test
```
Erwartet: 22 Testdateien, alle neuen Tests PASS (57 + 24 = 81 Tests).

- [ ] **Schritt 3: Schema, Migration, Bucket, Secret**

In `src/lib/db/schema.ts` im Block `galleries`:
- nach `passwordSalt` ergänzen: `passwordCipher: text("password_cipher").notNull().default(""),`
- `updatedAt` ersetzen durch: `updatedAt: text("updated_at").notNull().default(now).$onUpdate(() => now),`

```bash
npm run db:generate -- --name gallery_password_cipher
cat drizzle/0001_gallery_password_cipher.sql
```
Erwartet: `ALTER TABLE \`galleries\` ADD \`password_cipher\` text DEFAULT '' NOT NULL;`

In `wrangler.jsonc` auf oberster Ebene bei `r2_buckets` ergänzen: `{ "binding": "GALLERIES", "bucket_name": "cosmo-galleries" }`; bei `ratelimits`: `{ "name": "GALLERY_LIMITER", "namespace_id": "1003", "simple": { "limit": 5, "period": 60 } }`.

In `env.preview` entsprechend: `{ "binding": "GALLERIES", "bucket_name": "cosmo-galleries-preview" }` und `{ "name": "GALLERY_LIMITER", "namespace_id": "1004", "simple": { "limit": 5, "period": 60 } }`.

In `vitest.config.mts` die Zeile `r2Buckets: ["MEDIA"],` ersetzen durch `r2Buckets: ["MEDIA", "GALLERIES"],`.

In `.dev.vars.example` **und** in `.dev.vars` am Ende ergänzen (`.dev.vars` nicht überschreiben):

```
GALLERY_SECRET=lokale-galerien-nur-zum-testen-mindestens-32-zeichen
```

In `src/lib/bindings.ts`: `export type RequiredBinding = "DB" | "MEDIA" | "GALLERIES";`
In `src/lib/env.ts`: `assertBindings(env, ["DB", "MEDIA", "GALLERIES"]);`

```bash
npm run cf-typegen
grep -E "GALLERIES: R2Bucket|GALLERY_LIMITER|GALLERY_SECRET" cloudflare-env.d.ts
npm run db:migrate:local
npm test && npm run lint && npm run build
```
Erwartet: Alle drei Namen stehen in den Typen, die Migration 0001 ist angewandt, 81 Tests PASS, Lint und Build grün.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "feat(galleries): schema, private bucket, tokens, crypto and helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Galerie-Repository

**Dateien:**
- Erstellen: `src/lib/galleries/repo.ts`, `test/unit/gallery-repo.test.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`slugify`, `SLUG_PATTERN`, `generateGalleryPassword`, `encryptText`, `decryptText`, `galleryKey`, `GALLERY_VARIANTS`), `hashPassword`, `verifyPassword` (Plan 2), Tabellen aus Plan 1.
- Stellt bereit:
  - Typen: `Gallery`, `GalleryImage`, `GalleryState = "draft" | "online" | "expired"`, `GalleryListItem = Gallery & { imageCount; views; downloads; favorites }`, `VisitorFavorites = { visitorName: string; images: GalleryImage[] }`
  - `GALLERY_TTL_DAYS = 30`, `class GalleryError { status: 400 | 404 | 409 }`
  - `galleryState(gallery, now: Date): GalleryState`, `normalizeVisitorName(raw: unknown): string | null`
  - `createGallery(db, secret, { title, shootDate? }, now): Promise<{ gallery; password }>`
  - `updateGallery(db, id, patch: { title?; shootDate?; slug?; expiresAt?; status?; coverImageId? }): Promise<Gallery>`
  - `extendGallery(db, id, now): Promise<Gallery>`
  - `setGalleryPassword(db, secret, id, password): Promise<Gallery>`, `revealPassword(secret, gallery): Promise<string>`, `checkGalleryPassword(gallery, password): Promise<boolean>`
  - `getGalleryById(db, id)`, `getGalleryBySlug(db, slug): Promise<Gallery | undefined>`, `listGalleries(db): Promise<GalleryListItem[]>`
  - `listImages(db, galleryId): Promise<GalleryImage[]>`, `getImage(db, galleryId, imageId)`
  - `addImage(db, bucket, input: { id; galleryId; filename; bytes; crc32; width; height; color }): Promise<GalleryImage>` (gleiche ID in derselben Galerie → aktualisiert statt Fehler, z. B. nach einer Wiederholung; ID einer fremden Galerie → 409)
  - `removeImage(db, bucket, galleryId, imageId)`, `deleteGallery(db, bucket, id)`
  - `addFavorite` / `removeFavorite(db, galleryId, imageId, visitorName)`, `listFavoriteIds(db, galleryId, visitorName): Promise<string[]>`, `favoritesByVisitor(db, galleryId): Promise<VisitorFavorites[]>`
  - `logEvent(db, { galleryId; type; visitorName?; imageId?; zipPart? })`, `listEvents(db, galleryId, limit?)`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/unit/gallery-repo.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { galleries } from "@/lib/db/schema";
import { galleryKey } from "@/lib/galleries/keys";
import {
  GalleryError,
  addFavorite,
  addImage,
  checkGalleryPassword,
  createGallery,
  deleteGallery,
  extendGallery,
  favoritesByVisitor,
  galleryState,
  getGalleryBySlug,
  listEvents,
  listFavoriteIds,
  listGalleries,
  listImages,
  logEvent,
  normalizeVisitorName,
  removeFavorite,
  removeImage,
  revealPassword,
  setGalleryPassword,
  updateGallery,
} from "@/lib/galleries/repo";

const SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const NOW = new Date("2026-09-25T10:00:00.000Z");
const db = () => createDb(env.DB);

async function storeFiles(galleryId: string, imageId: string, variants = ["thumb", "preview", "original"] as const) {
  for (const variant of variants) await env.GALLERIES.put(galleryKey(galleryId, imageId, variant), new Uint8Array([0xff, 0xd8, 0xff]));
}

async function addTestImage(galleryId: string, filename: string, bytes = 1000) {
  const id = crypto.randomUUID();
  await storeFiles(galleryId, id);
  return addImage(db(), env.GALLERIES, { id, galleryId, filename, bytes, crc32: 0xdeadbeef, width: 6000, height: 4000, color: "#101010" });
}

beforeEach(async () => {
  await db().delete(galleries);
});

describe("galleries", () => {
  it("creates drafts with a unique lowercase slug, a 30-day expiry and a retrievable password", async () => {
    const { gallery, password } = await createGallery(db(), SECRET, { title: "Final4 Zwickau 2026" }, NOW);
    const second = await createGallery(db(), SECRET, { title: "final4 ZWICKAU 2026" }, NOW);
    expect(gallery).toMatchObject({ slug: "final4-zwickau-2026", status: "draft", expiresAt: "2026-10-25T10:00:00.000Z" });
    expect(second.gallery.slug).toBe("final4-zwickau-2026-2");
    expect(password).toMatch(/^[a-z]+-[a-z]+-\d\d$/);
    expect(await revealPassword(SECRET, gallery)).toBe(password);
    expect(await checkGalleryPassword(gallery, password)).toBe(true);
    expect(await checkGalleryPassword(gallery, "falsch-falsch-00")).toBe(false);
  });

  it("knows draft, online and expired", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Zustand" }, NOW);
    expect(galleryState(gallery, NOW)).toBe("draft");
    const online = await updateGallery(db(), gallery.id, { status: "online" });
    expect(galleryState(online, NOW)).toBe("online");
    expect(galleryState(online, new Date("2026-10-25T10:00:00.000Z"))).toBe("expired");
    const unlimited = await updateGallery(db(), gallery.id, { expiresAt: null });
    expect(galleryState(unlimited, new Date("2030-01-01T00:00:00.000Z"))).toBe("online");
  });

  it("validates slugs and keeps them unique", async () => {
    const a = await createGallery(db(), SECRET, { title: "A" }, NOW);
    const b = await createGallery(db(), SECRET, { title: "B" }, NOW);
    await expect(updateGallery(db(), b.gallery.id, { slug: a.gallery.slug })).rejects.toMatchObject({ status: 409 });
    await expect(updateGallery(db(), b.gallery.id, { slug: "Ungültig Slug" })).rejects.toBeInstanceOf(GalleryError);
  });

  it("changes the password and updates updated_at", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Passwort" }, NOW);
    const changed = await setGalleryPassword(db(), SECRET, gallery.id, "neues-passwort");
    expect(await checkGalleryPassword(changed, "neues-passwort")).toBe(true);
    expect(await revealPassword(SECRET, changed)).toBe("neues-passwort");
    expect(changed.updatedAt >= gallery.updatedAt).toBe(true);
    await expect(setGalleryPassword(db(), SECRET, gallery.id, "kurz")).rejects.toMatchObject({ status: 400 });
  });

  it("extends by 30 days from the later of now and the current expiry", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Verlängern" }, NOW);
    expect((await extendGallery(db(), gallery.id, NOW)).expiresAt).toBe("2026-11-24T10:00:00.000Z");
    const late = new Date("2027-01-01T00:00:00.000Z");
    expect((await extendGallery(db(), gallery.id, late)).expiresAt).toBe("2027-01-31T00:00:00.000Z");
  });
});

describe("gallery images", () => {
  it("only registers images whose three files exist, sorted by filename", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Bilder" }, NOW);
    await addTestImage(gallery.id, "img_0002.jpg");
    await addTestImage(gallery.id, "IMG_0001.jpg");
    expect((await listImages(db(), gallery.id)).map((i) => i.filename)).toEqual(["IMG_0001.jpg", "img_0002.jpg"]);

    const id = crypto.randomUUID();
    await storeFiles(gallery.id, id, ["thumb", "original"]);
    await expect(
      addImage(db(), env.GALLERIES, { id, galleryId: gallery.id, filename: "x.jpg", bytes: 1, crc32: 1, width: 1, height: 1, color: "#000000" }),
    ).rejects.toThrow("Upload unvollständig: Vorschau, Web-Größe und Original müssen vorhanden sein.");
  });

  it("updates instead of failing when the same image is registered again (retried upload)", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Wiederholung" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg", 1000);
    const retry = { id: image.id, galleryId: gallery.id, filename: "a.jpg", bytes: 2000, crc32: 7, width: 6000, height: 4000, color: "#101010" };
    expect(await addImage(db(), env.GALLERIES, retry)).toMatchObject({ id: image.id, bytes: 2000, crc32: 7 });
    expect(await listImages(db(), gallery.id)).toHaveLength(1);

    const { gallery: other } = await createGallery(db(), SECRET, { title: "Fremd" }, NOW);
    await storeFiles(other.id, image.id);
    await expect(addImage(db(), env.GALLERIES, { ...retry, galleryId: other.id })).rejects.toMatchObject({ status: 409 });
  });

  it("removes an image with its files and clears it as cover", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Entfernen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await updateGallery(db(), gallery.id, { coverImageId: image.id });
    await removeImage(db(), env.GALLERIES, gallery.id, image.id);
    expect(await listImages(db(), gallery.id)).toHaveLength(0);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, image.id, "original"))).toBeNull();
    expect((await getGalleryBySlug(db(), gallery.slug))?.coverImageId).toBeNull();
  });

  it("deletes a gallery with all files, favorites and events", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Löschen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await addFavorite(db(), gallery.id, image.id, "Anna");
    await logEvent(db(), { galleryId: gallery.id, type: "view" });
    await deleteGallery(db(), env.GALLERIES, gallery.id);
    expect(await getGalleryBySlug(db(), gallery.slug)).toBeUndefined();
    expect((await env.GALLERIES.list({ prefix: `${gallery.id}/` })).objects).toHaveLength(0);
    expect(await listEvents(db(), gallery.id)).toHaveLength(0);
    expect(await listFavoriteIds(db(), gallery.id, "Anna")).toHaveLength(0);
  });
});

describe("favorites, events and list", () => {
  it("normalizes visitor names", () => {
    expect(normalizeVisitorName("  Anna  ")).toBe("Anna");
    expect(normalizeVisitorName("Tom 🏑")).toBe("Tom 🏑");
    expect(normalizeVisitorName("")).toBeNull();
    expect(normalizeVisitorName("   ")).toBeNull();
    expect(normalizeVisitorName("x".repeat(41))).toBeNull();
    expect(normalizeVisitorName(42)).toBeNull();
  });

  it("keeps favorites per visitor and ignores duplicates", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Favoriten" }, NOW);
    const a = await addTestImage(gallery.id, "a.jpg");
    const b = await addTestImage(gallery.id, "b.jpg");
    await addFavorite(db(), gallery.id, a.id, "Anna");
    await addFavorite(db(), gallery.id, a.id, "Anna");
    await addFavorite(db(), gallery.id, b.id, "Anna");
    await addFavorite(db(), gallery.id, a.id, "anna");
    await removeFavorite(db(), gallery.id, b.id, "Anna");
    expect(await listFavoriteIds(db(), gallery.id, "Anna")).toEqual([a.id]);
    expect(await listFavoriteIds(db(), gallery.id, "anna")).toEqual([a.id]);
    const byVisitor = await favoritesByVisitor(db(), gallery.id);
    expect(byVisitor.map((v) => [v.visitorName, v.images.map((i) => i.filename)])).toEqual([
      ["Anna", ["a.jpg"]],
      ["anna", ["a.jpg"]],
    ]);
    await expect(addFavorite(db(), gallery.id, crypto.randomUUID(), "Anna")).rejects.toMatchObject({ status: 404 });
  });

  it("counts images, views, downloads and favorites per gallery", async () => {
    const { gallery } = await createGallery(db(), SECRET, { title: "Zahlen" }, NOW);
    const image = await addTestImage(gallery.id, "a.jpg");
    await logEvent(db(), { galleryId: gallery.id, type: "view" });
    await logEvent(db(), { galleryId: gallery.id, type: "view", visitorName: "Anna" });
    await logEvent(db(), { galleryId: gallery.id, type: "download_image", imageId: image.id });
    await logEvent(db(), { galleryId: gallery.id, type: "download_zip", zipPart: 1 });
    await addFavorite(db(), gallery.id, image.id, "Anna");
    const [item] = await listGalleries(db());
    expect(item).toMatchObject({ id: gallery.id, imageCount: 1, views: 2, downloads: 2, favorites: 1 });
    const events = await listEvents(db(), gallery.id);
    expect(events.map((e) => e.type)).toEqual(["download_zip", "download_image", "view", "view"]);
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/lib/galleries/repo` wird nicht gefunden.

- [ ] **Schritt 2: Implementieren**

`src/lib/galleries/repo.ts`:

```ts
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptText, encryptText } from "@/lib/crypto/box";
import type { Db } from "@/lib/db/client";
import { favorites, galleries, galleryEvents, galleryImages } from "@/lib/db/schema";
import { GALLERY_VARIANTS, galleryKey } from "./keys";
import { generateGalleryPassword } from "./password";
import { SLUG_PATTERN, slugify } from "./slug";

export type Gallery = typeof galleries.$inferSelect;
export type GalleryImage = typeof galleryImages.$inferSelect;
export type GalleryEvent = typeof galleryEvents.$inferSelect;
export type GalleryState = "draft" | "online" | "expired";
export type GalleryListItem = Gallery & { imageCount: number; views: number; downloads: number; favorites: number };
export type VisitorFavorites = { visitorName: string; images: GalleryImage[] };
export type EventType = GalleryEvent["type"];

export const GALLERY_TTL_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export class GalleryError extends Error {
  readonly status: 400 | 404 | 409;
  constructor(message: string, status: 400 | 404 | 409 = 400) {
    super(message);
    this.name = "GalleryError";
    this.status = status;
  }
}

const galleryNotFound = () => new GalleryError("Galerie nicht gefunden.", 404);
const imageNotFound = () => new GalleryError("Bild nicht gefunden.", 404);

export function galleryState(gallery: Gallery, now: Date): GalleryState {
  if (gallery.status === "draft") return "draft";
  if (gallery.expiresAt !== null && gallery.expiresAt <= now.toISOString()) return "expired";
  return "online";
}

/** Anzeigename für Favoriten: 1–40 Zeichen nach Trimmen, sonst null. */
export function normalizeVisitorName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim();
  return name.length >= 1 && [...name].length <= 40 ? name : null;
}

async function passwordFields(password: string, secret: string) {
  const passwordHash = await hashPassword(password);
  return { passwordHash, passwordSalt: passwordHash.split("$")[2], passwordCipher: await encryptText(password, secret) };
}

async function uniqueSlug(db: Db, base: string): Promise<string> {
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 56).replace(/-+$/, "")}-${n}`;
    const [taken] = await db.select({ id: galleries.id }).from(galleries).where(eq(galleries.slug, candidate));
    if (!taken) return candidate;
  }
}

export async function createGallery(db: Db, secret: string, input: { title: string; shootDate?: string | null }, now: Date) {
  const title = input.title.trim();
  if (title.length < 1 || title.length > 120) throw new GalleryError("Der Titel braucht 1–120 Zeichen.");
  const password = generateGalleryPassword();
  const [gallery] = await db
    .insert(galleries)
    .values({
      id: crypto.randomUUID(),
      slug: await uniqueSlug(db, slugify(title)),
      title,
      shootDate: input.shootDate || null,
      expiresAt: new Date(now.getTime() + GALLERY_TTL_DAYS * DAY_MS).toISOString(),
      ...(await passwordFields(password, secret)),
    })
    .returning();
  return { gallery, password };
}

export async function getGalleryById(db: Db, id: string): Promise<Gallery | undefined> {
  const [gallery] = await db.select().from(galleries).where(eq(galleries.id, id));
  return gallery;
}

export async function getGalleryBySlug(db: Db, slug: string): Promise<Gallery | undefined> {
  const [gallery] = await db.select().from(galleries).where(eq(galleries.slug, slug));
  return gallery;
}

type GalleryPatch = { title?: string; shootDate?: string | null; slug?: string; expiresAt?: string | null; status?: "draft" | "online"; coverImageId?: string | null };

export async function updateGallery(db: Db, id: string, patch: GalleryPatch): Promise<Gallery> {
  if (patch.slug !== undefined) {
    if (!SLUG_PATTERN.test(patch.slug) || patch.slug.length > 60) throw new GalleryError("Kurzname: nur a–z, 0–9 und Bindestriche, max. 60 Zeichen.");
    const [taken] = await db.select({ id: galleries.id }).from(galleries).where(eq(galleries.slug, patch.slug));
    if (taken && taken.id !== id) throw new GalleryError("Dieser Kurzname ist schon vergeben.", 409);
  }
  if (patch.title !== undefined && (patch.title.trim().length < 1 || patch.title.trim().length > 120)) {
    throw new GalleryError("Der Titel braucht 1–120 Zeichen.");
  }
  const [gallery] = await db
    .update(galleries)
    .set({ ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}) })
    .where(eq(galleries.id, id))
    .returning();
  if (!gallery) throw galleryNotFound();
  return gallery;
}

export async function extendGallery(db: Db, id: string, now: Date): Promise<Gallery> {
  const gallery = await getGalleryById(db, id);
  if (!gallery) throw galleryNotFound();
  const from = Math.max(now.getTime(), gallery.expiresAt ? Date.parse(gallery.expiresAt) : 0);
  return updateGallery(db, id, { expiresAt: new Date(from + GALLERY_TTL_DAYS * DAY_MS).toISOString() });
}

export async function setGalleryPassword(db: Db, secret: string, id: string, password: string): Promise<Gallery> {
  const clean = password.trim();
  if (clean.length < 8 || clean.length > 64) throw new GalleryError("Das Passwort braucht 8–64 Zeichen.");
  const [gallery] = await db.update(galleries).set(await passwordFields(clean, secret)).where(eq(galleries.id, id)).returning();
  if (!gallery) throw galleryNotFound();
  return gallery;
}

export function revealPassword(secret: string, gallery: Gallery): Promise<string> {
  return decryptText(gallery.passwordCipher, secret);
}

export function checkGalleryPassword(gallery: Gallery, password: string): Promise<boolean> {
  return verifyPassword(password, gallery.passwordHash);
}

export async function listGalleries(db: Db): Promise<GalleryListItem[]> {
  const rows = await db.select().from(galleries).orderBy(desc(galleries.createdAt));
  const images = await db.select({ id: galleryImages.galleryId, n: count() }).from(galleryImages).groupBy(galleryImages.galleryId);
  const events = await db
    .select({ id: galleryEvents.galleryId, type: galleryEvents.type, n: count() })
    .from(galleryEvents)
    .groupBy(galleryEvents.galleryId, galleryEvents.type);
  const favs = await db.select({ id: favorites.galleryId, n: count() }).from(favorites).groupBy(favorites.galleryId);
  const lookup = (list: { id: string; n: number }[], id: string) => list.find((row) => row.id === id)?.n ?? 0;
  return rows.map((gallery) => {
    const own = events.filter((e) => e.id === gallery.id);
    const sum = (types: EventType[]) => own.filter((e) => types.includes(e.type)).reduce((total, e) => total + e.n, 0);
    return {
      ...gallery,
      imageCount: lookup(images, gallery.id),
      views: sum(["view"]),
      downloads: sum(["download_image", "download_zip"]),
      favorites: lookup(favs, gallery.id),
    };
  });
}

export function listImages(db: Db, galleryId: string): Promise<GalleryImage[]> {
  return db
    .select()
    .from(galleryImages)
    .where(eq(galleryImages.galleryId, galleryId))
    .orderBy(asc(sql`${galleryImages.filename} COLLATE NOCASE`), asc(galleryImages.filename));
}

export async function getImage(db: Db, galleryId: string, imageId: string): Promise<GalleryImage | undefined> {
  const [image] = await db
    .select()
    .from(galleryImages)
    .where(and(eq(galleryImages.galleryId, galleryId), eq(galleryImages.id, imageId)));
  return image;
}

type NewImage = { id: string; galleryId: string; filename: string; bytes: number; crc32: number; width: number; height: number; color: string };

/**
 * DB-Eintrag erst, wenn Vorschau, Web-Größe und Original im Bucket liegen.
 * Eine wiederholte Registrierung (z. B. Antwort verloren, Upload wiederholt) aktualisiert den Eintrag.
 */
export async function addImage(db: Db, bucket: R2Bucket, input: NewImage): Promise<GalleryImage> {
  const heads = await Promise.all(GALLERY_VARIANTS.map((variant) => bucket.head(galleryKey(input.galleryId, input.id, variant))));
  if (heads.some((head) => head === null)) throw new GalleryError("Upload unvollständig: Vorschau, Web-Größe und Original müssen vorhanden sein.");
  const fields = { filename: input.filename, bytes: input.bytes, crc32: input.crc32, width: input.width, height: input.height, color: input.color };
  const [image] = await db
    .insert(galleryImages)
    .values({ id: input.id, galleryId: input.galleryId, ...fields })
    .onConflictDoUpdate({ target: galleryImages.id, set: fields, setWhere: eq(galleryImages.galleryId, input.galleryId) })
    .returning();
  if (!image) throw new GalleryError("Diese Bild-ID gehört zu einer anderen Galerie.", 409);
  return image;
}

export async function removeImage(db: Db, bucket: R2Bucket, galleryId: string, imageId: string): Promise<void> {
  const [image] = await db
    .delete(galleryImages)
    .where(and(eq(galleryImages.galleryId, galleryId), eq(galleryImages.id, imageId)))
    .returning();
  if (!image) throw imageNotFound();
  await db.update(galleries).set({ coverImageId: null }).where(and(eq(galleries.id, galleryId), eq(galleries.coverImageId, imageId)));
  await bucket.delete(GALLERY_VARIANTS.map((variant) => galleryKey(galleryId, imageId, variant)));
}

/** Löscht alle Dateien der Galerie (seitenweise, je 1000) und dann die Galerie samt Bildern, Favoriten, Ereignissen. */
export async function deleteGallery(db: Db, bucket: R2Bucket, id: string): Promise<void> {
  if (!(await getGalleryById(db, id))) throw galleryNotFound();
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: `${id}/`, cursor, limit: 1000 });
    if (page.objects.length > 0) await bucket.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await db.delete(galleries).where(eq(galleries.id, id));
}

export async function addFavorite(db: Db, galleryId: string, imageId: string, visitorName: string): Promise<void> {
  if (!(await getImage(db, galleryId, imageId))) throw imageNotFound();
  await db.insert(favorites).values({ galleryId, imageId, visitorName }).onConflictDoNothing();
}

export async function removeFavorite(db: Db, galleryId: string, imageId: string, visitorName: string): Promise<void> {
  await db
    .delete(favorites)
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.imageId, imageId), eq(favorites.visitorName, visitorName)));
}

export async function listFavoriteIds(db: Db, galleryId: string, visitorName: string): Promise<string[]> {
  const rows = await db
    .select({ id: favorites.imageId })
    .from(favorites)
    .where(and(eq(favorites.galleryId, galleryId), eq(favorites.visitorName, visitorName)));
  return rows.map((row) => row.id);
}

export async function favoritesByVisitor(db: Db, galleryId: string): Promise<VisitorFavorites[]> {
  const rows = await db
    .select({ visitorName: favorites.visitorName, image: galleryImages })
    .from(favorites)
    .innerJoin(galleryImages, eq(favorites.imageId, galleryImages.id))
    .where(eq(favorites.galleryId, galleryId))
    .orderBy(asc(favorites.visitorName), asc(sql`${galleryImages.filename} COLLATE NOCASE`));
  const result: VisitorFavorites[] = [];
  for (const row of rows) {
    const last = result.at(-1);
    if (last && last.visitorName === row.visitorName) last.images.push(row.image);
    else result.push({ visitorName: row.visitorName, images: [row.image] });
  }
  return result;
}

export async function logEvent(
  db: Db,
  event: { galleryId: string; type: EventType; visitorName?: string | null; imageId?: string | null; zipPart?: number | null },
): Promise<void> {
  await db.insert(galleryEvents).values({
    galleryId: event.galleryId,
    type: event.type,
    visitorName: event.visitorName ?? null,
    imageId: event.imageId ?? null,
    zipPart: event.zipPart ?? null,
  });
}

export function listEvents(db: Db, galleryId: string, limit = 200): Promise<GalleryEvent[]> {
  return db
    .select()
    .from(galleryEvents)
    .where(eq(galleryEvents.galleryId, galleryId))
    .orderBy(desc(galleryEvents.createdAt), desc(galleryEvents.id))
    .limit(limit);
}
```

```bash
npm test
```
Erwartet: 23 Testdateien, 93 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat(galleries): repository for galleries, images, favorites and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ZIP-Stream

**Dateien:**
- Erstellen: `src/lib/zip/zip.ts`, `test/unit/zip.test.ts`

**Schnittstellen:**
- Stellt bereit:
  - `type ZipEntry = { name: string; size: number; crc32: number; open: () => Promise<ReadableStream<Uint8Array>> }`
  - `zipSize(entries: { name; size }[]): number` (exakte Byte-Zahl)
  - `zipStream(entries: ZipEntry[]): ReadableStream<Uint8Array>`
  - `ZIP_PART_MAX_BYTES = 2_000_000_000`, `splitIntoParts<T extends { bytes: number }>(items: T[], maxBytes?): T[][]`
  - `uniqueNames(names: string[]): string[]`
  - `zipPartsFor<T extends { filename; bytes }>(items: T[], maxBytes?): ZipPart<T>[]` mit `ZipPart<T> = { files: { item: T; name: string }[]; size: number }` (Namen über alle Teile eindeutig, exakte ZIP-Größe je Teil; Worker und Galerie-Seite nutzen dieselbe Funktion)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/unit/zip.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crc32 } from "@/lib/zip/crc32";
import { ZIP_PART_MAX_BYTES, splitIntoParts, uniqueNames, zipPartsFor, zipSize, zipStream, type ZipEntry } from "@/lib/zip/zip";

const bytesOf = (s: string) => new TextEncoder().encode(s);
const streamOf = (data: Uint8Array, chunk = 3) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < data.length; i += chunk) controller.enqueue(data.subarray(i, i + chunk));
      controller.close();
    },
  });

function entry(name: string, content: string): ZipEntry {
  const data = bytesOf(content);
  return { name, size: data.length, crc32: crc32(data), open: async () => streamOf(data) };
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Minimaler ZIP-Leser: Endeintrag → zentrales Verzeichnis → lokale Einträge. */
function readZip(zip: Uint8Array) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const eocd = zip.length - 22;
  expect(view.getUint32(eocd, true)).toBe(0x06054b50);
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const files = [];
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(p, true)).toBe(0x02014b50);
    const flags = view.getUint16(p + 8, true);
    const crc = view.getUint32(p + 16, true);
    const size = view.getUint32(p + 20, true);
    const nameLength = view.getUint16(p + 28, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLength));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localNameLength = view.getUint16(localOffset + 26, true);
    const dataStart = localOffset + 30 + localNameLength;
    files.push({ name, flags, crc, size, data: zip.subarray(dataStart, dataStart + size) });
    p += 46 + nameLength;
  }
  return files;
}

describe("zipStream", () => {
  it("writes a valid STORE zip whose length matches zipSize exactly", async () => {
    const entries = [entry("IMG_0001.jpg", "hallo"), entry("Hochzeit Müller ß.jpg", "welt!")];
    const zip = await collect(zipStream(entries));
    expect(zip.length).toBe(zipSize(entries));
    const files = readZip(zip);
    expect(files.map((f) => f.name)).toEqual(["IMG_0001.jpg", "Hochzeit Müller ß.jpg"]);
    for (const [i, f] of files.entries()) {
      expect(f.flags & 0x0800).toBe(0x0800);
      expect(f.size).toBe(entries[i].size);
      expect(f.crc).toBe(crc32(f.data));
    }
    expect(new TextDecoder().decode(files[1].data)).toBe("welt!");
  });

  it("writes an empty but valid zip", async () => {
    const zip = await collect(zipStream([]));
    expect(zip.length).toBe(22);
    expect(readZip(zip)).toEqual([]);
  });

  it("fails loudly when a file is shorter than announced", async () => {
    const broken: ZipEntry = { ...entry("a.jpg", "abc"), size: 10 };
    await expect(collect(zipStream([broken]))).rejects.toThrow("Größe von a.jpg stimmt nicht (3 statt 10 Bytes).");
  });
});

describe("splitIntoParts", () => {
  it("keeps order and never exceeds the limit (single oversized items get their own part)", () => {
    const items = [{ bytes: 6 }, { bytes: 5 }, { bytes: 4 }, { bytes: 12 }, { bytes: 1 }];
    expect(splitIntoParts(items, 10).map((part) => part.map((i) => i.bytes))).toEqual([[6], [5, 4], [12], [1]]);
    expect(splitIntoParts([], 10)).toEqual([]);
  });

  it("uses 2 GB parts by default", () => {
    expect(ZIP_PART_MAX_BYTES).toBe(2_000_000_000);
    expect(splitIntoParts([{ bytes: 1_500_000_000 }, { bytes: 600_000_000 }])).toHaveLength(2);
  });
});

describe("uniqueNames", () => {
  it("numbers duplicates before the extension", () => {
    expect(uniqueNames(["a.jpg", "a.jpg", "b.jpg", "a.jpg", "noext", "noext"])).toEqual([
      "a.jpg",
      "a (2).jpg",
      "b.jpg",
      "a (3).jpg",
      "noext",
      "noext (2)",
    ]);
  });
});

describe("zipPartsFor", () => {
  it("keeps names unique across parts and reports each part's exact size", () => {
    const images = [
      { filename: "a.jpg", bytes: 6 },
      { filename: "a.jpg", bytes: 5 },
      { filename: "b.jpg", bytes: 4 },
    ];
    const parts = zipPartsFor(images, 10);
    expect(parts.map((part) => part.files.map((file) => file.name))).toEqual([["a.jpg"], ["a (2).jpg", "b.jpg"]]);
    expect(parts[1].files[0].item).toBe(images[1]);
    expect(parts[1].size).toBe(zipSize([{ name: "a (2).jpg", size: 5 }, { name: "b.jpg", size: 4 }]));
    expect(zipPartsFor([])).toEqual([]);
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/lib/zip/zip` wird nicht gefunden.

- [ ] **Schritt 2: Implementieren**

`src/lib/zip/zip.ts`:

```ts
export type ZipEntry = { name: string; size: number; crc32: number; open: () => Promise<ReadableStream<Uint8Array>> };

/** Teile ≤ 2 GB: jeder Teil bleibt < 4 GiB, deshalb genügt das klassische ZIP-Format (kein Zip64). */
export const ZIP_PART_MAX_BYTES = 2_000_000_000;

const encoder = new TextEncoder();
const FLAG_UTF8 = 0x0800;
// Feste Zeitstempel (1.1.2026 00:00): gleiche Galerie → byte-gleiches ZIP.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

export function zipSize(entries: { name: string; size: number }[]): number {
  let total = 22;
  for (const entry of entries) {
    const nameLength = encoder.encode(entry.name).length;
    total += 30 + nameLength + entry.size + 46 + nameLength;
  }
  return total;
}

function localHeader(name: Uint8Array, entry: ZipEntry): Uint8Array {
  const out = new Uint8Array(30 + name.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 10, true); // benötigte Version 1.0
  v.setUint16(6, FLAG_UTF8, true);
  v.setUint16(8, 0, true); // STORE
  v.setUint16(10, DOS_TIME, true);
  v.setUint16(12, DOS_DATE, true);
  v.setUint32(14, entry.crc32, true);
  v.setUint32(18, entry.size, true);
  v.setUint32(22, entry.size, true);
  v.setUint16(26, name.length, true);
  out.set(name, 30);
  return out;
}

function centralHeader(name: Uint8Array, entry: ZipEntry, offset: number): Uint8Array {
  const out = new Uint8Array(46 + name.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 0x031e, true); // erstellt von Unix, Version 3.0
  v.setUint16(6, 10, true);
  v.setUint16(8, FLAG_UTF8, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, DOS_TIME, true);
  v.setUint16(14, DOS_DATE, true);
  v.setUint32(16, entry.crc32, true);
  v.setUint32(20, entry.size, true);
  v.setUint32(24, entry.size, true);
  v.setUint16(28, name.length, true);
  v.setUint32(38, (0o100644 << 16) >>> 0, true); // Dateirechte rw-r--r--
  v.setUint32(42, offset, true);
  out.set(name, 46);
  return out;
}

function endOfCentralDirectory(count: number, size: number, offset: number): Uint8Array {
  const out = new Uint8Array(22);
  const v = new DataView(out.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  return out;
}

async function* generate(entries: ZipEntry[]): AsyncGenerator<Uint8Array> {
  if (zipSize(entries) > 0xffffffff || entries.length > 0xffff) throw new Error("ZIP zu groß – bitte in Teile aufteilen.");
  let offset = 0;
  const central: Uint8Array[] = [];
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const header = localHeader(name, entry);
    yield header;
    const reader = (await entry.open()).getReader();
    let written = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      written += value.byteLength;
      yield value;
    }
    if (written !== entry.size) throw new Error(`Größe von ${entry.name} stimmt nicht (${written} statt ${entry.size} Bytes).`);
    central.push(centralHeader(name, entry, offset));
    offset += header.length + entry.size;
  }
  const centralSize = central.reduce((n, c) => n + c.length, 0);
  for (const c of central) yield c;
  yield endOfCentralDirectory(entries.length, centralSize, offset);
}

/** Streamt ein unkomprimiertes ZIP; CRC und Größen kommen aus der Datenbank → kaum CPU, exakte Länge vorab. */
export function zipStream(entries: ZipEntry[]): ReadableStream<Uint8Array> {
  const iterator = generate(entries);
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) controller.close();
        else controller.enqueue(value);
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });
}

export function splitIntoParts<T extends { bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES): T[][] {
  const parts: T[][] = [];
  let current: T[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length > 0 && size + item.bytes > maxBytes) {
      parts.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += item.bytes;
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    if (n === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${n})${name.slice(dot)}` : `${name} (${n})`;
  });
}

export type ZipPart<T> = { files: { item: T; name: string }[]; size: number };

/**
 * Aufteilung für „Alle/Favoriten herunterladen“: Namen über die ganze Auswahl eindeutig (Teile überschreiben sich
 * beim Entpacken nicht), exakte Größe je Teil. Worker und Galerie-Seite rufen dieselbe Funktion auf.
 */
export function zipPartsFor<T extends { filename: string; bytes: number }>(items: T[], maxBytes = ZIP_PART_MAX_BYTES): ZipPart<T>[] {
  const names = uniqueNames(items.map((item) => item.filename));
  const named = items.map((item, index) => ({ item, name: names[index], bytes: item.bytes }));
  return splitIntoParts(named, maxBytes).map((part) => ({
    files: part.map(({ item, name }) => ({ item, name })),
    size: zipSize(part.map(({ name, bytes }) => ({ name, size: bytes }))),
  }));
}
```

```bash
npm test
```
Erwartet: 24 Testdateien, 100 Tests PASS.

- [ ] **Schritt 3: Commit**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat(zip): deterministic streaming STORE zip with parts and unique names

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Worker-Routen für Galerie-Dateien (Upload, Auslieferung, ZIP)

**Dateien:**
- Erstellen: `src/lib/auth/origin.ts`, `src/edge/galleries.ts`, `test/unit/edge-galleries.test.ts`
- Ändern: `src/lib/auth/admin.ts` (`sameHost` und `ADMIN_COOKIE` importieren), `src/lib/auth/session.ts` (`ADMIN_COOKIE`), `custom-worker.ts`

**Schnittstellen:**
- Nutzt: Tasks 1–3, `verifySessionToken` (Plan 2), `sniffImageType`, `isUuid` (Plan 2).
- Stellt bereit (HTTP, alle im Worker vor Next):
  - `PUT /admin/api/galleries/<gid>/images/<iid>/<thumb|preview>` (Admin, WebP/JPEG ≤ 10 MB) → 204
  - `PUT /admin/api/galleries/<gid>/images/<iid>/original`
    - Admin, JPEG ≤ 95 MB, Pflicht-Header: `content-length`, `x-file-name` (URI-kodiert), `x-width`, `x-height`, `x-color`
    - → 201 `GalleryImage` | 400 | 401 | 403 | 404 | 411 | 413 | 415
  - `GET /admin/api/galleries/<gid>/images/<iid>/<thumb|preview>` (Admin-Vorschau)
  - `GET /g/<slug>/img/<iid>/<thumb|preview|original>` (Galerie-Cookie) → 200 | 401 | 404 | 410; das Original kommt als Download und wird gezählt
  - `GET /g/<slug>/zip?set=all|favorites&part=N` → ZIP mit exakter `Content-Length` | 400 | 401 | 404 | 410
  - `handleGalleryEdge(request, env, ctx): Promise<Response | null>` (null → OpenNext übernimmt)
  - `sameHost(origin, url)` (`src/lib/auth/origin.ts`), `ADMIN_COOKIE` (jetzt in `src/lib/auth/session.ts`), `MAX_ORIGINAL_BYTES`

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/unit/edge-galleries.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken } from "@/lib/auth/session";
import { createDb } from "@/lib/db/client";
import { galleries } from "@/lib/db/schema";
import { MAX_ORIGINAL_BYTES, handleGalleryEdge } from "@/edge/galleries";
import { galleryKey } from "@/lib/galleries/keys";
import { addFavorite, createGallery, listEvents, listImages, setGalleryPassword, updateGallery, type Gallery } from "@/lib/galleries/repo";
import { GALLERY_COOKIE, VISITOR_COOKIE, createGalleryToken } from "@/lib/galleries/token";
import { crc32 } from "@/lib/zip/crc32";

const SESSION_SECRET = "admin-session-secret-mit-mindestens-32-zeichen";
const GALLERY_SECRET = "galerie-secret-mit-mindestens-32-zeichen";
const edgeEnv = () => ({ DB: env.DB, GALLERIES: env.GALLERIES, SESSION_SECRET, GALLERY_SECRET });
const db = () => createDb(env.DB);
const now = () => Math.floor(Date.now() / 1000);
const JPEG = (n: number) => { const b = new Uint8Array(n); b.set([0xff, 0xd8, 0xff, 0xe0]); for (let i = 4; i < n; i++) b[i] = i % 251; return b; };
const WEBP = new Uint8Array([...new TextEncoder().encode("RIFF"), 0, 0, 0, 0, ...new TextEncoder().encode("WEBPVP8 ")]);

function context() {
  const waits: Promise<unknown>[] = [];
  return { ctx: { waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException() {} } as unknown as ExecutionContext, settle: () => Promise.all(waits) };
}

async function call(path: string, init: RequestInit = {}) {
  const { ctx, settle } = context();
  const response = await handleGalleryEdge(new Request(`https://cosmo.test${path}`, init), edgeEnv(), ctx);
  await settle();
  return response;
}

async function adminCookie() {
  return `cosmo_admin=${await createSessionToken(SESSION_SECRET, now())}`;
}

async function galleryCookie(gallery: Gallery, visitor?: string) {
  const token = await createGalleryToken(GALLERY_SECRET, gallery, now());
  return `${GALLERY_COOKIE}=${token}${visitor ? `; ${VISITOR_COOKIE}=${encodeURIComponent(visitor)}` : ""}`;
}

async function uploadImage(gallery: Gallery, filename: string, content = JPEG(5000)) {
  const id = crypto.randomUUID();
  const cookie = await adminCookie();
  for (const variant of ["thumb", "preview"]) {
    const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/${variant}`, { method: "PUT", body: WEBP, headers: { cookie, "content-type": "image/webp", "content-length": String(WEBP.length) } });
    expect(res?.status).toBe(204);
  }
  const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
    method: "PUT",
    body: content,
    headers: { cookie, "content-type": "image/jpeg", "content-length": String(content.length), "x-file-name": encodeURIComponent(filename), "x-width": "6000", "x-height": "4000", "x-color": "#202020" },
  });
  return { id, res: res! };
}

let gallery: Gallery;

beforeEach(async () => {
  await db().delete(galleries);
  ({ gallery } = await createGallery(db(), GALLERY_SECRET, { title: "Edge Test" }, new Date()));
  gallery = await updateGallery(db(), gallery.id, { status: "online" });
});

describe("routing", () => {
  it("ignores everything that is not a gallery file route", async () => {
    expect(await call("/")).toBeNull();
    expect(await call("/admin/api/portfolio")).toBeNull();
    expect(await call("/g/edge-test")).toBeNull();
  });
});

describe("admin uploads", () => {
  it("stores the original, computes CRC32 and size on the server and registers the image", async () => {
    const content = JPEG(40_000);
    const { id, res } = await uploadImage(gallery, "Hochzeit Müller 001.jpg", content);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id, filename: "Hochzeit Müller 001.jpg", bytes: 40_000, crc32: crc32(content), width: 6000, height: 4000 });
    expect((await env.GALLERIES.head(galleryKey(gallery.id, id, "original")))?.size).toBe(40_000);
  });

  it("rejects uploads without admin session or from foreign origins", async () => {
    const id = crypto.randomUUID();
    const path = `/admin/api/galleries/${gallery.id}/images/${id}/thumb`;
    expect((await call(path, { method: "PUT", body: WEBP, headers: { "content-type": "image/webp" } }))?.status).toBe(401);
    const res = await call(path, { method: "PUT", body: WEBP, headers: { cookie: await adminCookie(), origin: "https://evil.example", "content-type": "image/webp" } });
    expect(res?.status).toBe(403);
  });

  it("rejects disguised files, oversized or unsized originals and unknown galleries without leaving files", async () => {
    const cookie = await adminCookie();
    const id = crypto.randomUUID();
    const original = (body: Uint8Array, extra: Record<string, string> = {}) =>
      call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
        method: "PUT",
        body,
        headers: { cookie, "content-type": "image/jpeg", "content-length": String(body.length), "x-file-name": "a.jpg", "x-width": "1", "x-height": "1", "x-color": "#000000", ...extra },
      });
    const fake = new TextEncoder().encode("<html>kein jpeg</html>");
    expect((await original(fake))?.status).toBe(415);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, id, "original"))).toBeNull();
    expect((await original(JPEG(10), { "content-length": String(MAX_ORIGINAL_BYTES + 1) }))?.status).toBe(413);
    expect((await original(JPEG(10), { "x-width": "abc" }))?.status).toBe(400);
    const missing = await call(`/admin/api/galleries/${crypto.randomUUID()}/images/${id}/thumb`, { method: "PUT", body: WEBP, headers: { cookie, "content-type": "image/webp" } });
    expect(missing?.status).toBe(404);
  });

  it("refuses the original when thumb or preview are missing (interrupted upload) and removes it again", async () => {
    const cookie = await adminCookie();
    const id = crypto.randomUUID();
    const body = JPEG(100);
    const res = await call(`/admin/api/galleries/${gallery.id}/images/${id}/original`, {
      method: "PUT",
      body,
      headers: { cookie, "content-type": "image/jpeg", "content-length": "100", "x-file-name": "a.jpg", "x-width": "1", "x-height": "1", "x-color": "#000000" },
    });
    expect(res?.status).toBe(400);
    expect(await listImages(db(), gallery.id)).toHaveLength(0);
    expect(await env.GALLERIES.head(galleryKey(gallery.id, id, "original"))).toBeNull();
  });
});

describe("gallery files", () => {
  it("serves files only with this gallery's cookie and logs original downloads with the visitor name", async () => {
    const { id } = await uploadImage(gallery, "IMG_1.jpg");
    const path = `/g/${gallery.slug}/img/${id}`;
    expect((await call(`${path}/thumb`))?.status).toBe(401);

    const { gallery: other } = await createGallery(db(), GALLERY_SECRET, { title: "Andere" }, new Date());
    expect((await call(`${path}/thumb`, { headers: { cookie: await galleryCookie(other) } }))?.status).toBe(401);

    const cookie = await galleryCookie(gallery, "Anna");
    const thumb = await call(`${path}/thumb`, { headers: { cookie } });
    expect(thumb?.status).toBe(200);
    expect(thumb?.headers.get("cache-control")).toBe("private, max-age=3600");

    const original = await call(`${path}/original`, { headers: { cookie } });
    expect(original?.status).toBe(200);
    expect(original?.headers.get("content-disposition")).toBe(`attachment; filename="IMG_1.jpg"; filename*=UTF-8''IMG_1.jpg`);
    await original?.arrayBuffer();
    const events = await listEvents(db(), gallery.id);
    expect(events[0]).toMatchObject({ type: "download_image", imageId: id, visitorName: "Anna" });
  });

  it("hides drafts, reports expiry and rejects images from other galleries", async () => {
    const { id } = await uploadImage(gallery, "a.jpg");
    const cookie = await galleryCookie(gallery);
    const { gallery: other } = await createGallery(db(), GALLERY_SECRET, { title: "Fremd" }, new Date());
    expect((await call(`/g/${gallery.slug}/img/${crypto.randomUUID()}/thumb`, { headers: { cookie } }))?.status).toBe(404);
    expect((await call(`/g/${other.slug}/img/${id}/thumb`, { headers: { cookie: await galleryCookie(other) } }))?.status).toBe(404);

    await updateGallery(db(), gallery.id, { expiresAt: "2020-01-01T00:00:00.000Z" });
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(410);
    await updateGallery(db(), gallery.id, { status: "draft", expiresAt: null });
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(404);
  });

  it("locks out old cookies after a password change", async () => {
    const { id } = await uploadImage(gallery, "a.jpg");
    const cookie = await galleryCookie(gallery);
    await setGalleryPassword(db(), GALLERY_SECRET, gallery.id, "ganz-neues-passwort");
    expect((await call(`/g/${gallery.slug}/img/${id}/thumb`, { headers: { cookie } }))?.status).toBe(401);
  });
});

describe("zip downloads", () => {
  it("streams all images with exact Content-Length, unique names and correct CRCs", async () => {
    const a = JPEG(3000);
    const b = JPEG(4000);
    await uploadImage(gallery, "same.jpg", a);
    await uploadImage(gallery, "same.jpg", b);
    const res = await call(`/g/${gallery.slug}/zip?set=all`, { headers: { cookie: await galleryCookie(gallery, "Tom") } });
    expect(res?.status).toBe(200);
    expect(res?.headers.get("content-type")).toBe("application/zip");
    expect(res?.headers.get("content-disposition")).toBe(`attachment; filename="Cosmo-Photos_${gallery.slug}.zip"`);
    const zip = new Uint8Array(await res!.arrayBuffer());
    expect(zip.length).toBe(Number(res?.headers.get("content-length")));
    const text = new TextDecoder("latin1").decode(zip);
    expect(text).toContain("same.jpg");
    expect(text).toContain("same (2).jpg");
    expect((await listEvents(db(), gallery.id))[0]).toMatchObject({ type: "download_zip", zipPart: 1, visitorName: "Tom" });
  });

  it("zips only the visitor's favorites and validates set and part", async () => {
    const { id } = await uploadImage(gallery, "fav.jpg");
    await uploadImage(gallery, "other.jpg");
    await addFavorite(db(), gallery.id, id, "Anna");
    const res = await call(`/g/${gallery.slug}/zip?set=favorites`, { headers: { cookie: await galleryCookie(gallery, "Anna") } });
    expect(res?.headers.get("content-disposition")).toContain("_Favoriten.zip");
    const zip = new TextDecoder("latin1").decode(new Uint8Array(await res!.arrayBuffer()));
    expect(zip).toContain("fav.jpg");
    expect(zip).not.toContain("other.jpg");

    expect((await call(`/g/${gallery.slug}/zip?set=favorites`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(400);
    expect((await call(`/g/${gallery.slug}/zip?set=all&part=2`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(404);
    expect((await call(`/g/${gallery.slug}/zip?set=quatsch`, { headers: { cookie: await galleryCookie(gallery) } }))?.status).toBe(400);
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/edge/galleries` wird nicht gefunden.

- [ ] **Schritt 2: `sameHost` und `ADMIN_COOKIE` herauslösen**

`src/lib/auth/origin.ts`:

```ts
/** true, wenn der Origin-Header zum selben Host gehört wie die Anfrage (Schutz vor fremden Seiten). */
export function sameHost(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}
```

In `src/lib/auth/admin.ts` die lokale Funktion `sameHost` samt Kommentar entfernen und oben `import { sameHost } from "./origin";` ergänzen.

`ADMIN_COOKIE` wandert nach `src/lib/auth/session.ts`, damit der Worker ihn ohne `next/headers` importieren kann:
- In `session.ts` oben `export const ADMIN_COOKIE = "cosmo_admin";` ergänzen.
- In `admin.ts` die Zeile `export const ADMIN_COOKIE = "cosmo_admin";` durch `export { ADMIN_COOKIE };` ersetzen und `ADMIN_COOKIE` in den bestehenden Import aus `./session` aufnehmen.

- [ ] **Schritt 3: Worker-Routen implementieren**

`src/edge/galleries.ts`:

```ts
// Galerie-Dateien laufen direkt im Worker (vor Next): Originale streamen ohne Puffer,
// ZIP mit exakter Länge, Zugriff nur mit gültigem Galerie- bzw. Admin-Cookie.
import { sameHost } from "@/lib/auth/origin";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { readCookie } from "@/lib/cookies";
import { createDb, type Db } from "@/lib/db/client";
import { galleryKey, type GalleryVariant } from "@/lib/galleries/keys";
import {
  GalleryError,
  addImage,
  getGalleryById,
  getGalleryBySlug,
  getImage,
  galleryState,
  listFavoriteIds,
  listImages,
  logEvent,
  normalizeVisitorName,
  type Gallery,
  type GalleryImage,
} from "@/lib/galleries/repo";
import { GALLERY_COOKIE, VISITOR_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";
import { isUuid } from "@/lib/media/keys";
import { sniffImageType } from "@/lib/media/sniff";
import { CRC32_START, crc32Finish, crc32Update } from "@/lib/zip/crc32";
import { zipPartsFor, zipStream, type ZipEntry } from "@/lib/zip/zip";

export type EdgeEnv = { DB: D1Database; GALLERIES: R2Bucket; SESSION_SECRET: string; GALLERY_SECRET: string };

/** Cloudflare begrenzt Requests auf 100 MB; etwas Luft für Header. */
export const MAX_ORIGINAL_BYTES = 95 * 1024 * 1024;
const MAX_VARIANT_BYTES = 10 * 1024 * 1024;

const ADMIN_FILE = /^\/admin\/api\/galleries\/([^/]+)\/images\/([^/]+)\/(thumb|preview|original)$/;
const GALLERY_FILE = /^\/g\/([a-z0-9-]{1,60})\/img\/([^/]+)\/(thumb|preview|original)$/;
const GALLERY_ZIP = /^\/g\/([a-z0-9-]{1,60})\/zip$/;

const json = (body: unknown, status: number) => Response.json(body, { status });
const error = (message: string, status: number) => json({ error: message }, status);
const nowSeconds = () => Math.floor(Date.now() / 1000);

export async function handleGalleryEdge(request: Request, env: EdgeEnv, ctx: ExecutionContext): Promise<Response | null> {
  const { pathname, searchParams } = new URL(request.url);
  let match = pathname.match(ADMIN_FILE);
  if (match) return adminFile(request, env, match[1], match[2], match[3] as GalleryVariant);
  match = pathname.match(GALLERY_FILE);
  if (match && request.method === "GET") return galleryFile(request, env, ctx, match[1], match[2], match[3] as GalleryVariant);
  match = pathname.match(GALLERY_ZIP);
  if (match && request.method === "GET") return galleryZip(request, env, ctx, match[1], searchParams);
  return null;
}

// ---------- Admin ----------

async function adminFile(request: Request, env: EdgeEnv, galleryId: string, imageId: string, variant: GalleryVariant): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) return error("Anfrage von fremder Herkunft.", 403);
  if (!(await verifySessionToken(readCookie(request, ADMIN_COOKIE), env.SESSION_SECRET, nowSeconds()))) return error("Nicht angemeldet.", 401);
  if (!isUuid(galleryId) || !isUuid(imageId)) return error("Nicht gefunden.", 404);
  const db = createDb(env.DB);
  if (!(await getGalleryById(db, galleryId))) return error("Galerie nicht gefunden.", 404);
  const key = galleryKey(galleryId, imageId, variant);

  if (request.method === "GET" && variant !== "original") return serveObject(env.GALLERIES, key, { "cache-control": "private, max-age=3600" });
  if (request.method !== "PUT") return error("Methode nicht erlaubt.", 405);
  if (variant === "original") return uploadOriginal(request, env, db, galleryId, imageId);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_VARIANT_BYTES) return error("Datei zu groß (max. 10 MB).", 413);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_VARIANT_BYTES) return error("Datei zu groß (max. 10 MB).", 413);
  const type = sniffImageType(bytes);
  if (!type || type !== request.headers.get("content-type")) return error("Nur WebP- oder JPEG-Bilder.", 415);
  await env.GALLERIES.put(key, bytes, { httpMetadata: { contentType: type } });
  return new Response(null, { status: 204 });
}

function imageHeaders(request: Request): { filename: string; width: number; height: number; color: string } | null {
  let filename: string;
  try {
    filename = decodeURIComponent(request.headers.get("x-file-name") ?? "").trim();
  } catch {
    return null;
  }
  const width = Number(request.headers.get("x-width"));
  const height = Number(request.headers.get("x-height"));
  const color = request.headers.get("x-color") ?? "";
  const valid =
    filename.length > 0 && filename.length <= 200 && !/[/\\]/.test(filename) &&
    Number.isInteger(width) && width > 0 && width <= 30000 &&
    Number.isInteger(height) && height > 0 && height <= 30000 &&
    /^#[0-9a-f]{6}$/i.test(color);
  return valid ? { filename, width, height, color } : null;
}

/**
 * Zählt beim Durchreichen mit: CRC32, Länge und die ersten Bytes (Typprüfung).
 * Ein einziger Datenweg (kein tee): Ein 95-MB-Original wird nie komplett im Speicher gehalten (Worker-Limit 128 MB).
 */
function meter() {
  const result = { crc32: CRC32_START, bytes: 0, head: new Uint8Array(12) };
  const stream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (result.bytes < result.head.length) result.head.set(chunk.subarray(0, result.head.length - result.bytes), result.bytes);
      result.crc32 = crc32Update(result.crc32, chunk);
      result.bytes += chunk.byteLength;
      controller.enqueue(chunk);
    },
  });
  return { stream, result };
}

async function uploadOriginal(request: Request, env: EdgeEnv, db: Db, galleryId: string, imageId: string): Promise<Response> {
  const length = Number(request.headers.get("content-length"));
  if (!Number.isInteger(length) || length <= 0) return error("Dateigröße fehlt.", 411);
  if (length > MAX_ORIGINAL_BYTES) return error("Original zu groß (max. 95 MB).", 413);
  const meta = imageHeaders(request);
  if (!meta || !request.body) return error("Bildangaben fehlen oder sind ungültig.", 400);

  const key = galleryKey(galleryId, imageId, "original");
  const counted = meter();
  // FixedLengthStream: R2 braucht die Länge vorab; stimmt sie nicht, schlägt der Upload fehl.
  const fixed = new FixedLengthStream(length);
  try {
    await Promise.all([
      request.body.pipeThrough(counted.stream).pipeTo(fixed.writable),
      env.GALLERIES.put(key, fixed.readable, { httpMetadata: { contentType: "image/jpeg" } }),
    ]);
  } catch {
    await env.GALLERIES.delete(key);
    return error("Upload abgebrochen oder unvollständig.", 400);
  }
  const head = counted.result.head.subarray(0, Math.min(counted.result.bytes, counted.result.head.length));
  if (counted.result.bytes !== length || sniffImageType(head) !== "image/jpeg") {
    await env.GALLERIES.delete(key);
    return counted.result.bytes !== length ? error("Upload unvollständig.", 400) : error("Nur JPEG-Originale.", 415);
  }
  try {
    const image = await addImage(db, env.GALLERIES, {
      id: imageId,
      galleryId,
      ...meta,
      bytes: counted.result.bytes,
      crc32: crc32Finish(counted.result.crc32),
    });
    return json(image, 201);
  } catch (cause) {
    await env.GALLERIES.delete(key);
    if (cause instanceof GalleryError) return error(cause.message, cause.status);
    throw cause;
  }
}

// ---------- Kunden ----------

type Access = { gallery: Gallery; db: Db; visitor: string | null } | { response: Response };

async function galleryAccess(request: Request, env: EdgeEnv, slug: string): Promise<Access> {
  const db = createDb(env.DB);
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery) return { response: error("Galerie nicht gefunden.", 404) };
  const state = galleryState(gallery, new Date());
  if (state === "draft") return { response: error("Galerie nicht gefunden.", 404) };
  if (state === "expired") return { response: error("Galerie abgelaufen.", 410) };
  if (!(await verifyGalleryToken(readCookie(request, GALLERY_COOKIE), env.GALLERY_SECRET, gallery, nowSeconds()))) {
    return { response: error("Kein Zugang.", 401) };
  }
  return { gallery, db, visitor: normalizeVisitorName(readCookie(request, VISITOR_COOKIE)) };
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function serveObject(bucket: R2Bucket, key: string, headers: Record<string, string>): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) return error("Nicht gefunden.", 404);
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "content-length": String(object.size),
      etag: object.httpEtag,
      "x-robots-tag": "noindex, nofollow",
      ...headers,
    },
  });
}

async function galleryFile(request: Request, env: EdgeEnv, ctx: ExecutionContext, slug: string, imageId: string, variant: GalleryVariant): Promise<Response> {
  const access = await galleryAccess(request, env, slug);
  if ("response" in access) return access.response;
  const { gallery, db, visitor } = access;
  const image = isUuid(imageId) ? await getImage(db, gallery.id, imageId) : undefined;
  if (!image) return error("Bild nicht gefunden.", 404);
  const key = galleryKey(gallery.id, image.id, variant);
  if (variant !== "original") return serveObject(env.GALLERIES, key, { "cache-control": "private, max-age=3600" });
  ctx.waitUntil(logEvent(db, { galleryId: gallery.id, type: "download_image", imageId: image.id, visitorName: visitor }));
  return serveObject(env.GALLERIES, key, { "cache-control": "private, no-store", "content-disposition": contentDisposition(image.filename) });
}

async function galleryZip(request: Request, env: EdgeEnv, ctx: ExecutionContext, slug: string, params: URLSearchParams): Promise<Response> {
  const access = await galleryAccess(request, env, slug);
  if ("response" in access) return access.response;
  const { gallery, db, visitor } = access;

  const set = params.get("set") ?? "all";
  if (set !== "all" && set !== "favorites") return error("Unbekannte Auswahl.", 400);
  let images: GalleryImage[] = await listImages(db, gallery.id);
  if (set === "favorites") {
    if (!visitor) return error("Bitte zuerst einen Namen angeben.", 400);
    const ids = new Set(await listFavoriteIds(db, gallery.id, visitor));
    images = images.filter((image) => ids.has(image.id));
  }
  // Dieselbe Aufteilung berechnet die Galerie-Seite für ihre Buttons (gleiche Reihenfolge, gleiche Namen).
  const parts = zipPartsFor(images);
  const partNumber = Number(params.get("part") ?? "1");
  const part = Number.isInteger(partNumber) ? parts[partNumber - 1] : undefined;
  if (!part) return error("Diesen Teil gibt es nicht.", 404);

  const entries: ZipEntry[] = part.files.map(({ item: image, name }) => ({
    name,
    size: image.bytes,
    crc32: image.crc32,
    open: async () => {
      const object = await env.GALLERIES.get(galleryKey(gallery.id, image.id, "original"));
      if (!object) throw new Error(`Original fehlt: ${image.filename}`);
      return object.body;
    },
  }));

  // FixedLengthStream sorgt dafür, dass Cloudflare die Content-Length mitschickt (echter Fortschrittsbalken).
  const fixed = new FixedLengthStream(part.size);
  zipStream(entries).pipeTo(fixed.writable).catch(() => {});
  ctx.waitUntil(logEvent(db, { galleryId: gallery.id, type: "download_zip", zipPart: partNumber, visitorName: visitor }));

  const base = `Cosmo-Photos_${gallery.slug}${set === "favorites" ? "_Favoriten" : ""}`;
  const filename = parts.length > 1 ? `${base}_Teil-${partNumber}-von-${parts.length}.zip` : `${base}.zip`;
  return new Response(fixed.readable, {
    headers: {
      "content-type": "application/zip",
      "content-length": String(part.size),
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}
```

In `custom-worker.ts`:
- oben ergänzen: `import { handleGalleryEdge } from "./src/edge/galleries";`
- `fetch(request, env, ctx) {` ersetzen durch `async fetch(request, env, ctx) {`
- vor `return handler.fetch(request, env, ctx);` einfügen:

```ts
    // Galerie-Dateien, Originale und ZIP direkt im Worker (streamend, ohne Next).
    const galleryResponse = await handleGalleryEdge(request, env, ctx);
    if (galleryResponse) return galleryResponse;
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test
```
Erwartet: 25 Testdateien, 110 Tests PASS.

```bash
npm run lint && npx opennextjs-cloudflare build > /dev/null && npx wrangler deploy --dry-run --outdir .wrangler/dry-run > /dev/null && echo "bundle ok"
```
Erwartet: Lint grün und `bundle ok`. Der Trockenlauf bündelt `custom-worker.ts` samt `src/edge/…` und den `@/`-Pfaden wie beim echten Deployment, lädt aber nichts hoch.

- [ ] **Schritt 5: Commit**

```bash
git add -A
git commit -m "feat(galleries): worker routes for streamed originals, protected files and zip downloads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Admin – Galerienliste und neue Galerie

**Dateien:**
- Erstellen: `src/lib/galleries/secret.ts`, `src/app/admin/(protected)/galerien/labels.ts`, `src/app/admin/(protected)/galerien/page.tsx`, `src/app/admin/(protected)/galerien/actions.ts`, `src/app/admin/(protected)/galerien/new-gallery-form.tsx`, `src/app/admin/(protected)/galerien/[id]/page.tsx` (vorläufig), `test/e2e/helpers/galleries.ts`, `test/e2e/admin-galleries.spec.ts`
- Ändern: `src/app/admin/(protected)/layout.tsx` (Navigation), `test/e2e/admin-auth.spec.ts` (`PROTECTED_PAGES` + `/admin/galerien`)

**Schnittstellen:**
- Nutzt: `createGallery`, `listGalleries`, `galleryState`, `revealPassword`, `getGalleryById` (Task 2), `formatDate` (Task 1), `requireAdmin`, `getDb`, `isUuid` (Plan 2).
- Stellt bereit:
  - `gallerySecret(): string` (liest `GALLERY_SECRET`, wirft bei < 32 Zeichen)
  - `STATE_LABELS: Record<GalleryState, string>` in `galerien/labels.ts` (Seitendateien dürfen außer `default` nichts Eigenes exportieren)
  - `createGalleryAction(prev, formData)` → Weiterleitung auf `/admin/galerien/<id>`
  - Detailseite mit den `data-testid`s `gallery-status`, `gallery-link`, `gallery-expiry`, `gallery-password`
  - E2E-Helfer: `RUN`, `newContext(browser, { admin? })`, `createGalleryViaUi(page, title): Promise<{ id; slug }>`, `galleryPassword(page)`, `uploadJpegs(page, names)`, `publishGallery(page)`, `unlockGallery(page, slug, password)`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

`test/e2e/helpers/galleries.ts` (die Helfer für Upload, Veröffentlichen und Kundenansicht nutzen Task 6–8):

```ts
import { expect, test, type Browser, type Page } from "@playwright/test";
import { ADMIN_STATE } from "./admin";
import { makeJpeg } from "./images";

/** Eindeutiger Zusatz pro Testlauf: Vorschau-Deployments behalten ihre Daten zwischen den Läufen. */
export const RUN = Date.now().toString(36);

/** Eigener Browser-Kontext (z. B. in beforeAll) mit baseURL und Sprache aus der Projekt-Konfiguration. */
export function newContext(browser: Browser, options: { admin?: boolean } = {}) {
  const { baseURL, locale } = test.info().project.use;
  return browser.newContext({ baseURL, locale, ...(options.admin ? { storageState: ADMIN_STATE } : {}) });
}

/** Legt über den Admin eine Galerie an und liefert id und Kurznamen. */
export async function createGalleryViaUi(page: Page, title: string): Promise<{ id: string; slug: string }> {
  await page.goto("/admin/galerien");
  await page.getByLabel("Titel").fill(title);
  await page.getByRole("button", { name: "Galerie anlegen" }).click();
  await expect(page).toHaveURL(/\/admin\/galerien\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").at(-1)!;
  const slug = (await page.getByTestId("gallery-link").textContent())!.split("/g/")[1];
  return { id, slug };
}

export async function galleryPassword(page: Page): Promise<string> {
  return (await page.getByTestId("gallery-password").textContent()) ?? "";
}

/** Lädt kleine Test-JPEGs über die Upload-Fläche der Detailseite hoch und wartet, bis alle fertig sind. */
export async function uploadJpegs(page: Page, names: string[]): Promise<void> {
  const colors = ["#aa3333", "#33aa33", "#3333aa", "#888833"];
  const files = [];
  for (const [index, name] of names.entries()) {
    const portrait = index % 2 === 1;
    const buffer = await makeJpeg(page, portrait ? 800 : 1200, portrait ? 1200 : 800, colors[index % colors.length]);
    files.push({ name, mimeType: "image/jpeg", buffer });
  }
  await page.getByLabel("Bilder hinzufügen").setInputFiles(files);
  await expect(page.locator('[data-testid="upload-item"][data-status="done"]')).toHaveCount(names.length, { timeout: 30_000 });
}

export async function publishGallery(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByTestId("gallery-status")).toHaveText("Online");
}

/** Öffnet eine (nicht leere) Galerie als Kunde. */
export async function unlockGallery(page: Page, slug: string, password: string): Promise<void> {
  await page.goto(`/g/${slug}`);
  await page.getByLabel("Passwort").fill(password);
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.getByTestId("gallery-grid")).toBeVisible();
}
```

`test/e2e/admin-galleries.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { ADMIN_STATE } from "./helpers/admin";
import { RUN, createGalleryViaUi, galleryPassword } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });
test.use({ storageState: ADMIN_STATE });

test("neue Galerie: Entwurf mit Kurzname, Passwort und Ablaufdatum", async ({ page }) => {
  const title = `Hochzeit Müller & Groß ${RUN}`;
  const { slug } = await createGalleryViaUi(page, title);
  expect(slug).toBe(`hochzeit-mueller-gross-${RUN}`);
  await expect(page.getByTestId("gallery-status")).toHaveText("Entwurf");
  await expect(page.getByTestId("gallery-expiry")).toHaveText(/^\d\d\.\d\d\.\d{4}$/);
  expect(await galleryPassword(page)).toMatch(/^[a-z]+-[a-z]+-\d\d$/);

  await page.goto("/admin/galerien");
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toContainText("Entwurf");
  await expect(row).toContainText("0 Bilder");
});

test("leerer Titel wird abgelehnt", async ({ page }) => {
  await page.goto("/admin/galerien");
  await page.getByLabel("Titel").fill("   ");
  await page.getByRole("button", { name: "Galerie anlegen" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Der Titel braucht 1–120 Zeichen.");
});
```

In `test/e2e/admin-auth.spec.ts` die Zeile `const PROTECTED_PAGES = ["/admin", "/admin/portfolio/floorball", "/admin/texte"];` ersetzen durch:

```ts
const PROTECTED_PAGES = ["/admin", "/admin/portfolio/floorball", "/admin/texte", "/admin/galerien"];
```

```bash
npm run test:e2e -- admin-galleries.spec.ts admin-auth.spec.ts
```
Erwartet: FAIL, weil `/admin/galerien` die 404-Seite liefert.

- [ ] **Schritt 2: Implementieren**

`src/lib/galleries/secret.ts`:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** GALLERY_SECRET signiert Zugangs-Cookies und verschlüsselt Galerie-Passwörter (≥ 32 Zeichen). Nie rotieren, ohne danach alle Passwörter neu zu setzen. */
export function gallerySecret(): string {
  const secret = getCloudflareContext().env.GALLERY_SECRET;
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error('GALLERY_SECRET fehlt oder ist kürzer als 32 Zeichen – per "wrangler secret put GALLERY_SECRET" setzen.');
  }
  return secret;
}
```

`src/app/admin/(protected)/galerien/labels.ts`:

```ts
import type { GalleryState } from "@/lib/galleries/repo";

export const STATE_LABELS: Record<GalleryState, string> = { draft: "Entwurf", online: "Online", expired: "Abgelaufen" };
```

`src/app/admin/(protected)/galerien/actions.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { GalleryError, createGallery } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";

export type NewGalleryState = { error?: string };

export async function createGalleryAction(_previous: NewGalleryState, formData: FormData): Promise<NewGalleryState> {
  await requireAdmin();
  let id: string;
  try {
    const { gallery } = await createGallery(
      getDb(),
      gallerySecret(),
      { title: String(formData.get("title") ?? ""), shootDate: String(formData.get("shootDate") ?? "") || null },
      new Date(),
    );
    id = gallery.id;
  } catch (cause) {
    if (cause instanceof GalleryError) return { error: cause.message };
    throw cause;
  }
  redirect(`/admin/galerien/${id}`);
}
```

`src/app/admin/(protected)/galerien/new-gallery-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { createGalleryAction, type NewGalleryState } from "./actions";

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function NewGalleryForm() {
  const [state, action, pending] = useActionState<NewGalleryState, FormData>(createGalleryAction, {});
  return (
    <form action={action} className="grid max-w-2xl gap-4 bg-mat p-6 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <label className="block text-sm">
        Titel
        <input name="title" required maxLength={120} className={control} placeholder="z. B. Final4 Zwickau 2026" />
      </label>
      <label className="block text-sm">
        Datum (optional)
        <input name="shootDate" type="date" className={control} />
      </label>
      <button type="submit" disabled={pending} className="bg-ink px-6 py-2 text-paper disabled:opacity-60">
        Galerie anlegen
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-signal sm:col-span-3">
          {state.error}
        </p>
      )}
    </form>
  );
}
```

`src/app/admin/(protected)/galerien/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, listGalleries } from "@/lib/galleries/repo";
import { STATE_LABELS } from "./labels";
import { NewGalleryForm } from "./new-gallery-form";

export const metadata: Metadata = { title: "Galerien" };

export default async function GalleriesPage() {
  const galleries = await listGalleries(getDb());
  const now = new Date();
  return (
    <div>
      <h1 className="font-display text-5xl">Galerien</h1>
      <div className="mt-8">
        <NewGalleryForm />
      </div>
      {galleries.length === 0 ? (
        <p className="mt-10 text-stone">Noch keine Galerien.</p>
      ) : (
        <table className="mt-10 w-full text-left text-sm">
          <thead className="font-label text-xs text-stone">
            <tr>
              <th className="py-2">Titel</th>
              <th>Status</th>
              <th>Bilder</th>
              <th>Aufrufe</th>
              <th>Downloads</th>
              <th>Favoriten</th>
              <th>Online bis</th>
            </tr>
          </thead>
          <tbody>
            {galleries.map((gallery) => (
              <tr key={gallery.id} className="border-t border-ink/10">
                <td className="py-3">
                  <Link href={`/admin/galerien/${gallery.id}`} className="underline">
                    {gallery.title}
                  </Link>
                </td>
                <td>{STATE_LABELS[galleryState(gallery, now)]}</td>
                <td>{gallery.imageCount} Bilder</td>
                <td>{gallery.views}</td>
                <td>{gallery.downloads}</td>
                <td>{gallery.favorites}</td>
                <td>{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/page.tsx` (vorläufig, Task 6 baut die Seite aus):

```tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, getGalleryById, revealPassword } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { isUuid } from "@/lib/media/keys";
import { STATE_LABELS } from "../labels";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Galerie" };

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  const gallery = isUuid(id) ? await getGalleryById(getDb(), id) : undefined;
  if (!gallery) notFound();
  const host = (await headers()).get("host") ?? "cosmo-photos.de";
  const password = await revealPassword(gallerySecret(), gallery);
  return (
    <div>
      <p className="font-label text-xs text-stone">Galerie</p>
      <h1 className="font-display mt-2 text-5xl">{gallery.title}</h1>
      <dl className="mt-6 grid max-w-2xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
        <dt className="text-stone">Status</dt>
        <dd data-testid="gallery-status">{STATE_LABELS[galleryState(gallery, new Date())]}</dd>
        <dt className="text-stone">Link</dt>
        <dd data-testid="gallery-link" className="font-label">{`https://${host}/g/${gallery.slug}`}</dd>
        <dt className="text-stone">Online bis</dt>
        <dd data-testid="gallery-expiry">{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</dd>
        <dt className="text-stone">Passwort</dt>
        <dd data-testid="gallery-password" className="font-label">{password}</dd>
      </dl>
    </div>
  );
}
```

In `src/app/admin/(protected)/layout.tsx` die Zeile `<li className="text-stone">Galerien (folgt)</li>` ersetzen durch:

```tsx
            <li>
              <Link href="/admin/galerien">Galerien</Link>
            </li>
```

(`Link` ist in der Datei schon importiert; die Einrückung an die Nachbarzeilen anpassen.)

- [ ] **Schritt 3: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 110 PASS, E2E alle grün inklusive der 2 neuen Tests.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "feat(admin): gallery list and creation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Admin – Galerie bearbeiten, hochladen, veröffentlichen

**Dateien:**
- Erstellen:
  - `src/lib/galleries/upload.ts`
  - `src/components/admin/upload-zone.tsx` (verschoben)
  - `src/app/admin/(protected)/galerien/[id]/actions.ts`, `gallery-settings.tsx`, `password-panel.tsx`, `message-panel.tsx`, `gallery-images.tsx`, `delete-button.tsx`
- Ändern:
  - `src/app/admin/(protected)/galerien/[id]/page.tsx` (ausbauen)
  - `src/lib/image/process.ts` (Größen als Parameter), `src/lib/image/upload.ts` (`putWithRetry` exportieren, Header)
  - `src/app/admin/(protected)/portfolio/[category]/portfolio-manager.tsx` (Import der Upload-Zone)
  - `test/e2e/admin-galleries.spec.ts`
- Löschen: `src/app/admin/(protected)/portfolio/[category]/upload-zone.tsx` (per `git mv`)

**Schnittstellen:**
- Nutzt:
  - Task 2: `updateGallery`, `extendGallery`, `setGalleryPassword`, `revealPassword`, `removeImage`, `deleteGallery`, `listImages`
  - Task 1: `galleryMessage`, `generateGalleryPassword`, `formatDate`, `formatDateInput`, `endOfBerlinDay`, `formatBytes`
  - Task 4: Upload-Routen
  - Task 5: `STATE_LABELS`, `gallerySecret`
  - Plan 2: `processImage`, `UploadZone`
- Stellt bereit:
  - `processImage(file, sizes = IMAGE_SIZES)`, `putWithRetry(url, body, headers?): Promise<Response>`
  - `uploadGalleryImage(galleryId, file): Promise<GalleryImage>`
  - Server Actions:
    - `updateGalleryAction`, `setPasswordAction` (für `useActionState`)
    - `regeneratePasswordAction`, `setCoverAction`, `removeGalleryImageAction` → `ActionState`
    - `setStatusAction`, `extendGalleryAction` → `void` (Formular-Aktionen)
    - `deleteGalleryAction` → Weiterleitung
  - Upload-Zone unter `@/components/admin/upload-zone`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

In `test/e2e/admin-galleries.spec.ts` den Import der Helfer ersetzen durch:

```ts
import { RUN, createGalleryViaUi, galleryPassword, publishGallery, uploadJpegs } from "./helpers/galleries";
```

und am Ende anhängen:

```ts
test("Bilder hochladen (nach Dateiname sortiert), Titelbild, veröffentlichen, Nachricht", async ({ page }) => {
  const { slug } = await createGalleryViaUi(page, `Upload ${RUN}`);
  await uploadJpegs(page, ["IMG_0002.jpg", "IMG_0001.jpg"]);
  await page.reload();
  const images = page.getByTestId("gallery-image");
  await expect(images).toHaveCount(2);
  await expect(images.first()).toContainText("IMG_0001.jpg");
  await expect(page.getByText("2 Bilder ·")).toBeVisible();

  await images.nth(1).getByRole("button", { name: "Als Titelbild" }).click();
  await expect(images.nth(1).getByTestId("cover-badge")).toBeVisible();
  await page.reload();
  await expect(images.nth(1).getByTestId("cover-badge")).toBeVisible();

  await publishGallery(page);
  const message = page.getByLabel("Nachricht");
  await expect(message).toHaveValue(new RegExp(`/g/${slug}\\n`));
  await expect(message).toHaveValue(/Passwort: [a-z]+-[a-z]+-\d\d/);
  await page.getByLabel("Sprache").selectOption("en");
  await expect(message).toHaveValue(/Password: /);
});

test("Einstellungen, Ablauf, Passwort, Bild entfernen, Galerie löschen", async ({ page }) => {
  const title = `Pflege ${RUN}`;
  await createGalleryViaUi(page, title);
  await uploadJpegs(page, ["a.jpg"]);

  await page.getByLabel("Kurzname").fill(`pflege-neu-${RUN}`);
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByTestId("gallery-link")).toHaveText(new RegExp(`/g/pflege-neu-${RUN}$`));

  await page.getByLabel("Online bis").fill("");
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Bitte ein Datum wählen oder „Unbegrenzt online“ ankreuzen.");

  await page.getByLabel("Unbegrenzt online").check();
  await page.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(page.getByTestId("gallery-expiry")).toHaveText("unbegrenzt");
  await page.getByRole("button", { name: "Um 30 Tage verlängern" }).click();
  await expect(page.getByTestId("gallery-expiry")).toHaveText(/^\d\d\.\d\d\.\d{4}$/);

  await page.getByLabel("Neues Passwort").fill("eigenes-passwort-1");
  await page.getByRole("button", { name: "Passwort setzen" }).click();
  await expect(page.getByTestId("gallery-password")).toHaveText("eigenes-passwort-1");
  await page.getByRole("button", { name: "Neues Passwort erzeugen" }).click();
  await expect(page.getByTestId("gallery-password")).toHaveText(/^[a-z]+-[a-z]+-\d\d$/);
  expect(await galleryPassword(page)).not.toBe("eigenes-passwort-1");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByTestId("gallery-image").first().getByRole("button", { name: "Entfernen" }).click();
  await expect(page.getByTestId("gallery-image")).toHaveCount(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Galerie löschen" }).click();
  await expect(page).toHaveURL(/\/admin\/galerien$/);
  await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
});
```

```bash
npm run test:e2e -- admin-galleries.spec.ts
```
Erwartet: Die zwei neuen Tests schlagen fehl, weil die Detailseite noch kein Feld „Bilder hinzufügen“ hat.

- [ ] **Schritt 2: Bildverarbeitung, Upload und geteilte Upload-Zone**

In `src/lib/image/process.ts`:
- `export function processImage(file: File): Promise<ProcessedImage> {` ersetzen durch `export function processImage(file: File, sizes: readonly ImageSize[] = IMAGE_SIZES): Promise<ProcessedImage> {`
- `worker.postMessage({ file, sizes: IMAGE_SIZES });` ersetzen durch `worker.postMessage({ file, sizes });`

`src/lib/image/upload.ts` komplett ersetzen:

```ts
import { HttpError, httpErrorFrom } from "@/lib/http-error";
import type { MediaKind } from "@/lib/media/keys";
import type { ProcessedImage } from "./process";

/** 1 Versuch + 2 automatische Wiederholungen (Spec §3.3). */
const ATTEMPTS = 3;

/** Lädt alle Varianten unter einer neuen UUID hoch und gibt die UUID zurück. */
export async function uploadVariants(kind: MediaKind, image: ProcessedImage): Promise<string> {
  const id = crypto.randomUUID();
  for (const variant of image.variants) {
    await putWithRetry(`/admin/api/media/${kind}/${id}/${variant.size}`, variant.blob);
  }
  return id;
}

/** PUT mit Wiederholung bei Netz- und 5xx-Fehlern; 4xx wird sofort als HttpError geworfen. */
export async function putWithRetry(url: string, body: Blob, headers: Record<string, string> = {}): Promise<Response> {
  let lastError = new Error("Upload fehlgeschlagen.");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { method: "PUT", body, headers: { "content-type": body.type, ...headers } });
      if (response.ok) return response;
      const error = await httpErrorFrom(response, "Upload fehlgeschlagen");
      if (response.status < 500) throw error;
      lastError = error;
    } catch (error) {
      if (error instanceof HttpError && error.status < 500) throw error;
      lastError = error instanceof Error ? error : lastError;
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  throw lastError;
}
```

`src/lib/galleries/upload.ts`:

```ts
import { processImage } from "@/lib/image/process";
import { putWithRetry } from "@/lib/image/upload";
import type { GalleryImage } from "./repo";

/**
 * Vorschau (800) und Web-Größe (2400) entstehen im Browser, danach geht das unveränderte Original hoch.
 * Der Worker streamt es, zählt CRC32 und Größe und legt erst dann den Datenbank-Eintrag an.
 */
export async function uploadGalleryImage(galleryId: string, file: File): Promise<GalleryImage> {
  if (file.type !== "image/jpeg") throw new Error("Originale müssen JPEG sein.");
  const processed = await processImage(file, [800, 2400]);
  const id = crypto.randomUUID();
  const base = `/admin/api/galleries/${galleryId}/images/${id}`;
  await putWithRetry(`${base}/thumb`, processed.variants[0].blob);
  await putWithRetry(`${base}/preview`, processed.variants[1].blob);
  const response = await putWithRetry(`${base}/original`, file, {
    "content-type": "image/jpeg",
    "x-file-name": encodeURIComponent(file.name),
    "x-width": String(processed.width),
    "x-height": String(processed.height),
    "x-color": processed.color,
  });
  return (await response.json()) as GalleryImage;
}
```

Upload-Zone verschieben, denn Portfolio und Galerien nutzen sie beide:

```bash
mkdir -p src/components/admin
git mv "src/app/admin/(protected)/portfolio/[category]/upload-zone.tsx" src/components/admin/upload-zone.tsx
sed -i '' 's#import { UploadZone } from "./upload-zone";#import { UploadZone } from "@/components/admin/upload-zone";#' "src/app/admin/(protected)/portfolio/[category]/portfolio-manager.tsx"
grep -n "upload-zone" "src/app/admin/(protected)/portfolio/[category]/portfolio-manager.tsx"
```
Erwartet: eine Zeile mit `@/components/admin/upload-zone`.

- [ ] **Schritt 3: Server Actions**

`src/app/admin/(protected)/galerien/[id]/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { endOfBerlinDay } from "@/lib/format";
import { generateGalleryPassword } from "@/lib/galleries/password";
import { GalleryError, deleteGallery, extendGallery, removeImage, setGalleryPassword, updateGallery } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";

export type ActionState = { error?: string; ok?: boolean };

const detailPath = (id: string) => `/admin/galerien/${id}`;

/** Anmeldung prüfen, Arbeit ausführen, fachliche Fehler als Meldung zurückgeben, Seite neu laden. */
async function guarded(id: string, work: () => Promise<unknown>): Promise<ActionState> {
  await requireAdmin();
  try {
    await work();
  } catch (cause) {
    if (cause instanceof GalleryError) return { error: cause.message };
    throw cause;
  }
  revalidatePath(detailPath(id));
  return { ok: true };
}

export async function updateGalleryAction(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  const unlimited = formData.get("unlimited") === "on";
  const expiry = String(formData.get("expiresAt") ?? "");
  return guarded(id, async () => {
    if (!unlimited && !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      throw new GalleryError("Bitte ein Datum wählen oder „Unbegrenzt online“ ankreuzen.");
    }
    await updateGallery(getDb(), id, {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? "").trim(),
      shootDate: String(formData.get("shootDate") ?? "") || null,
      expiresAt: unlimited ? null : endOfBerlinDay(expiry),
    });
  });
}

export async function setPasswordAction(id: string, _previous: ActionState, formData: FormData): Promise<ActionState> {
  return guarded(id, () => setGalleryPassword(getDb(), gallerySecret(), id, String(formData.get("password") ?? "")));
}

export async function regeneratePasswordAction(id: string): Promise<ActionState> {
  return guarded(id, () => setGalleryPassword(getDb(), gallerySecret(), id, generateGalleryPassword()));
}

export async function setCoverAction(id: string, imageId: string): Promise<ActionState> {
  return guarded(id, () => updateGallery(getDb(), id, { coverImageId: imageId }));
}

export async function removeGalleryImageAction(id: string, imageId: string): Promise<ActionState> {
  return guarded(id, () => removeImage(getDb(), getEnv().GALLERIES, id, imageId));
}

export async function setStatusAction(id: string, status: "draft" | "online"): Promise<void> {
  await requireAdmin();
  await updateGallery(getDb(), id, { status });
  revalidatePath(detailPath(id));
}

export async function extendGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await extendGallery(getDb(), id, new Date());
  revalidatePath(detailPath(id));
}

export async function deleteGalleryAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteGallery(getDb(), getEnv().GALLERIES, id);
  redirect("/admin/galerien");
}
```

- [ ] **Schritt 4: Bausteine der Detailseite**

`src/app/admin/(protected)/galerien/[id]/gallery-settings.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { formatDateInput } from "@/lib/format";
import type { Gallery } from "@/lib/galleries/repo";
import { updateGalleryAction, type ActionState } from "./actions";

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function GallerySettings({ gallery }: { gallery: Gallery }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateGalleryAction.bind(null, gallery.id), {});
  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        Titel
        <input name="title" defaultValue={gallery.title} maxLength={120} className={control} />
      </label>
      <label className="block text-sm">
        Kurzname
        <input name="slug" defaultValue={gallery.slug} maxLength={60} className={control} />
      </label>
      <label className="block text-sm">
        Datum
        <input name="shootDate" type="date" defaultValue={gallery.shootDate ?? ""} className={control} />
      </label>
      <label className="block text-sm">
        Online bis
        <input name="expiresAt" type="date" defaultValue={gallery.expiresAt ? formatDateInput(gallery.expiresAt) : ""} className={control} />
      </label>
      <label className="flex items-center gap-2 self-end text-sm">
        <input name="unlimited" type="checkbox" defaultChecked={gallery.expiresAt === null} /> Unbegrenzt online
      </label>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={pending} className="bg-ink px-6 py-2 text-paper disabled:opacity-60">
          Einstellungen speichern
        </button>
        {state.ok && <p role="status" className="text-sm">Gespeichert.</p>}
        {state.error && <p role="alert" className="text-sm text-signal">{state.error}</p>}
      </div>
    </form>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/password-panel.tsx`:

```tsx
"use client";

import { useActionState, useTransition } from "react";
import { regeneratePasswordAction, setPasswordAction, type ActionState } from "./actions";

export function PasswordPanel({ galleryId, password }: { galleryId: string; password: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setPasswordAction.bind(null, galleryId), {});
  const [regenerating, startRegenerate] = useTransition();
  return (
    <div className="space-y-3">
      <p className="text-sm">
        Passwort:{" "}
        <span data-testid="gallery-password" className="font-label">
          {password ?? "unbekannt – bitte neu setzen"}
        </span>
      </p>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          Neues Passwort
          <input name="password" minLength={8} maxLength={64} className="mt-1 block border border-ink/20 bg-paper px-3 py-2" />
        </label>
        <button type="submit" disabled={pending} className="border border-ink px-4 py-2 text-sm">
          Passwort setzen
        </button>
        <button
          type="button"
          disabled={regenerating}
          className="text-sm underline"
          onClick={() => startRegenerate(async () => void (await regeneratePasswordAction(galleryId)))}
        >
          Neues Passwort erzeugen
        </button>
      </form>
      {state.error && <p role="alert" className="text-sm text-signal">{state.error}</p>}
      <p className="text-xs text-stone">Nach einer Änderung müssen Kunden das neue Passwort eingeben.</p>
    </div>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/message-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { Locale } from "@/lib/format";
import { galleryMessage } from "@/lib/galleries/message";

type Props = { url: string; password: string; expiresAt: string | null };

export function MessagePanel({ url, password, expiresAt }: Props) {
  const [locale, setLocale] = useState<Locale>("de");
  const [copied, setCopied] = useState(false);
  const text = galleryMessage({ locale, url, password, expiresAt });
  return (
    <div className="max-w-2xl space-y-3">
      <label className="block text-sm">
        Sprache
        <select value={locale} onChange={(event) => setLocale(event.target.value as Locale)} className="ml-3 border border-ink/20 bg-paper px-2 py-1">
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className="block text-sm">
        Nachricht
        <textarea readOnly value={text} rows={9} className="mt-1 block w-full border border-ink/20 bg-paper px-3 py-2 font-label text-xs" />
      </label>
      <button
        type="button"
        className="bg-ink px-6 py-2 text-sm text-paper"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        }}
      >
        Nachricht kopieren
      </button>
      {copied && <span role="status" className="ml-3 text-sm">Kopiert.</span>}
    </div>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/gallery-images.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { UploadZone } from "@/components/admin/upload-zone";
import { formatBytes } from "@/lib/format";
import type { GalleryImage } from "@/lib/galleries/repo";
import { uploadGalleryImage } from "@/lib/galleries/upload";
import { removeGalleryImageAction, setCoverAction } from "./actions";

type Props = { galleryId: string; coverImageId: string | null; initialImages: GalleryImage[] };

// Gleiche Reihenfolge wie die Datenbank (Dateiname ohne Groß/Klein-Unterschied).
const byName = (a: GalleryImage, b: GalleryImage) => a.filename.localeCompare(b.filename, "de", { sensitivity: "base" });

export function GalleryImages({ galleryId, coverImageId, initialImages }: Props) {
  const [images, setImages] = useState(initialImages);
  const [cover, setCover] = useState(coverImageId);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(file: File) {
    const image = await uploadGalleryImage(galleryId, file);
    setImages((current) => [...current, image].sort(byName));
  }

  function makeCover(imageId: string) {
    startTransition(async () => {
      const result = await setCoverAction(galleryId, imageId);
      if (result.error) setError(result.error);
      else setCover(imageId);
    });
  }

  function remove(image: GalleryImage) {
    if (!window.confirm(`${image.filename} aus der Galerie entfernen?`)) return;
    startTransition(async () => {
      const result = await removeGalleryImageAction(galleryId, image.id);
      if (result.error) setError(result.error);
      else setImages((current) => current.filter((i) => i.id !== image.id));
    });
  }

  return (
    <div className="space-y-6">
      <UploadZone onUpload={upload} />
      {error && <p role="alert" className="text-sm text-signal">{error}</p>}
      <p className="text-sm text-stone">
        {images.length} Bilder · {formatBytes(images.reduce((sum, image) => sum + image.bytes, 0), "de")}
      </p>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        {images.map((image) => (
          <li key={image.id} data-testid="gallery-image" className="bg-mat p-2 text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau kommt aus dem privaten Bucket über den Worker */}
            <img
              src={`/admin/api/galleries/${galleryId}/images/${image.id}/thumb`}
              alt=""
              loading="lazy"
              width={image.width}
              height={image.height}
              className="aspect-square w-full object-cover"
              style={{ backgroundColor: image.color }}
            />
            <p className="mt-2 truncate font-label">{image.filename}</p>
            <div className="mt-1 flex justify-between gap-2">
              {cover === image.id ? (
                <span data-testid="cover-badge" className="text-stone">Titelbild</span>
              ) : (
                <button type="button" className="underline" onClick={() => makeCover(image.id)}>
                  Als Titelbild
                </button>
              )}
              <button type="button" className="text-signal underline" onClick={() => remove(image)}>
                Entfernen
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/delete-button.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { deleteGalleryAction } from "./actions";

export function DeleteGalleryButton({ galleryId }: { galleryId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-signal underline"
      onClick={() => {
        if (!window.confirm("Galerie und alle Fotos endgültig löschen?")) return;
        start(() => deleteGalleryAction(galleryId));
      }}
    >
      Galerie löschen
    </button>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/page.tsx` komplett ersetzen:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getDb } from "@/lib/env";
import { galleryState, getGalleryById, listImages, revealPassword } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { isUuid } from "@/lib/media/keys";
import { STATE_LABELS } from "../labels";
import { extendGalleryAction, setStatusAction } from "./actions";
import { DeleteGalleryButton } from "./delete-button";
import { GalleryImages } from "./gallery-images";
import { GallerySettings } from "./gallery-settings";
import { MessagePanel } from "./message-panel";
import { PasswordPanel } from "./password-panel";

type Props = { params: Promise<{ id: string }> };

export const metadata: Metadata = { title: "Galerie" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-t border-ink/10 pt-8">
      <h2 className="font-label text-xs text-stone">{title}</h2>
      {children}
    </section>
  );
}

export default async function GalleryDetailPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();
  const gallery = isUuid(id) ? await getGalleryById(db, id) : undefined;
  if (!gallery) notFound();
  const [images, password] = await Promise.all([
    listImages(db, gallery.id),
    // Nur nach einem Wechsel von GALLERY_SECRET nicht mehr lesbar → Hinweis statt Absturz.
    revealPassword(gallerySecret(), gallery).catch(() => null),
  ]);
  const host = (await headers()).get("host") ?? "cosmo-photos.de";
  const url = `https://${host}/g/${gallery.slug}`;

  return (
    <div className="space-y-10">
      <header>
        <p className="font-label text-xs text-stone">Galerie</p>
        <h1 className="font-display mt-2 text-5xl">{gallery.title}</h1>
        <dl className="mt-6 grid max-w-2xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="text-stone">Status</dt>
          <dd data-testid="gallery-status">{STATE_LABELS[galleryState(gallery, new Date())]}</dd>
          <dt className="text-stone">Link</dt>
          <dd data-testid="gallery-link" className="font-label">{url}</dd>
          <dt className="text-stone">Online bis</dt>
          <dd data-testid="gallery-expiry">{gallery.expiresAt ? formatDate(gallery.expiresAt, "de") : "unbegrenzt"}</dd>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <form action={setStatusAction.bind(null, gallery.id, gallery.status === "draft" ? "online" : "draft")}>
            <button type="submit" className="bg-ink px-6 py-2 text-paper">
              {gallery.status === "draft" ? "Veröffentlichen" : "Zurück auf Entwurf"}
            </button>
          </form>
          <form action={extendGalleryAction.bind(null, gallery.id)}>
            <button type="submit" className="border border-ink px-4 py-2">
              Um 30 Tage verlängern
            </button>
          </form>
        </div>
      </header>

      <Section title="Bilder">
        <GalleryImages galleryId={gallery.id} coverImageId={gallery.coverImageId} initialImages={images} />
      </Section>

      {password && (
        <Section title="Nachricht an den Kunden">
          <MessagePanel url={url} password={password} expiresAt={gallery.expiresAt} />
        </Section>
      )}

      <Section title="Passwort">
        <PasswordPanel galleryId={gallery.id} password={password} />
      </Section>

      <Section title="Einstellungen">
        <GallerySettings gallery={gallery} />
      </Section>

      <Section title="Löschen">
        <DeleteGalleryButton galleryId={gallery.id} />
      </Section>
    </div>
  );
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet:
- Lint grün; der Wächter findet `requireAdmin(` in `galerien/actions.ts` und `galerien/[id]/actions.ts`
- Unit 110 PASS
- E2E alle grün, auch `admin-portfolio.spec.ts` in Chromium und WebKit (verschobene Upload-Zone)

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(admin): gallery detail with streamed uploads, cover, publish, message and password

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Kundenseite `/g/<slug>`: Passwort, Galerie, Lightbox, Downloads

**Dateien:**
- Erstellen:
  - `src/lib/galleries/i18n.ts`
  - `src/app/g/layout.tsx`
  - `src/app/g/[slug]/page.tsx`, `actions.ts`, `password-form.tsx`, `gallery-view.tsx`, `download-buttons.tsx`, `lightbox.tsx`, `locale-switch.tsx`, `types.ts`
  - `test/e2e/gallery-client.spec.ts`, `test/e2e/gallery-public.spec.ts`
- Ändern: `src/messages/de.json`, `src/messages/en.json` (Namespace `gallery`), `next.config.ts` (Header für `/g/:path*`), `scripts/check-server-actions.mjs` (Ausnahme)

**Schnittstellen:**
- Nutzt:
  - Task 1: `resolveGalleryLocale`, `formatBytes`, `formatDate`, Token-Funktionen
  - Task 2: Repository
  - Task 3: `zipPartsFor`
  - Task 4: Datei- und ZIP-Routen
  - Task 5: `gallerySecret`, E2E-Helfer
- Stellt bereit:
  - `galleryI18n(): Promise<{ locale; messages; t }>`
  - `unlockGalleryAction(slug, prev, formData)` setzt `cosmo_galerie`
  - `type ViewImage = { id; filename; width; height; color; bytes }` (`types.ts`)
  - `DownloadButtons({ slug, set: "all" | "favorites", images, primary })`
  - `Lightbox({ slug, images, index, onIndex, onClose, favorite? })`
  - `data-testid`s: `gallery-grid`, `gallery-thumb`, `download-all`, `lightbox`
  - Messages `gallery.*` (alle Texte, auch die für Task 8)

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

`test/e2e/gallery-public.spec.ts` (läuft auch gegen die Produktion, braucht keine Anmeldung):

```ts
import { expect, test } from "@playwright/test";

test("unbekannte Galerie: Seite, Bilder und ZIP antworten mit 404", async ({ page, request }) => {
  expect((await page.goto("/g/gibt-es-nicht"))?.status()).toBe(404);
  expect((await request.get("/g/gibt-es-nicht/zip?set=all")).status()).toBe(404);
  expect((await request.get(`/g/gibt-es-nicht/img/${crypto.randomUUID()}/original`)).status()).toBe(404);
});
```

`test/e2e/gallery-client.spec.ts`:

```ts
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { RUN, createGalleryViaUi, galleryPassword, newContext, publishGallery, unlockGallery, uploadJpegs } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });

const TITLE = `Kunden Ümlaut ${RUN}`;
let slug = "";
let password = "";

test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  ({ slug } = await createGalleryViaUi(page, TITLE));
  password = await galleryPassword(page);
  await uploadJpegs(page, ["Größe 1.jpg", "IMG_0002.jpg", "IMG_0003.jpg"]);
  await publishGallery(page);
  await admin.close();
});

test("Passwortseite zeigt den Titel, falsches Passwort wird abgelehnt", async ({ page }) => {
  const response = await page.goto(`/g/${slug}`);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(TITLE);
  await page.getByLabel("Passwort").fill("falsch-falsch-00");
  await page.getByRole("button", { name: "Öffnen" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Falsches Passwort.");
});

test("mit Passwort: Raster, Lightbox per Tastatur, Original-Download", async ({ page }) => {
  await unlockGallery(page, slug, password);
  const thumbs = page.getByTestId("gallery-thumb");
  await expect(thumbs).toHaveCount(3);
  await expect(page.getByText("3 Bilder")).toBeVisible();

  await thumbs.first().click();
  const lightbox = page.getByTestId("lightbox");
  await expect(lightbox.getByText("1 / 3")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(lightbox.getByText("2 / 3")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    lightbox.getByRole("link", { name: "Original herunterladen" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("IMG_0002.jpg");
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
  await expect(thumbs.first()).toBeFocused();
});

test("ZIP: exakte Länge, besteht unzip -t mit allen Dateien", async ({ page }) => {
  await unlockGallery(page, slug, password);
  const href = await page.getByTestId("download-all").first().getAttribute("href");
  expect(href).toBe(`/g/${slug}/zip?set=all`);
  const zip = await page.request.get(href!);
  expect(zip.status()).toBe(200);
  const body = await zip.body();
  expect(body.length).toBe(Number(zip.headers()["content-length"]));
  const file = join(mkdtempSync(join(tmpdir(), "cosmo-zip-")), "galerie.zip");
  writeFileSync(file, body);
  const report = execFileSync("unzip", ["-t", file]).toString();
  expect(report).toContain("No errors detected");
  expect(report.match(/\bOK\b/g)).toHaveLength(3);
  expect(report).toContain("IMG_0003.jpg");
});

test("Sprache: Umschalter auf Englisch", async ({ page }) => {
  await page.goto(`/g/${slug}`);
  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("button", { name: "Open" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("Entwurf ist unsichtbar (404), abgelaufene Galerie zeigt einen freundlichen Hinweis", async ({ browser, page }) => {
  const admin = await newContext(browser, { admin: true });
  const adminPage = await admin.newPage();
  const draft = await createGalleryViaUi(adminPage, `Entwurf ${RUN}`);
  const expired = await createGalleryViaUi(adminPage, `Abgelaufen ${RUN}`);
  await adminPage.getByLabel("Online bis").fill("2020-01-01");
  await adminPage.getByRole("button", { name: "Einstellungen speichern" }).click();
  await expect(adminPage.getByTestId("gallery-expiry")).toHaveText("01.01.2020");
  await adminPage.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(adminPage.getByTestId("gallery-status")).toHaveText("Abgelaufen");
  await admin.close();

  expect((await page.goto(`/g/${draft.slug}`))?.status()).toBe(404);
  await page.goto(`/g/${expired.slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diese Galerie ist abgelaufen.");
  await expect(page.getByRole("link", { name: "Kontakt" })).toHaveAttribute("href", "/kontakt");
});
```

```bash
npm run test:e2e -- gallery-client.spec.ts gallery-public.spec.ts
```
Erwartet: `gallery-public` besteht schon, weil Task 4 für Dateien und ZIP 404 liefert und die Seite noch fehlt. `gallery-client` schlägt fehl, weil es keine Passwortseite gibt.

- [ ] **Schritt 2: Texte (DE/EN)**

In `src/messages/de.json` auf oberster Ebene ergänzen:

```json
"gallery": {
  "private": "Privater Bereich",
  "password": "Passwort",
  "open": "Öffnen",
  "wrongPassword": "Falsches Passwort.",
  "tooMany": "Zu viele Versuche. Bitte eine Minute warten.",
  "images": "{count} Bilder",
  "onlineUntil": "Online bis {date}",
  "downloadAll": "Alle herunterladen ({size})",
  "downloadPart": "Teil {part} von {total} ({size})",
  "downloadFavorites": "Favoriten herunterladen ({count})",
  "downloadFavoritesPart": "Favoriten · Teil {part} von {total} ({size})",
  "onlyFavorites": "Nur Favoriten",
  "showAll": "Alle zeigen",
  "favorite": "Als Favorit markieren",
  "unfavorite": "Favorit entfernen",
  "download": "Original herunterladen",
  "close": "Schließen",
  "previous": "Vorheriges Bild",
  "next": "Nächstes Bild",
  "namePrompt": "Wie heißt du?",
  "nameHint": "Damit Felix weiß, wessen Auswahl das ist.",
  "nameContinue": "Weiter",
  "cancel": "Abbrechen",
  "empty": "Diese Galerie enthält noch keine Fotos.",
  "expiredTitle": "Diese Galerie ist abgelaufen.",
  "expiredText": "Schreib mir, wenn du sie noch einmal brauchst.",
  "contact": "Kontakt",
  "switchLocale": "English"
}
```

In `src/messages/en.json` entsprechend:

```json
"gallery": {
  "private": "Private area",
  "password": "Password",
  "open": "Open",
  "wrongPassword": "Wrong password.",
  "tooMany": "Too many attempts. Please wait a minute.",
  "images": "{count} photos",
  "onlineUntil": "Online until {date}",
  "downloadAll": "Download all ({size})",
  "downloadPart": "Part {part} of {total} ({size})",
  "downloadFavorites": "Download favourites ({count})",
  "downloadFavoritesPart": "Favourites · part {part} of {total} ({size})",
  "onlyFavorites": "Favourites only",
  "showAll": "Show all",
  "favorite": "Mark as favourite",
  "unfavorite": "Remove favourite",
  "download": "Download original",
  "close": "Close",
  "previous": "Previous photo",
  "next": "Next photo",
  "namePrompt": "What's your name?",
  "nameHint": "So Felix knows whose selection this is.",
  "nameContinue": "Continue",
  "cancel": "Cancel",
  "empty": "This gallery has no photos yet.",
  "expiredTitle": "This gallery has expired.",
  "expiredText": "Write to me if you need it again.",
  "contact": "Contact",
  "switchLocale": "Deutsch"
}
```

- [ ] **Schritt 3: Sprache, Layout, Header, Passwort-Aktion**

`src/lib/galleries/i18n.ts`:

```ts
import { cookies, headers } from "next/headers";
import { createTranslator } from "next-intl";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import { resolveGalleryLocale, type GalleryLocale } from "./locale";

/**
 * Sprache der Galerie (Spec §3.2): /g/… hat kein Sprachpräfix, deshalb Cookie NEXT_LOCALE bzw. Browsersprache.
 * Bewusst unabhängig von src/i18n/request.ts, das die Sprache aus der URL liest.
 */
export async function galleryI18n() {
  const locale: GalleryLocale = resolveGalleryLocale((await cookies()).get("NEXT_LOCALE")?.value, (await headers()).get("accept-language"));
  const messages = { gallery: (locale === "de" ? de : en).gallery };
  return { locale, messages, t: createTranslator({ locale, messages, namespace: "gallery" }) };
}
```

`src/app/g/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "@/app/fonts";
import { galleryI18n } from "@/lib/galleries/i18n";
import "../globals.css";

export const metadata: Metadata = { title: "Galerie · Cosmo Photos", robots: { index: false, follow: false } };

export default async function GalleryRootLayout({ children }: { children: ReactNode }) {
  const { locale, messages } = await galleryI18n();
  return (
    <html lang={locale} className={fontVariables}>
      <body className="min-h-dvh">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Berlin">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

In `next.config.ts` in `headers()` einen zweiten Eintrag nach dem für `/admin/:path*` ergänzen:

```ts
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
```

In `scripts/check-server-actions.mjs` die Zeile `const ALLOW = new Set(["src/app/admin/login/actions.ts"]);` ersetzen durch:

```js
// Öffentliche Aktionen, die den Zugang erst erzeugen: Admin-Login und Galerie-Passwort.
const ALLOW = new Set(["src/app/admin/login/actions.ts", "src/app/g/[slug]/actions.ts"]);
```

`src/app/g/[slug]/actions.ts`:

```ts
"use server";

// Öffentliche Aktion (bewusst ohne Admin-Prüfung): Sie prüft das Galerie-Passwort und erzeugt erst den Zugang.
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/env";
import { checkGalleryPassword, galleryState, getGalleryBySlug } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { GALLERY_ACCESS_SECONDS, GALLERY_COOKIE, createGalleryToken } from "@/lib/galleries/token";

export type UnlockState = { error?: "wrongPassword" | "tooMany" };

export async function unlockGalleryAction(slug: string, _previous: UnlockState, formData: FormData): Promise<UnlockState> {
  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.GALLERY_LIMITER.limit({ key: `gallery:${ip}:${slug}` });
  if (!success) return { error: "tooMany" };

  const gallery = await getGalleryBySlug(getDb(), slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") redirect(`/g/${slug}`);
  if (!(await checkGalleryPassword(gallery, String(formData.get("password") ?? "")))) return { error: "wrongPassword" };

  const token = await createGalleryToken(gallerySecret(), gallery, Math.floor(Date.now() / 1000));
  (await cookies()).set(GALLERY_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: `/g/${slug}`,
    maxAge: GALLERY_ACCESS_SECONDS,
  });
  redirect(`/g/${slug}`);
}
```

- [ ] **Schritt 4: Oberfläche**

`src/app/g/[slug]/types.ts`:

```ts
/** Was die Galerie-Oberfläche von einem Bild braucht (keine CRC, keine Galerie-ID). */
export type ViewImage = { id: string; filename: string; width: number; height: number; color: string; bytes: number };
```

`src/app/g/[slug]/password-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { unlockGalleryAction, type UnlockState } from "./actions";

export function PasswordForm({ slug }: { slug: string }) {
  const t = useTranslations("gallery");
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockGalleryAction.bind(null, slug), {});
  return (
    <form action={action} className="mt-10 w-full max-w-sm space-y-5">
      <label className="block text-left text-sm">
        {t("password")}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 block w-full border-b border-ink/30 bg-transparent py-2 font-label tracking-widest outline-none focus:border-ink"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-signal">
          {t(state.error)}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full bg-ink py-3 text-paper disabled:opacity-60">
        {t("open")}
      </button>
    </form>
  );
}
```

`src/app/g/[slug]/locale-switch.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

/** Gleiches Cookie wie die öffentliche Seite: Die gewählte Sprache gilt dort auch. */
export function LocaleSwitch() {
  const t = useTranslations("gallery");
  const locale = useLocale();
  const router = useRouter();
  return (
    <button
      type="button"
      className="font-label text-xs text-stone underline"
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${locale === "de" ? "en" : "de"}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }}
    >
      {t("switchLocale")}
    </button>
  );
}
```

`src/app/g/[slug]/download-buttons.tsx`:

```tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatBytes, type Locale } from "@/lib/format";
import { zipPartsFor } from "@/lib/zip/zip";
import type { ViewImage } from "./types";

type Props = { slug: string; set: "all" | "favorites"; images: ViewImage[]; primary: boolean };

/** Ein Button pro ZIP-Teil (≤ 2 GB). Der Worker rechnet dieselbe Aufteilung (zipPartsFor, gleiche Reihenfolge). */
export function DownloadButtons({ slug, set, images, primary }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const parts = zipPartsFor(images);
  if (parts.length === 0) return null;
  return (
    <div className="flex flex-col items-end gap-2">
      {parts.map((part, index) => {
        const size = formatBytes(part.size, locale);
        const label =
          parts.length > 1
            ? t(set === "all" ? "downloadPart" : "downloadFavoritesPart", { part: index + 1, total: parts.length, size })
            : set === "all"
              ? t("downloadAll", { size })
              : t("downloadFavorites", { count: images.length });
        return (
          <a
            key={index}
            data-testid={set === "all" ? "download-all" : "download-favorites"}
            href={`/g/${slug}/zip?set=${set}${parts.length > 1 ? `&part=${index + 1}` : ""}`}
            className={primary ? "bg-ink px-6 py-3 text-paper" : "border border-ink px-4 py-2"}
          >
            {label}
          </a>
        );
      })}
    </div>
  );
}
```

`src/app/g/[slug]/lightbox.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import type { ViewImage } from "./types";

type Props = {
  slug: string;
  images: ViewImage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  favorite?: { active: boolean; onToggle: () => void };
};

export function Lightbox({ slug, images, index, onIndex, onClose, favorite }: Props) {
  const t = useTranslations("gallery");
  const image = images[index];

  // Scrollen sperren und den Fokus beim Schließen dorthin zurückgeben, wo er vorher war (Tastaturbedienung).
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
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

  return (
    <div data-testid="lightbox" role="dialog" aria-modal="true" aria-label={image.filename} className="fixed inset-0 z-50 flex flex-col bg-hall/95 text-hall-ink">
      <div className="flex items-center justify-between p-4 font-label text-xs">
        <span>
          {index + 1} / {images.length}
        </span>
        <button type="button" autoFocus onClick={onClose} className="underline">
          {t("close")}
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
        {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
        <img
          key={image.id}
          src={`/g/${slug}/img/${image.id}/preview`}
          alt={image.filename}
          className="max-h-full max-w-full object-contain"
          style={{ backgroundColor: image.color, aspectRatio: `${image.width} / ${image.height}` }}
        />
        {index > 0 && (
          <button type="button" aria-label={t("previous")} onClick={() => onIndex(index - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 p-3 text-2xl">
            ←
          </button>
        )}
        {index < images.length - 1 && (
          <button type="button" aria-label={t("next")} onClick={() => onIndex(index + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-2xl">
            →
          </button>
        )}
      </div>
      <div className="flex items-center justify-center gap-6 p-4 text-sm">
        {favorite && (
          <button type="button" onClick={favorite.onToggle} aria-pressed={favorite.active} className="underline">
            {favorite.active ? `♥ ${t("unfavorite")}` : `♡ ${t("favorite")}`}
          </button>
        )}
        <a href={`/g/${slug}/img/${image.id}/original`} download={image.filename} className="underline">
          {t("download")}
        </a>
      </div>
    </div>
  );
}
```

`src/app/g/[slug]/gallery-view.tsx` (Task 8 ersetzt die Datei durch die Version mit Favoriten):

```tsx
"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, type Locale } from "@/lib/format";
import { DownloadButtons } from "./download-buttons";
import { Lightbox } from "./lightbox";
import { LocaleSwitch } from "./locale-switch";
import type { ViewImage } from "./types";

type Props = { slug: string; title: string; shootDate: string | null; expiresAt: string | null; coverId: string | null; images: ViewImage[] };

export function GalleryView({ slug, title, shootDate, expiresAt, coverId, images }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const meta = [
    shootDate ? formatDate(shootDate, locale) : null,
    t("images", { count: images.length }),
    expiresAt ? t("onlineUntil", { date: formatDate(expiresAt, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker
        <img src={`/g/${slug}/img/${coverId}/preview`} alt="" className="mb-10 aspect-[21/9] w-full object-cover" />
      )}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-label text-xs text-stone">Cosmo Photos</p>
          <h1 className="font-display mt-2 text-5xl">{title}</h1>
          <p className="mt-3 font-label text-xs text-stone">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-3 text-sm">
          <LocaleSwitch />
          <DownloadButtons slug={slug} set="all" images={images} primary />
        </div>
      </header>

      {images.length === 0 ? (
        <p className="mt-16 text-stone">{t("empty")}</p>
      ) : (
        <ul data-testid="gallery-grid" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((image, index) => (
            // content-visibility: Der Browser zeichnet nur sichtbare Kacheln (Spec §7.1, große Galerien).
            <li key={image.id} className="relative [contain-intrinsic-size:auto_320px] [content-visibility:auto]">
              <button type="button" data-testid="gallery-thumb" onClick={() => setOpen(index)} className="block w-full bg-mat p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
                <img
                  src={`/g/${slug}/img/${image.id}/thumb`}
                  alt={image.filename}
                  loading="lazy"
                  width={image.width}
                  height={image.height}
                  className="aspect-[4/5] w-full object-cover"
                  style={{ backgroundColor: image.color }}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open !== null && <Lightbox slug={slug} images={images} index={open} onIndex={setOpen} onClose={close} />}
    </main>
  );
}
```

`src/app/g/[slug]/page.tsx`:

```tsx
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/env";
import { galleryI18n } from "@/lib/galleries/i18n";
import { galleryState, getGalleryBySlug, listImages, logEvent, normalizeVisitorName } from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { SLUG_PATTERN } from "@/lib/galleries/slug";
import { GALLERY_COOKIE, VISITOR_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";
import { GalleryView } from "./gallery-view";
import { LocaleSwitch } from "./locale-switch";
import { PasswordForm } from "./password-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function GalleryPage({ params }: Props) {
  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) notFound();
  const db = getDb();
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery) notFound();
  const state = galleryState(gallery, new Date());
  if (state === "draft") notFound();
  const { t } = await galleryI18n();

  if (state === "expired") {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-4xl">{t("expiredTitle")}</h1>
          <p className="mt-4 text-stone">{t("expiredText")}</p>
          <a href="/kontakt" className="mt-8 inline-block underline">
            {t("contact")}
          </a>
        </div>
      </main>
    );
  }

  const jar = await cookies();
  const unlocked = await verifyGalleryToken(jar.get(GALLERY_COOKIE)?.value, gallerySecret(), gallery, Math.floor(Date.now() / 1000));
  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center px-6">
        <div className="flex w-full flex-col items-center text-center">
          <p className="font-label text-xs text-stone">{t("private")}</p>
          <h1 className="font-display mt-3 text-5xl">{gallery.title}</h1>
          <PasswordForm slug={slug} />
          <div className="mt-10">
            <LocaleSwitch />
          </div>
        </div>
      </main>
    );
  }

  // Next liefert Cookie-Werte bereits dekodiert.
  const visitor = normalizeVisitorName(jar.get(VISITOR_COOKIE)?.value);
  const images = await listImages(db, gallery.id);
  await logEvent(db, { galleryId: gallery.id, type: "view", visitorName: visitor });

  return (
    <GalleryView
      slug={slug}
      title={gallery.title}
      shootDate={gallery.shootDate}
      expiresAt={gallery.expiresAt}
      coverId={gallery.coverImageId}
      images={images.map(({ id, filename, width, height, color, bytes }) => ({ id, filename, width, height, color, bytes }))}
    />
  );
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (die Galerie-Aktion steht in der Ausnahmeliste), Unit 110 PASS, E2E alle grün, darunter die 6 neuen Tests.

Hinweis: Die Middleware nimmt `/g/…` aus (Plan 1), und `src/app/g/layout.tsx` ist ein eigenes Root-Layout wie `src/app/admin/layout.tsx`. `/g/<slug>/img|zip` beantwortet `custom-worker.ts`, bevor Next die Anfrage sieht.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(galleries): client page with password, grid, lightbox and downloads

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Favoriten mit Namen, Admin-Einblick (Favoriten und Statistik)

**Dateien:**
- Erstellen:
  - `src/app/g/[slug]/api/favorites/route.ts`, `src/app/g/[slug]/name-dialog.tsx`
  - `src/app/admin/(protected)/galerien/[id]/favorites-panel.tsx`, `events-panel.tsx`
  - `test/e2e/gallery-favorites.spec.ts`
- Ändern: `src/app/g/[slug]/gallery-view.tsx` (komplett ersetzen), `src/app/g/[slug]/page.tsx`, `src/app/admin/(protected)/galerien/[id]/page.tsx`

**Schnittstellen:**
- Nutzt:
  - Task 2: `addFavorite`, `removeFavorite`, `listFavoriteIds`, `favoritesByVisitor`, `listEvents`, `logEvent`, `normalizeVisitorName`
  - Task 7: `DownloadButtons`, `Lightbox` (`favorite`-Prop), `ViewImage`
  - Task 4: `sameHost`
  - Task 1: `VISITOR_COOKIE`
- Stellt bereit:
  - `POST|DELETE /g/<slug>/api/favorites` mit `{ imageId, name }` → 204 | 400 | 401 | 403 | 404
  - `GET /g/<slug>/api/favorites?name=` → `string[]`
  - `data-testid`s: `download-favorites`, `favorites-panel`, `events-panel`

- [ ] **Schritt 1: Fehlschlagende E2E-Tests schreiben**

`test/e2e/gallery-favorites.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { RUN, createGalleryViaUi, galleryPassword, newContext, publishGallery, unlockGallery, uploadJpegs } from "./helpers/galleries";

test.describe.configure({ mode: "serial" });

let slug = "";
let galleryId = "";
let password = "";

test.beforeAll(async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  ({ slug, id: galleryId } = await createGalleryViaUi(page, `Favoriten ${RUN}`));
  password = await galleryPassword(page);
  await uploadJpegs(page, ["IMG_2041.jpg", "IMG_2042.jpg", "IMG_2077.jpg"]);
  await publishGallery(page);
  await admin.close();
});

test("Name beim ersten Herz, Auswahl bleibt nach Neuladen, Filter und Favoriten-ZIP", async ({ page }) => {
  await unlockGallery(page, slug, password);
  await page.getByRole("button", { name: "Als Favorit markieren" }).first().click();
  await page.getByLabel("Wie heißt du?").fill("  Anna  ");
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(1);
  await page.getByRole("button", { name: "Als Favorit markieren" }).last().click();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(2);

  await page.reload();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(2);

  await page.getByRole("button", { name: "Nur Favoriten" }).click();
  await expect(page.getByTestId("gallery-thumb")).toHaveCount(2);

  const zip = await page.request.get((await page.getByTestId("download-favorites").first().getAttribute("href"))!);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-disposition"]).toContain("_Favoriten.zip");
});

test("der Admin sieht die Auswahl mit Dateinamen und die Zeitleiste", async ({ browser }) => {
  const admin = await newContext(browser, { admin: true });
  const page = await admin.newPage();
  await page.goto(`/admin/galerien/${galleryId}`);
  const panel = page.getByTestId("favorites-panel");
  await expect(panel).toContainText("Anna");
  await expect(panel.getByLabel("Dateinamen für Lightroom")).toHaveValue("IMG_2041, IMG_2077");
  const events = page.getByTestId("events-panel");
  await expect(events).toContainText("Favorit gesetzt");
  await expect(events).toContainText("ZIP geladen");
  await expect(events).toContainText("Galerie geöffnet");
  await admin.close();
});

test("eine zweite Person hat eine eigene Auswahl; zu lange Namen werden gekürzt", async ({ browser }) => {
  const other = await newContext(browser);
  const page = await other.newPage();
  await unlockGallery(page, slug, password);
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(0);
  await page.getByRole("button", { name: "Als Favorit markieren" }).first().click();
  await page.getByLabel("Wie heißt du?").fill("x".repeat(60));
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByRole("button", { name: "Favorit entfernen" })).toHaveCount(1);
  await other.close();
});
```

```bash
npm run test:e2e -- gallery-favorites.spec.ts
```
Erwartet: FAIL, weil es noch keinen Herz-Button gibt.

- [ ] **Schritt 2: Favoriten-API**

`src/app/g/[slug]/api/favorites/route.ts`:

```ts
import { cookies } from "next/headers";
import { z } from "zod";
import { sameHost } from "@/lib/auth/origin";
import { getDb } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import {
  GalleryError,
  addFavorite,
  galleryState,
  getGalleryBySlug,
  listFavoriteIds,
  logEvent,
  normalizeVisitorName,
  removeFavorite,
} from "@/lib/galleries/repo";
import { gallerySecret } from "@/lib/galleries/secret";
import { GALLERY_COOKIE, verifyGalleryToken } from "@/lib/galleries/token";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.strictObject({ imageId: z.uuid(), name: z.string() });

async function access(slug: string) {
  const db = getDb();
  const gallery = await getGalleryBySlug(db, slug);
  if (!gallery || galleryState(gallery, new Date()) !== "online") return { response: jsonError("Galerie nicht gefunden.", 404) };
  const token = (await cookies()).get(GALLERY_COOKIE)?.value;
  if (!(await verifyGalleryToken(token, gallerySecret(), gallery, Math.floor(Date.now() / 1000)))) {
    return { response: jsonError("Kein Zugang.", 401) };
  }
  return { db, gallery };
}

export async function GET(request: Request, { params }: Params) {
  const result = await access((await params).slug);
  if ("response" in result) return result.response;
  const name = normalizeVisitorName(new URL(request.url).searchParams.get("name"));
  if (!name) return jsonError("Ungültiger Name.", 400);
  return Response.json(await listFavoriteIds(result.db, result.gallery.id, name));
}

async function change(request: Request, { params }: Params, add: boolean) {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) return jsonError("Anfrage von fremder Herkunft.", 403);
  const result = await access((await params).slug);
  if ("response" in result) return result.response;
  const input = await readJson(request, bodySchema);
  if ("response" in input) return input.response;
  const name = normalizeVisitorName(input.data.name);
  if (!name) return jsonError("Ungültiger Name.", 400);
  try {
    if (add) await addFavorite(result.db, result.gallery.id, input.data.imageId, name);
    else await removeFavorite(result.db, result.gallery.id, input.data.imageId, name);
  } catch (cause) {
    if (cause instanceof GalleryError) return jsonError(cause.message, cause.status);
    throw cause;
  }
  await logEvent(result.db, {
    galleryId: result.gallery.id,
    type: add ? "favorite_add" : "favorite_remove",
    imageId: input.data.imageId,
    visitorName: name,
  });
  return new Response(null, { status: 204 });
}

export const POST = (request: Request, context: Params) => change(request, context, true);
export const DELETE = (request: Request, context: Params) => change(request, context, false);
```

- [ ] **Schritt 3: Namensabfrage und Favoriten in der Galerie**

`src/app/g/[slug]/name-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type Props = { onSubmit: (name: string) => void; onCancel: () => void };

export function NameDialog({ onSubmit, onCancel }: Props) {
  const t = useTranslations("gallery");
  const [name, setName] = useState("");
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="name-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-6">
      <form
        className="w-full max-w-sm space-y-4 bg-paper p-6"
        onKeyDown={(event) => event.key === "Escape" && onCancel()}
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onSubmit(name);
        }}
      >
        <label id="name-title" className="block font-display text-2xl">
          {t("namePrompt")}
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(event) => setName(event.target.value)}
            className="mt-3 block w-full border-b border-ink/30 bg-transparent py-2 font-sans text-base outline-none focus:border-ink"
          />
        </label>
        <p className="text-sm text-stone">{t("nameHint")}</p>
        <div className="flex justify-end gap-4 text-sm">
          <button type="button" onClick={onCancel} className="underline">
            {t("cancel")}
          </button>
          <button type="submit" className="bg-ink px-6 py-2 text-paper">
            {t("nameContinue")}
          </button>
        </div>
      </form>
    </div>
  );
}
```

`src/app/g/[slug]/gallery-view.tsx` komplett ersetzen:

```tsx
"use client";

import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatDate, type Locale } from "@/lib/format";
import { VISITOR_COOKIE } from "@/lib/galleries/token";
import { DownloadButtons } from "./download-buttons";
import { Lightbox } from "./lightbox";
import { LocaleSwitch } from "./locale-switch";
import { NameDialog } from "./name-dialog";
import type { ViewImage } from "./types";

type Props = {
  slug: string;
  title: string;
  shootDate: string | null;
  expiresAt: string | null;
  coverId: string | null;
  images: ViewImage[];
  initialFavorites: string[];
  initialVisitor: string | null;
};

/** Höchstens 40 Zeichen wie normalizeVisitorName, ohne ein Emoji zu zerschneiden. */
const clampName = (raw: string) => [...raw.trim()].slice(0, 40).join("");

export function GalleryView({ slug, title, shootDate, expiresAt, coverId, images, initialFavorites, initialVisitor }: Props) {
  const t = useTranslations("gallery");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState<number | null>(null);
  const [favorites, setFavorites] = useState(() => new Set(initialFavorites));
  const [visitor, setVisitor] = useState(initialVisitor);
  // Bild, das nach der Namensabfrage markiert wird (null = Dialog zu).
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const close = useCallback(() => setOpen(null), []);

  const favoriteImages = images.filter((image) => favorites.has(image.id));
  const filtering = onlyFavorites && favoriteImages.length > 0;
  const visible = filtering ? favoriteImages : images;
  const current = open !== null && visible.length > 0 ? Math.min(open, visible.length - 1) : null;
  const meta = [
    shootDate ? formatDate(shootDate, locale) : null,
    t("images", { count: images.length }),
    expiresAt ? t("onlineUntil", { date: formatDate(expiresAt, locale) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function flip(id: string, add: boolean) {
    setFavorites((previous) => {
      const next = new Set(previous);
      if (add) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** Sofort anzeigen, bei Fehler zurücknehmen. */
  function save(id: string, name: string, add: boolean) {
    flip(id, add);
    fetch(`/g/${slug}/api/favorites`, {
      method: add ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId: id, name }),
    })
      .then((response) => {
        if (!response.ok) flip(id, !add);
      })
      .catch(() => flip(id, !add));
  }

  function toggleFavorite(id: string) {
    if (!visitor) {
      setPendingFavorite(id);
      return;
    }
    save(id, visitor, !favorites.has(id));
  }

  async function chooseName(raw: string) {
    const name = clampName(raw);
    const id = pendingFavorite;
    setPendingFavorite(null);
    if (!name) return;
    document.cookie = `${VISITOR_COOKIE}=${encodeURIComponent(name)}; Path=/g/${slug}; Max-Age=31536000; SameSite=Lax; Secure`;
    setVisitor(name);
    // Wer unter diesem Namen schon markiert hat (z. B. am Handy), bekommt seine Auswahl zurück.
    const response = await fetch(`/g/${slug}/api/favorites?name=${encodeURIComponent(name)}`);
    const existing = response.ok ? ((await response.json()) as string[]) : [];
    setFavorites(new Set(existing));
    if (id && !existing.includes(id)) save(id, name, true);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker
        <img src={`/g/${slug}/img/${coverId}/preview`} alt="" className="mb-10 aspect-[21/9] w-full object-cover" />
      )}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-label text-xs text-stone">Cosmo Photos</p>
          <h1 className="font-display mt-2 text-5xl">{title}</h1>
          <p className="mt-3 font-label text-xs text-stone">{meta}</p>
        </div>
        <div className="flex flex-col items-end gap-3 text-sm">
          <LocaleSwitch />
          <DownloadButtons slug={slug} set="all" images={images} primary />
        </div>
      </header>

      {favoriteImages.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-6 text-sm">
          <button type="button" onClick={() => setOnlyFavorites((value) => !value)} aria-pressed={filtering} className="underline">
            {filtering ? t("showAll") : t("onlyFavorites")}
          </button>
          <DownloadButtons slug={slug} set="favorites" images={favoriteImages} primary={false} />
        </div>
      )}

      {images.length === 0 ? (
        <p className="mt-16 text-stone">{t("empty")}</p>
      ) : (
        <ul data-testid="gallery-grid" className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((image, index) => {
            const active = favorites.has(image.id);
            return (
              // content-visibility: Der Browser zeichnet nur sichtbare Kacheln (Spec §7.1, große Galerien).
              <li key={image.id} className="relative [contain-intrinsic-size:auto_320px] [content-visibility:auto]">
                <button type="button" data-testid="gallery-thumb" onClick={() => setOpen(index)} className="block w-full bg-mat p-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element -- privates Bild aus dem Worker */}
                  <img
                    src={`/g/${slug}/img/${image.id}/thumb`}
                    alt={image.filename}
                    loading="lazy"
                    width={image.width}
                    height={image.height}
                    className="aspect-[4/5] w-full object-cover"
                    style={{ backgroundColor: image.color }}
                  />
                </button>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={active ? t("unfavorite") : t("favorite")}
                  onClick={() => toggleFavorite(image.id)}
                  className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/40 text-lg text-paper backdrop-blur-sm"
                >
                  {active ? "♥" : "♡"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {current !== null && (
        <Lightbox
          slug={slug}
          images={visible}
          index={current}
          onIndex={setOpen}
          onClose={close}
          favorite={{ active: favorites.has(visible[current].id), onToggle: () => toggleFavorite(visible[current].id) }}
        />
      )}

      {pendingFavorite !== null && <NameDialog onSubmit={(name) => void chooseName(name)} onCancel={() => setPendingFavorite(null)} />}
    </main>
  );
}
```

In `src/app/g/[slug]/page.tsx`:
- Import `listFavoriteIds` in der Liste aus `@/lib/galleries/repo` ergänzen.
- `const images = await listImages(db, gallery.id);` ersetzen durch:

```tsx
  const [images, favorites] = await Promise.all([
    listImages(db, gallery.id),
    visitor ? listFavoriteIds(db, gallery.id, visitor) : Promise.resolve([]),
  ]);
```

- In `<GalleryView … />` nach `coverId={gallery.coverImageId}` ergänzen:

```tsx
      initialFavorites={favorites}
      initialVisitor={visitor}
```

- [ ] **Schritt 4: Admin-Einblick**

`src/app/admin/(protected)/galerien/[id]/favorites-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import type { VisitorFavorites } from "@/lib/galleries/repo";

const baseName = (filename: string) => filename.replace(/\.[^.]+$/, "");

/** Pro Person die Auswahl; die Dateinamen passen kommagetrennt in Lightrooms Textfilter (Spec §8). */
export function FavoritesPanel({ galleryId, visitors }: { galleryId: string; visitors: VisitorFavorites[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (visitors.length === 0) {
    return (
      <p data-testid="favorites-panel" className="text-sm text-stone">
        Noch keine Favoriten.
      </p>
    );
  }
  return (
    <div data-testid="favorites-panel" className="space-y-8">
      {visitors.map((visitor) => {
        const names = visitor.images.map((image) => baseName(image.filename)).join(", ");
        return (
          <div key={visitor.visitorName} className="space-y-3">
            <p className="text-sm">
              <strong>{visitor.visitorName}</strong> · {visitor.images.length} Favoriten
            </p>
            <ul className="flex flex-wrap gap-2">
              {visitor.images.map((image) => (
                <li key={image.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Admin-Vorschau aus dem privaten Bucket */}
                  <img src={`/admin/api/galleries/${galleryId}/images/${image.id}/thumb`} alt={image.filename} loading="lazy" className="h-20 w-20 object-cover" />
                </li>
              ))}
            </ul>
            <label className="block text-sm">
              Dateinamen für Lightroom
              <textarea readOnly rows={2} value={names} className="mt-1 block w-full max-w-2xl border border-ink/20 bg-paper px-3 py-2 font-label text-xs" />
            </label>
            <button
              type="button"
              className="text-sm underline"
              onClick={async () => {
                await navigator.clipboard.writeText(names);
                setCopied(visitor.visitorName);
              }}
            >
              Dateinamen kopieren
            </button>
            {copied === visitor.visitorName && (
              <span role="status" className="ml-3 text-sm">
                Kopiert.
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

`src/app/admin/(protected)/galerien/[id]/events-panel.tsx`:

```tsx
import type { GalleryEvent, GalleryImage } from "@/lib/galleries/repo";

const LABELS: Record<GalleryEvent["type"], string> = {
  view: "Galerie geöffnet",
  download_image: "Bild geladen",
  download_zip: "ZIP geladen",
  favorite_add: "Favorit gesetzt",
  favorite_remove: "Favorit entfernt",
};

const time = (iso: string) =>
  new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));

/** Zeitleiste der letzten 200 Ereignisse (Spec §7.3, ohne IP-Adressen). */
export function EventsPanel({ events, images }: { events: GalleryEvent[]; images: GalleryImage[] }) {
  if (events.length === 0) {
    return (
      <p data-testid="events-panel" className="text-sm text-stone">
        Noch keine Aktivität.
      </p>
    );
  }
  const names = new Map(images.map((image) => [image.id, image.filename]));
  return (
    <ul data-testid="events-panel" className="max-w-2xl space-y-1 text-sm">
      {events.map((event) => (
        <li key={event.id} className="flex gap-4">
          <span className="w-32 shrink-0 font-label text-xs text-stone">{time(event.createdAt)}</span>
          <span>
            {LABELS[event.type]}
            {event.imageId && names.has(event.imageId) ? ` · ${names.get(event.imageId)}` : ""}
            {event.zipPart ? ` · Teil ${event.zipPart}` : ""}
            {event.visitorName ? ` · ${event.visitorName}` : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}
```

In `src/app/admin/(protected)/galerien/[id]/page.tsx`:
- Importe ergänzen: `favoritesByVisitor` und `listEvents` in der Liste aus `@/lib/galleries/repo` sowie

```tsx
import { EventsPanel } from "./events-panel";
import { FavoritesPanel } from "./favorites-panel";
```

- Den `Promise.all`-Block ersetzen durch:

```tsx
  const [images, password, visitors, events] = await Promise.all([
    listImages(db, gallery.id),
    // Nur nach einem Wechsel von GALLERY_SECRET nicht mehr lesbar → Hinweis statt Absturz.
    revealPassword(gallerySecret(), gallery).catch(() => null),
    favoritesByVisitor(db, gallery.id),
    listEvents(db, gallery.id),
  ]);
```

- Direkt nach dem Abschnitt „Bilder“ einfügen:

```tsx
      <Section title="Favoriten">
        <FavoritesPanel galleryId={gallery.id} visitors={visitors} />
      </Section>

      <Section title="Statistik">
        <EventsPanel events={events} images={images} />
      </Section>
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 110 PASS, E2E alle grün, darunter die 3 neuen Tests.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(galleries): favorites per visitor name, admin favorites and activity timeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Cloudflare-Ressourcen, Vorschau, Produktion

**Dateien:**
- Ändern: `README.md`, `package.json` (`test:e2e:prod`)

**Schnittstellen:**
- Nutzt: alles aus Task 1–8.
- Stellt bereit:
  - Buckets `cosmo-galleries` und `cosmo-galleries-preview`
  - Secret `GALLERY_SECRET` (Vorschau und Produktion)
  - Migration 0001 remote
  - Vorschau und Produktion live

Dieser Task verändert Cloudflare und die Produktion. Laut Plan-Freigabe ist das erlaubt. Die Reihenfolge ist fest: **Ressourcen → Vorschau → abschließendes Review → Push**.

- [ ] **Schritt 1: README und Produktions-Tests**

In `README.md` unter „Deploy und Secrets“ ergänzen:

```markdown
### Kundengalerien

- Dateien liegen im **privaten** Bucket `cosmo-galleries` (Vorschau: `cosmo-galleries-preview`) – nie eine Custom Domain oder r2.dev-URL daran hängen; ausgeliefert wird nur über den Worker mit Galerie-Cookie.
- Secret `GALLERY_SECRET` (≥ 32 Zeichen) signiert die Zugangs-Cookies und verschlüsselt die Galerie-Passwörter für die Anzeige im Admin.
  **Nicht rotieren**, außer im Notfall: Danach sind alle Kunden abgemeldet und jedes Galerie-Passwort muss im Admin neu gesetzt werden.
- Originale: nur JPEG, max. 95 MB pro Datei. ZIPs werden ab 2 GB in Teile gesplittet.
```

In `package.json` das Skript `test:e2e:prod` ersetzen durch (neu: `gallery-public.spec.ts` und `|unbekannte Galerie` im Filter):

```json
"test:e2e:prod": "bash scripts/e2e-deployed.sh prod --no-deps routing.spec.ts design-system.spec.ts admin-auth.spec.ts gallery-public.spec.ts -g \"ohne Anmeldung|gefälscht|Clickjacking|Robust|Deutsch|Englisch|Spracherkennung|Nicht lokalisierte|Tokens|Schriften|unbekannte Galerie\""
```

```bash
npm run lint && npm test
git add README.md package.json
git commit -m "docs: gallery bucket, secret and production smoke test

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Erwartet: grün, Commit angelegt.

- [ ] **Schritt 2: Buckets anlegen (privat)**

```bash
npx wrangler r2 bucket create cosmo-galleries
npx wrangler r2 bucket create cosmo-galleries-preview
npx wrangler r2 bucket list | grep -E "^name:\s+cosmo-galleries"
npx wrangler r2 bucket dev-url get cosmo-galleries
npx wrangler r2 bucket dev-url get cosmo-galleries-preview
```
Erwartet:
- Beide Buckets stehen in der Liste.
- `dev-url get` meldet für beide, dass die öffentliche r2.dev-URL deaktiviert ist.
- Es gibt keine Custom Domain.

- [ ] **Schritt 3: Secret setzen (zufällig, nie angezeigt)**

```bash
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put GALLERY_SECRET --env preview
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put GALLERY_SECRET
npx wrangler secret list --env preview | grep -c GALLERY_SECRET
npx wrangler secret list | grep -c GALLERY_SECRET
```
Erwartet: jeweils `1`. Der Wert erscheint nirgends in der Ausgabe.

- [ ] **Schritt 4: Migration 0001 in Vorschau und Produktion**

Die Migration fügt nur eine Spalte mit Standardwert hinzu. Der alte Code läuft damit weiter, deshalb darf sie vor dem Deployment laufen.

```bash
CI=true npm run db:migrate:preview
CI=true npm run db:migrate:remote
```
Erwartet: jeweils `0001_gallery_password_cipher` angewandt (bzw. „No migrations to apply“ bei Wiederholung).

- [ ] **Schritt 5: Vorschau deployen und komplett testen**

```bash
npm run deploy:preview
npm run test:e2e:preview
```
Erwartet: Deployment ok, alle E2E-Tests gegen `https://cosmo-web-preview.felix-vatterodt.workers.dev` grün. Die Galerie-Tests legen dort Galerien mit dem `RUN`-Zusatz an; die dürfen liegen bleiben.

- [ ] **Schritt 6: Abschließendes Review, dann Push (= Produktion)**

Zuerst das abschließende Branch-Review laut executing-plans bzw. subagent-driven-development samt Fix-Runde. Danach:

```bash
npm run check:lock
git push origin main
U="https://cosmo-web.felix-vatterodt.workers.dev/g/gibt-es-nicht/zip"
for i in $(seq 1 60); do
  type=$(curl -s -o /dev/null -w "%{content_type}" "$U")
  case "$type" in application/json*) echo "LIVE nach ~$((i*10))s"; break ;; esac
  sleep 10
done
npm run test:e2e:prod
```
Erwartet:
- `check:lock` grün.
- Der Push löst Workers Builds aus. Die Schleife meldet `LIVE`, weil die ZIP-Route vorher eine HTML-404-Seite von Next lieferte und jetzt JSON aus dem Worker.
- `test:e2e:prod` ist grün, einschließlich „unbekannte Galerie“.

- [ ] **Schritt 7: 👤 Felix testet mit echten Fotos**

1. `https://cosmo-web.felix-vatterodt.workers.dev/admin/galerien` → Galerie anlegen, 20–50 echte JPEGs (auch große) per Ordner hochladen, Titelbild wählen, veröffentlichen.
2. „Nachricht kopieren“ → an sich selbst schicken → auf dem Handy öffnen, Passwort eingeben, Herz setzen (Name), Original und ZIP laden.
3. Im Admin Favoriten („Dateinamen kopieren“) und Statistik ansehen.
