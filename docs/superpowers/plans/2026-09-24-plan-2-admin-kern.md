# Plan 2 · Admin-Kern: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Felix kann sich unter `/admin` anmelden und dort:
- pro Kategorie Portfolio-Bilder hochladen, sortieren, ausblenden, beschriften und löschen,
- Rollen vergeben (Hero, Kapitel-Bild, Kapitel-Vorschau),
- alle Texte und Links der Website pflegen, inklusive Porträt.

**Architektur:**
- **Admin-Bereich:** eigenes Root-Layout unter `src/app/admin` (außerhalb von `[locale]`, nur Deutsch).
- **Login:** Server Action mit PBKDF2-Passwortprüfung, Rate-Limit-Binding und HMAC-signiertem Session-Cookie (`cosmo_admin`, Pfad `/admin`).
- **Bildverarbeitung im Browser:**
  - Ein Web Worker dreht nach EXIF, erzeugt 800/1600/2400 px als WebP (JPEG-Fallback) und berechnet den Farbton.
  - Die Varianten gehen per `PUT` an `/admin/api/media/…`, die Route prüft die Magic Bytes und schreibt in R2.
  - Erst danach legt `POST /admin/api/portfolio` den DB-Eintrag an; die Route prüft vorher, dass alle drei Varianten in R2 liegen.
- **Öffentliche Auslieferung** über `/media/<art>/<uuid>/<größe>` mit `immutable`-Cache. Die Custom Domain `img.cosmo-photos.de` folgt in Plan 6.
- **Fachlogik** liegt in reinen Modulen (`src/lib/…`) mit Unit-Tests in workerd. Routen und Aktionen sind dünne Hüllen, abgedeckt durch E2E-Tests.

**Tech-Stack:** wie Plan 1, zusätzlich zod 4.6.5, @dnd-kit/core 6.3.1, @dnd-kit/sortable 10.0.0 und @dnd-kit/utilities 3.2.2.

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`
- Betroffen: §3.3 (Upload-Pipeline), §3.4 (Auslieferung), §8 (Admin), §9 (`portfolio_images`, `settings`), §10 und §11.
- Offene Punkte aus Plan 1 („Review nach Abschluss“), die hier erledigt werden: Sicherheits-Header und eigenes Root-Layout für `/admin`, README.

## Planreihe

| Plan | Phase | Status |
|---|---|---|
| 1 · Fundament | Setup, Datenbank, Routing, Tokens, Deploy | ✅ erledigt |
| **2 · Admin-Kern** | Login, Upload-Pipeline, Portfolio, Texte | **dieser Plan** |
| 3 · Kundengalerien | Galerien, Passwort, Favoriten, Statistik, `zip-stream` | folgt |
| 4 · Öffentliche Seiten | Start, Kategorien, Lightbox, Über mich, Kontakt, Pflichtseiten | folgt |
| 5 · Bewegung | Intro „Orbit“, Lenis, „Licht aus“, Parallaxe, Übergänge | folgt |
| 6 · Launch | SEO, Performance, Barrierefreiheit, Domain-Umzug | folgt |

## Globale Vorgaben

- Repo: `/Volumes/CosmoDev/cosmo-website`, Branch `main`. Das Disk-Image muss eingehängt sein.
- **Abhängigkeiten nur mit `npm install --save-exact`.** Danach **immer** `npm run deps:lock` (erzeugt die Lock-Datei mit npm 10.9.2, wie der Cloudflare-Build) und `npm ci`.
- Plan-1-Regeln bleiben gültig:
  - `src/middleware.ts` (Edge) statt `proxy.ts`
  - `custom-worker.ts` bleibt `main`
  - `dynamicParams = false` im `[locale]`-Baum
  - Tests laufen in workerd bzw. gegen `opennextjs-cloudflare preview`
- **Admin nur auf Deutsch, ohne next-intl.** Admin-Seiten liegen unter `/admin`, Admin-APIs unter `/admin/api/…`, öffentliche Bilder unter `/media/<portfolio|site>/<uuid>/<800|1600|2400>`.
- Session-Cookie `cosmo_admin`: HttpOnly, Secure, SameSite=Lax, `Path=/admin`, 7 Tage (Spec §8).
- Passwort-Hash-Format `pbkdf2-sha256$<iterationen>$<salt>$<hash>` (base64url), 100 000 Iterationen.
- Login-Rate-Limit: 5 Versuche pro 60 s je IP und Benutzername (Binding `LOGIN_LIMITER`).
- **Jede Server Action und jede Admin-API-Route prüft die Anmeldung selbst.** Das Layout schützt nur die Seiten. Einzige Ausnahme: die Login-Aktion.
- Bildgrößen `800`, `1600`, `2400` (längste Kante, nie vergrößern), WebP mit Qualität 0,82 und JPEG-Fallback mit 0,85.
- Upload: max. 3 Dateien parallel, jede Variante mit bis zu 2 automatischen Wiederholungen, max. 10 MB pro Variante.
- **R2-Schlüssel ohne Dateiendung:** `portfolio/<uuid>/<größe>` und `site/<uuid>/<größe>`. Der Content-Type steht in den R2-Metadaten. Das ist eine bewusste Abweichung von Spec §9 wegen des JPEG-Fallbacks; die Spec wird in Task 1 angepasst.
- Rollen-Grenzen: 1 Kapitel-Bild pro Kategorie, max. 5 Kapitel-Vorschaubilder pro Kategorie, max. 3 Hero-Bilder insgesamt.
- **Lokale Test-Zugangsdaten** (nur `.dev.vars`, nie Produktion): Benutzer `felix`, Passwort `lokal-test-passwort`. Produktion und Vorschau bekommen eigene Secrets (Task 8).
- Commit-Messages im Conventional-Commits-Stil mit `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 👤 markiert Schritte, die Felix selbst ausführt.

## Review-Fokus

1. **Zugriff ohne oder mit gefälschter Anmeldung** auf Admin-Seiten, Admin-APIs (Upload, Anlegen, Ändern, Löschen, Sortieren) und Server Actions. Erwartung: Weiterleitung zum Login bzw. 401/403, keine Änderung. *Tests: Task 1 (`session.test.ts`), Task 2 (gefälschtes Cookie), Task 4 (`admin-api.spec.ts`: alle Routen ohne Session, fremde Origin), Task 7 (`check-server-actions`).*
2. **Missbrauch der Upload-Route:** Nicht-Bild mit Bild-Content-Type, über 10 MB, fremdes Präfix (`galleries/…`), keine UUID, falsche Größe, `..`. Erwartung: 4xx, nichts in R2. *Tests: Task 3 (`media-keys`, `sniff`), Task 4 (E2E).*
3. **Abgebrochener Upload,** z. B. nur 2 von 3 Varianten hochgeladen. Erwartung: kein DB-Eintrag, nichts öffentlich, ein neuer Versuch klappt. *Tests: Task 3 (`createImage` lehnt ab), Task 4 (E2E).*
4. **Handyfoto mit EXIF-Drehung und kleine Bilder unter 800 px.** Erwartung: aufrecht gespeichert, richtige Maße, keine Vergrößerung. *Tests: Task 5 (`targetSize`), Task 6 (EXIF-Fixture, 2400er-Variante hat Originalgröße).*
5. **Englischer Browser oder Crawler auf `/admin` oder `/media`.** Erwartung: nie lokalisiert oder umgeleitet, Admin mit `noindex` und Clickjacking-Schutz, Medien mit `immutable`-Cache. *Tests: Task 2 (Header, Matcher), Task 4 (Medien-Header).*

---

## Dateistruktur (neu bzw. geändert)

```
wrangler.jsonc                       # + vars ADMIN_USERNAME, ratelimits LOGIN_LIMITER (auch env.preview)
.dev.vars.example / .dev.vars        # + ADMIN_PASSWORD_HASH (Test), SESSION_SECRET (Test)
next.config.ts                       # + headers() für /admin
src/middleware.ts                    # + media aus dem Matcher ausnehmen
package.json                         # + Scripts deps:lock, admin:password, preview:e2e, db:migrate:e2e, test:e2e:*
README.md                            # neu geschrieben (Task 8)
scripts/hash-password.mts            # Hash aus ADMIN_PASSWORD (Node, nutzt src/lib/auth/password.ts)
scripts/set-admin-password.sh        # verdeckte Eingabe → wrangler secret put ADMIN_PASSWORD_HASH
scripts/check-server-actions.mjs     # Lint: jede "use server"-Datei ruft requireAdmin()
src/lib/auth/encoding.ts             # base64url
src/lib/auth/password.ts             # hashPassword, verifyPassword (PBKDF2)
src/lib/auth/session.ts              # createSessionToken, verifySessionToken (HMAC)
src/lib/auth/admin-config.ts         # readAdminConfig(env) (rein)
src/lib/auth/admin.ts                # isAdmin, requireAdmin, start/endAdminSession, adminApiGuard (Server)
src/lib/categories.ts                # + CATEGORY_LABELS_DE
src/lib/http.ts                      # jsonError, readJson
src/lib/media/keys.ts                # IMAGE_SIZES, MEDIA_KINDS, isUuid, mediaKey, parseMediaKey, mediaUrl
src/lib/media/sniff.ts               # sniffImageType (Magic Bytes)
src/lib/portfolio/repo.ts            # list, count, create, update, setRole, reorder, delete
src/lib/portfolio/validation.ts      # zod-Schemas der API
src/lib/settings/schema.ts           # Felder, zod-Schema, Defaults
src/lib/settings/repo.ts             # getSettings, saveSettings
src/lib/image/sizing.ts              # targetSize, averageColor (rein)
src/lib/image/process.worker.ts      # Web Worker: Drehen, Skalieren, Kodieren, Farbton
src/lib/image/process.ts             # processImage(file)
src/lib/image/upload.ts              # uploadVariants(kind, processed) mit Wiederholungen
src/app/admin/layout.tsx             # Root-Layout /admin (noindex)
src/app/admin/not-found.tsx
src/app/admin/login/{page.tsx,login-form.tsx,actions.ts}
src/app/admin/(protected)/layout.tsx # requireAdmin + Navigation
src/app/admin/(protected)/page.tsx   # Übersicht
src/app/admin/(protected)/portfolio/[category]/{page.tsx,portfolio-manager.tsx,image-card.tsx,upload-zone.tsx,portfolio-api.ts}
src/app/admin/(protected)/texte/{page.tsx,settings-form.tsx,portrait-field.tsx,actions.ts}
src/app/admin/api/media/[kind]/[id]/[size]/route.ts   # PUT Variante
src/app/admin/api/portfolio/route.ts                  # GET Liste, POST anlegen
src/app/admin/api/portfolio/[id]/route.ts             # PATCH, DELETE
src/app/admin/api/portfolio/order/route.ts            # PUT Reihenfolge
src/app/media/[...key]/route.ts                       # GET öffentlich
test/unit/{password,session,admin-config,media-keys,sniff,portfolio-repo,image-sizing,settings-repo}.test.ts
test/e2e/helpers/{admin.ts,images.ts}
test/e2e/{admin-auth,admin-api,admin-portfolio,admin-settings}.spec.ts
test/e2e/routing.spec.ts             # angepasst (/admin hat jetzt Seiten)
```

---

### Task 1: Auth-Kern (Passwort, Session, Konfiguration, Hilfsskripte)

**Dateien:**
- Erstellen:
  - `src/lib/auth/encoding.ts`, `src/lib/auth/password.ts`, `src/lib/auth/session.ts`, `src/lib/auth/admin-config.ts`
  - `scripts/hash-password.mts`, `scripts/set-admin-password.sh`
  - `test/unit/password.test.ts`, `test/unit/session.test.ts`, `test/unit/admin-config.test.ts`
- Ändern: `tsconfig.json`, `wrangler.jsonc`, `.dev.vars.example`, `.dev.vars`, `package.json`, `cloudflare-env.d.ts`, `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`

**Schnittstellen:**
- Stellt bereit:
  - `toBase64Url(bytes)`, `fromBase64Url(s): Uint8Array<ArrayBuffer>`
  - `hashPassword(pw): Promise<string>`, `verifyPassword(pw, stored): Promise<boolean>`
  - `SESSION_TTL_SECONDS`, `createSessionToken(secret, nowSeconds, ttl?)`, `verifySessionToken(token | undefined, secret, nowSeconds): Promise<boolean>`
  - `readAdminConfig(env): { username, passwordHash, sessionSecret }`
  - Scripts `deps:lock`, `admin:password`
  - Env: `ADMIN_USERNAME` (var), `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` (Secrets), `LOGIN_LIMITER` (Rate-Limit-Binding)

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import devVars from "../../.dev.vars.example?raw";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing (PBKDF2)", () => {
  it("produces the documented format with a fresh salt each time", async () => {
    const a = await hashPassword("ein-langes-passwort");
    const b = await hashPassword("ein-langes-passwort");
    expect(a).toMatch(/^pbkdf2-sha256\$100000\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });

  it("verifies the right password and rejects wrong ones", async () => {
    const stored = await hashPassword("richtig-und-lang");
    expect(await verifyPassword("richtig-und-lang", stored)).toBe(true);
    expect(await verifyPassword("falsch-und-lang", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("rejects malformed or tampered hashes instead of throwing", async () => {
    const stored = await hashPassword("richtig-und-lang");
    const [, , salt, hash] = stored.split("$");
    for (const bad of [
      "",
      "kaputt",
      `pbkdf2-sha1$100000$${salt}$${hash}`,
      `pbkdf2-sha256$abc$${salt}$${hash}`,
      `pbkdf2-sha256$1000000$${salt}$${hash}`,
      `pbkdf2-sha256$100000$!!!$${hash}`,
      `pbkdf2-sha256$100000$${salt}$${hash}x`,
    ]) {
      expect(await verifyPassword("richtig-und-lang", bad), bad).toBe(false);
    }
  });

  it("verifies the local test hash that scripts/hash-password.mts wrote into .dev.vars.example", async () => {
    const line = devVars.split("\n").find((l) => l.startsWith("ADMIN_PASSWORD_HASH="));
    expect(line).toBeDefined();
    expect(await verifyPassword("lokal-test-passwort", line!.slice("ADMIN_PASSWORD_HASH=".length).trim())).toBe(true);
  });
});
```

`test/unit/session.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "@/lib/auth/session";

const SECRET = "test-secret-mit-mindestens-32-zeichen!!";
const NOW = 1_800_000_000;

describe("admin session tokens", () => {
  it("lasts 7 days", () => {
    expect(SESSION_TTL_SECONDS).toBe(7 * 24 * 60 * 60);
  });

  it("verifies a fresh token until it expires", async () => {
    const token = await createSessionToken(SECRET, NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(true);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS - 1)).toBe(true);
    expect(await verifySessionToken(token, SECRET, NOW + SESSION_TTL_SECONDS)).toBe(false);
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await createSessionToken("anderes-secret-mit-mindestens-32-zeichen", NOW);
    expect(await verifySessionToken(token, SECRET, NOW)).toBe(false);
  });

  it("rejects a token whose payload was changed (e.g. extended expiry)", async () => {
    const token = await createSessionToken(SECRET, NOW);
    const [, sig] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ sub: "admin", exp: NOW + 10 ** 9 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await verifySessionToken(`${forgedBody}.${sig}`, SECRET, NOW)).toBe(false);
  });

  it("rejects garbage without throwing", async () => {
    for (const bad of [undefined, "", "abc", "a.b.c", "!!!.???", "e30.e30"]) {
      expect(await verifySessionToken(bad, SECRET, NOW), String(bad)).toBe(false);
    }
  });
});
```

`test/unit/admin-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { readAdminConfig } from "@/lib/auth/admin-config";

const OK = {
  ADMIN_USERNAME: "felix",
  ADMIN_PASSWORD_HASH: "pbkdf2-sha256$100000$a$b",
  SESSION_SECRET: "x".repeat(32),
};

describe("readAdminConfig", () => {
  it("returns the admin settings", () => {
    expect(readAdminConfig(OK)).toEqual({ username: "felix", passwordHash: OK.ADMIN_PASSWORD_HASH, sessionSecret: OK.SESSION_SECRET });
  });

  it("names every missing value and how to set it", () => {
    expect(() => readAdminConfig({ ADMIN_USERNAME: "felix" })).toThrow(
      'Admin-Konfiguration fehlt: ADMIN_PASSWORD_HASH, SESSION_SECRET – als Variable in wrangler.jsonc bzw. per "wrangler secret put" setzen.',
    );
  });

  it("rejects a session secret shorter than 32 characters", () => {
    expect(() => readAdminConfig({ ...OK, SESSION_SECRET: "zu-kurz" })).toThrow("SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  });
});
```

- [ ] **Schritt 2: Tests laufen lassen, sie müssen fehlschlagen**

```bash
npm test
```
Erwartet: FAIL, die drei neuen Dateien melden „Cannot find package '@/lib/auth/…'“. Die 15 bestehenden Tests bleiben grün.

- [ ] **Schritt 3: Implementieren**

In `tsconfig.json` unter `compilerOptions` ergänzen (nötig, damit Node das Hash-Skript mit expliziten `.ts`-Importen laden kann):

```json
"allowImportingTsExtensions": true
```

`src/lib/auth/encoding.ts`:

```ts
export function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of u8) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Wirft bei ungültigen Zeichen (atob). */
export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
```

`src/lib/auth/password.ts` (die Importe mit `.ts`-Endung sind nötig, damit auch Node das Skript ausführen kann):

```ts
import { fromBase64Url, toBase64Url } from "./encoding.ts";

const PREFIX = "pbkdf2-sha256";
/** Obergrenze für PBKDF2 in Cloudflare Workers. */
const ITERATIONS = 100_000;

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

/** Format: pbkdf2-sha256$<iterationen>$<salt>$<hash> (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== PREFIX) return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > ITERATIONS) return false;
  let salt: Uint8Array<ArrayBuffer>;
  let expected: Uint8Array<ArrayBuffer>;
  try {
    salt = fromBase64Url(parts[2]);
    expected = fromBase64Url(parts[3]);
  } catch {
    return false;
  }
  if (expected.length !== 32) return false;
  return timingSafeEqual(await derive(password, salt, iterations), expected);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
```

`src/lib/auth/session.ts`:

```ts
import { fromBase64Url, toBase64Url } from "./encoding.ts";

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

type Payload = { sub: "admin"; exp: number };
const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Token: base64url(JSON-Payload).base64url(HMAC-SHA256). */
export async function createSessionToken(secret: string, nowSeconds: number, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  const payload: Payload = { sub: "admin", exp: nowSeconds + ttlSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(body));
  return `${body}.${toBase64Url(signature)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, nowSeconds: number): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const [body, signature] = parts;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Partial<Payload>;
    return payload.sub === "admin" && typeof payload.exp === "number" && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}
```

`src/lib/auth/admin-config.ts`:

```ts
export type AdminConfig = { username: string; passwordHash: string; sessionSecret: string };

const KEYS = ["ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "SESSION_SECRET"] as const;

/** Liest die Admin-Konfiguration aus der Worker-Umgebung, mit verständlichen Fehlern. */
export function readAdminConfig(env: Partial<Record<(typeof KEYS)[number], unknown>>): AdminConfig {
  const missing = KEYS.filter((key) => typeof env[key] !== "string" || env[key] === "");
  if (missing.length > 0) {
    throw new Error(
      `Admin-Konfiguration fehlt: ${missing.join(", ")} – als Variable in wrangler.jsonc bzw. per "wrangler secret put" setzen.`,
    );
  }
  const sessionSecret = env.SESSION_SECRET as string;
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET muss mindestens 32 Zeichen lang sein.");
  return { username: env.ADMIN_USERNAME as string, passwordHash: env.ADMIN_PASSWORD_HASH as string, sessionSecret };
}
```

`scripts/hash-password.mts`:

```ts
// Gibt einen Admin-Passwort-Hash aus. Das Passwort kommt aus ADMIN_PASSWORD (nicht als Argument,
// damit es nicht in der Shell-History landet).
import { hashPassword } from "../src/lib/auth/password.ts";

const password = process.env.ADMIN_PASSWORD ?? "";
if (password.length < 12) {
  console.error("Das Passwort muss mindestens 12 Zeichen haben.");
  process.exit(1);
}
process.stdout.write(await hashPassword(password));
```

`scripts/set-admin-password.sh`:

```bash
#!/usr/bin/env bash
# Setzt ADMIN_PASSWORD_HASH als Cloudflare-Secret. Weitere Argumente gehen an wrangler (z. B. --env=preview).
set -euo pipefail
read -r -s -p "Neues Admin-Passwort (mind. 12 Zeichen): " PW; echo
read -r -s -p "Wiederholen: " PW2; echo
[ "$PW" = "$PW2" ] || { echo "Die Passwörter stimmen nicht überein." >&2; exit 1; }
HASH=$(ADMIN_PASSWORD="$PW" node scripts/hash-password.mts)
printf '%s' "$HASH" | npx wrangler secret put ADMIN_PASSWORD_HASH "$@"
echo "ADMIN_PASSWORD_HASH gesetzt."
```

Scripts in `package.json` ergänzen:

```json
"deps:lock": "npx -y npm@10.9.2 install --package-lock-only --ignore-scripts && npm run check:lock",
"admin:password": "bash scripts/set-admin-password.sh"
```

- [ ] **Schritt 4: Lokale Test-Secrets und Worker-Konfiguration**

```bash
ADMIN_PASSWORD=lokal-test-passwort node scripts/hash-password.mts; echo
```
Erwartet: eine Zeile `pbkdf2-sha256$100000$…$…`, eventuell mit einer Warnung zum Modultyp. Diesen Hash in `.dev.vars.example` eintragen, sodass die Datei so aussieht:

```
# Lädt .env.development* bei `wrangler dev`
NEXTJS_ENV=development
# Nur lokal und für Tests: Benutzer "felix", Passwort "lokal-test-passwort". Nie in Produktion verwenden.
ADMIN_PASSWORD_HASH=<Hash aus dem Befehl oben>
SESSION_SECRET=lokal-nur-zum-testen-und-mindestens-32-zeichen-lang
```

```bash
cp .dev.vars.example .dev.vars
```

In `wrangler.jsonc` auf oberster Ebene ergänzen:

```jsonc
"vars": { "ADMIN_USERNAME": "felix" },
"ratelimits": [
  { "name": "LOGIN_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }
]
```

und im Block `env.preview` (Vars und Bindings werden nicht vererbt):

```jsonc
"vars": { "ADMIN_USERNAME": "felix" },
"ratelimits": [
  { "name": "LOGIN_LIMITER", "namespace_id": "1002", "simple": { "limit": 5, "period": 60 } }
]
```

```bash
npm run cf-typegen
grep -E "ADMIN_USERNAME|ADMIN_PASSWORD_HASH|SESSION_SECRET|LOGIN_LIMITER" cloudflare-env.d.ts
```
Erwartet: Alle vier Namen stehen in den Typen.

- [ ] **Schritt 5: Spec an die Schlüssel ohne Endung anpassen**

In `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`:
- §3.3, Schritt 2: „als WebP-Versionen“ ergänzen um „(JPEG, falls der Browser kein WebP kodieren kann)“.
- §9, R2-Schlüssel ersetzen durch:

```
- `portfolio/<id>/{800,1600,2400}` und `site/<id>/{800,1600,2400}` (Content-Type in den R2-Metadaten: WebP, sonst JPEG)
- `galleries/<galleryId>/<imageId>/{original,thumb,preview}`
```

- §5.1 „Offen: PHOTOS muss als Pfade geliefert werden“ ersetzen durch „Erledigt: `brand/logo-lockup.svg` (PHOTOS aus Industry Book in Pfade umgewandelt), `brand/logo-wordmark.svg`.“
- §13, Punkt 1: „(offen)“ ersetzen durch „(✓ `brand/logo-lockup.svg`)“.

- [ ] **Schritt 6: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test
```
Erwartet: 7 Testdateien, 27 Tests, alle PASS. Bestehen alle PBKDF2-Tests, sind die 100 000 Iterationen in workerd erlaubt.

- [ ] **Schritt 7: Commit**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat(auth): PBKDF2 passwords, signed admin sessions and admin config

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Admin-Bereich mit Login, Schutz und Sicherheits-Headern

**Dateien:**
- Erstellen:
  - `src/lib/auth/admin.ts`
  - `src/app/admin/layout.tsx`, `src/app/admin/not-found.tsx`
  - `src/app/admin/login/page.tsx`, `src/app/admin/login/login-form.tsx`, `src/app/admin/login/actions.ts`
  - `src/app/admin/(protected)/layout.tsx`, `src/app/admin/(protected)/page.tsx`
  - `test/e2e/helpers/admin.ts`, `test/e2e/admin-auth.spec.ts`
- Ändern: `src/lib/categories.ts`, `test/unit/categories.test.ts`, `next.config.ts`, `src/middleware.ts`, `package.json`, `playwright.config.ts`, `test/e2e/routing.spec.ts`

**Schnittstellen:**
- Nutzt: Task 1 (`readAdminConfig`, `createSessionToken`, `verifySessionToken`, `verifyPassword`, `SESSION_TTL_SECONDS`).
- Stellt bereit:
  - `ADMIN_COOKIE`, `adminConfig()`, `isAdmin()`, `requireAdmin()`, `startAdminSession()`, `endAdminSession()`, `adminApiGuard(request): Promise<Response | null>`
  - `CATEGORY_LABELS_DE: Record<Category, string>`
  - E2E-Helfer `ADMIN`, `loginAsAdmin(page)`
  - Script `preview:e2e` (frische Datenbank je Testlauf)

- [ ] **Schritt 1: Deutsche Kategorie-Namen, Test zuerst**

In `test/unit/categories.test.ts` im `describe` ergänzen:

```ts
  it("has a German admin label for every category", () => {
    expect(CATEGORY_LABELS_DE).toEqual({
      floorball: "Floorball",
      volleyball: "Volleyball",
      fussball: "Fußball",
      hochzeiten: "Hochzeiten",
      studio: "Studio",
    });
  });
```
und den Import auf `import { CATEGORIES, CATEGORY_LABELS_DE, isCategory } from "@/lib/categories";` ändern.

```bash
npm test
```
Erwartet: FAIL (`CATEGORY_LABELS_DE` ist undefined).

In `src/lib/categories.ts` ergänzen:

```ts
/** Deutsche Namen für den Admin (die öffentliche Seite nutzt next-intl). */
export const CATEGORY_LABELS_DE: Record<Category, string> = {
  floorball: "Floorball",
  volleyball: "Volleyball",
  fussball: "Fußball",
  hochzeiten: "Hochzeiten",
  studio: "Studio",
};
```

```bash
npm test
```
Erwartet: 28 Tests PASS.

- [ ] **Schritt 2: E2E-Tests mit frischer Datenbank vorbereiten**

Scripts in `package.json` ergänzen:

```json
"db:migrate:e2e": "wrangler d1 migrations apply DB --local --persist-to .wrangler/e2e-state",
"preview:e2e": "opennextjs-cloudflare build && npm run clean:dot && rm -rf .wrangler/e2e-state && CI=true npm run db:migrate:e2e && ([ -f .dev.vars ] || cp .dev.vars.example .dev.vars) && opennextjs-cloudflare preview --persist-to .wrangler/e2e-state"
```

In `playwright.config.ts` bei `webServer` den Befehl `"npm run preview"` durch `"npm run preview:e2e"` ersetzen.

`test/e2e/helpers/admin.ts`:

```ts
import { expect, type Page } from "@playwright/test";

/** Lokal aus .dev.vars; gegen Deployments per Umgebungsvariable (Task 8). */
export const ADMIN = {
  username: process.env.E2E_ADMIN_USER ?? "felix",
  password: process.env.E2E_ADMIN_PASSWORD ?? "lokal-test-passwort",
};

export async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort").fill(ADMIN.password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
```

- [ ] **Schritt 3: Fehlschlagende E2E-Tests schreiben**

`test/e2e/admin-auth.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { ADMIN, loginAsAdmin } from "./helpers/admin";

test("ohne Anmeldung führt jede Admin-Seite zum Login", async ({ page }) => {
  for (const path of ["/admin", "/admin/portfolio/floorball", "/admin/texte"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/admin\/login$/);
  }
});

test("gefälschtes Session-Cookie wird abgelehnt", async ({ page, context, baseURL }) => {
  const url = new URL(baseURL!);
  await context.addCookies([
    { name: "cosmo_admin", value: "eyJzdWIiOiJhZG1pbiIsImV4cCI6OTk5OTk5OTk5OX0.ZmFrZQ", domain: url.hostname, path: "/admin", secure: url.protocol === "https:", httpOnly: true, sameSite: "Lax" },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("falsches Passwort zeigt einen Fehler", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Benutzername").fill(ADMIN.username);
  await page.getByLabel("Passwort").fill("falsches-passwort-123");
  await page.getByRole("button", { name: "Anmelden" }).click();
  await expect(page.getByRole("alert")).toHaveText("Benutzername oder Passwort falsch.");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("Anmelden, Cookie-Eigenschaften, Abmelden", async ({ page, context }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Übersicht");

  const cookie = (await context.cookies()).find((c) => c.name === "cosmo_admin");
  expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: "Lax", path: "/admin" });

  await page.getByRole("button", { name: "Abmelden" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("zu viele Fehlversuche werden gebremst", async ({ page }) => {
  await page.goto("/admin/login");
  for (let i = 0; i < 7; i++) {
    await page.getByLabel("Benutzername").fill("angreifer");
    await page.getByLabel("Passwort").fill(`versuch-nummer-${i}`);
    await page.getByRole("button", { name: "Anmelden" }).click();
    // Während der Prüfung heißt der Button „Prüfe …“ – warten, bis die Antwort da ist.
    await expect(page.getByRole("button", { name: "Anmelden" })).toBeEnabled();
  }
  await expect(page.getByRole("alert")).toHaveText("Zu viele Versuche. Bitte eine Minute warten.");
});

test("Admin hat Clickjacking-Schutz, nosniff und noindex", async ({ request }) => {
  const res = await request.get("/admin/login");
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("same-origin");
  expect(h["x-robots-tag"]).toBe("noindex, nofollow");
});
```

In `test/e2e/routing.spec.ts`:
- Den Test „/admin und /g/… werden nie umgeleitet“ ersetzen durch:

```ts
  test("/admin, /g/… und /media/… werden nie lokalisiert", async ({ page }) => {
    const cases = [
      ["/admin/login", 200],
      ["/g/test-galerie", 404],
      ["/media/portfolio/00000000-0000-4000-8000-000000000000/800", 404],
    ] as const;
    for (const [path, status] of cases) {
      const res = await page.goto(path);
      expect(pathOf(page.url()), path).toBe(path);
      expect(res?.status(), path).toBe(status);
    }
  });
```

- Im Test „unbekannte Seiten außerhalb der Sprachen zeigen die gestaltete 404-Seite“ die Pfadliste ersetzen durch `["/admin/gibts-nicht", "/g/vertippt", "/api/x"]`.

```bash
npm run test:e2e -- admin-auth.spec.ts routing.spec.ts
```
Erwartet: FAIL. Die Admin-Tests scheitern, weil `/admin/login` noch nicht existiert (404), der neue Routing-Test ebenso.

- [ ] **Schritt 4: Server-Helfer für die Anmeldung**

`src/lib/auth/admin.ts`:

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { readAdminConfig, type AdminConfig } from "./admin-config";
import { SESSION_TTL_SECONDS, createSessionToken, verifySessionToken } from "./session";

export const ADMIN_COOKIE = "cosmo_admin";
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax", path: "/admin" } as const;
const nowSeconds = () => Math.floor(Date.now() / 1000);

export function adminConfig(): AdminConfig {
  return readAdminConfig(getCloudflareContext().env);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifySessionToken(token, adminConfig().sessionSecret, nowSeconds());
}

/** Für Seiten und Server Actions: ohne gültige Session zum Login. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function startAdminSession(): Promise<void> {
  const token = await createSessionToken(adminConfig().sessionSecret, nowSeconds());
  (await cookies()).set(ADMIN_COOKIE, token, { ...COOKIE_OPTIONS, maxAge: SESSION_TTL_SECONDS });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 });
}

/** Für Admin-API-Routen: gibt eine Fehlerantwort zurück oder null, wenn alles passt. */
export async function adminApiGuard(request: Request): Promise<Response | null> {
  const origin = request.headers.get("origin");
  if (origin !== null && !sameHost(origin, request.url)) {
    return Response.json({ error: "Anfrage von fremder Herkunft." }, { status: 403 });
  }
  if (!(await isAdmin())) return Response.json({ error: "Nicht angemeldet." }, { status: 401 });
  return null;
}

function sameHost(origin: string, url: string): boolean {
  try {
    return new URL(origin).host === new URL(url).host;
  } catch {
    return false;
  }
}
```

- [ ] **Schritt 5: Admin-Layout, Login und geschützter Bereich**

`src/app/admin/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/app/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Admin · Cosmo Photos", template: "%s · Admin · Cosmo Photos" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={fontVariables}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
```

`src/app/admin/not-found.tsx`:

```tsx
import Link from "next/link";

export default function AdminNotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p>404 · Seite nicht gefunden / Page not found</p>
        <p className="mt-6 text-sm">
          <Link href="/admin" className="underline">Zur Admin-Übersicht</Link>
        </p>
      </div>
    </main>
  );
}
```

`src/app/admin/login/actions.ts`:

```ts
"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { adminConfig, endAdminSession, startAdminSession } from "@/lib/auth/admin";
import { verifyPassword } from "@/lib/auth/password";

export type LoginState = { error?: string };

// Einzige Server Action ohne requireAdmin(): Sie erzeugt die Anmeldung (siehe scripts/check-server-actions.mjs).
export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const ip = (await headers()).get("cf-connecting-ip") ?? "lokal";
  const { success } = await getCloudflareContext().env.LOGIN_LIMITER.limit({ key: `admin-login:${ip}:${username.toLowerCase()}` });
  if (!success) return { error: "Zu viele Versuche. Bitte eine Minute warten." };

  const config = adminConfig();
  // Passwort immer prüfen, damit die Antwortzeit nicht verrät, ob der Benutzername stimmt.
  const passwordOk = await verifyPassword(password, config.passwordHash);
  if (!passwordOk || username !== config.username) return { error: "Benutzername oder Passwort falsch." };

  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}
```

`src/app/admin/login/login-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const input = "mt-1 block w-full border-b border-ink/30 bg-transparent py-2 outline-none focus:border-ink";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="mt-8 space-y-5">
      <label className="block text-sm">
        Benutzername
        <input name="username" autoComplete="username" required className={input} />
      </label>
      <label className="block text-sm">
        Passwort
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-signal">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="w-full bg-ink py-3 text-paper disabled:opacity-60">
        {pending ? "Prüfe …" : "Anmelden"}
      </button>
    </form>
  );
}
```

`src/app/admin/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth/admin";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm">
        <p className="font-label text-xs text-stone">Cosmo Photos</p>
        <h1 className="font-display mt-3 text-5xl">Anmelden</h1>
        <LoginForm />
      </div>
    </main>
  );
}
```

`src/app/admin/(protected)/layout.tsx`:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/admin/login/actions";
import { requireAdmin } from "@/lib/auth/admin";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="grid min-h-dvh md:grid-cols-[14rem_1fr]">
      <nav aria-label="Admin" className="border-b border-ink/10 p-6 md:border-b-0 md:border-r">
        <p className="font-label text-xs text-stone">Cosmo Admin</p>
        <ul className="mt-6 space-y-2 text-sm">
          <li><Link href="/admin">Übersicht</Link></li>
          {CATEGORIES.map((category) => (
            <li key={category}>
              <Link href={`/admin/portfolio/${category}`}>{CATEGORY_LABELS_DE[category]}</Link>
            </li>
          ))}
          <li><Link href="/admin/texte">Texte &amp; Links</Link></li>
          <li className="text-stone">Galerien (folgt)</li>
        </ul>
        <form action={logout} className="mt-10">
          <button type="submit" className="text-sm underline">Abmelden</button>
        </form>
      </nav>
      <main className="p-6 md:p-10">{children}</main>
    </div>
  );
}
```

`src/app/admin/(protected)/page.tsx` (Task 6 ergänzt die Zähler):

```tsx
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-5xl">Übersicht</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link href={`/admin/portfolio/${category}`} className="block bg-mat p-6">
              <span className="font-sport text-4xl">{CATEGORY_LABELS_DE[category]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Schritt 6: Sicherheits-Header und Matcher**

In `next.config.ts` im Objekt `nextConfig` ergänzen:

```ts
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
    ];
  },
```

In `src/middleware.ts` den Matcher ersetzen durch:

```ts
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, /media (Bilder), Next-Interna und Dateien mit Endung.
  matcher: ["/((?!api(?:/|$)|g(?:/|$)|admin(?:/|$)|media(?:/|$)|_next|_vercel|.*\\..*).*)"],
```

- [ ] **Schritt 7: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 28 PASS, E2E 22 PASS (16 aus Plan 1, 6 neue).

Falls `/admin/gibts-nicht` nicht den 404-Text zeigt: Das Admin-Root-Layout verdeckt `global-not-found`. `src/app/admin/not-found.tsx` fängt das ab, weil es denselben Text zeigt. Prüfen, dass die Datei existiert.

Falls `opennextjs-cloudflare preview --persist-to` den Schalter nicht an Wrangler durchreicht (Symptom: Daten bleiben zwischen Läufen erhalten): In `preview:e2e` den letzten Teil ersetzen durch `npx wrangler dev --port 8787 --persist-to .wrangler/e2e-state`. Das als Ruling vermerken.

- [ ] **Schritt 8: Commit**

```bash
git add -A
git commit -m "feat(admin): login with rate limit, protected area and security headers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Medien-Schlüssel, Bildprüfung und Portfolio-Repository

**Dateien:**
- Erstellen:
  - `src/lib/media/keys.ts`, `src/lib/media/sniff.ts`, `src/lib/portfolio/repo.ts`
  - `test/unit/media-keys.test.ts`, `test/unit/sniff.test.ts`, `test/unit/portfolio-repo.test.ts`

**Schnittstellen:**
- Nutzt: `createDb`, `Db`, `portfolioImages` (Plan 1), `Category`, `CATEGORIES`.
- Stellt bereit:
  - `IMAGE_SIZES = [800, 1600, 2400]`, `type ImageSize`, `MEDIA_KINDS = ["portfolio", "site"]`, `type MediaKind`
  - `isUuid(v)`, `isImageSize(n)`, `isMediaKind(v)`, `mediaKey(kind, id, size)`, `parseMediaKey(segments): string | null`, `mediaUrl(kind, id, size)`
  - `sniffImageType(bytes): "image/webp" | "image/jpeg" | null`
  - `type PortfolioImage`, `type PortfolioRole`, `MAX_HERO = 3`, `MAX_CHAPTER_PREVIEW = 5`, `class PortfolioError { status: 400 | 404 }`
  - `listByCategory(db, category)`, `countByCategory(db)`, `createImage(db, media, input)`, `updateImage(db, id, patch)`, `setRole(db, id, role | null)`, `reorder(db, category, ids)`, `deleteImage(db, media, id)`

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/media-keys.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { IMAGE_SIZES, isUuid, mediaKey, mediaUrl, parseMediaKey } from "@/lib/media/keys";

const ID = "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d";

describe("media keys", () => {
  it("defines the three image sizes", () => {
    expect(IMAGE_SIZES).toEqual([800, 1600, 2400]);
  });

  it("builds keys and public URLs without file extension", () => {
    expect(mediaKey("portfolio", ID, 1600)).toBe(`portfolio/${ID}/1600`);
    expect(mediaUrl("site", ID, 800)).toBe(`/media/site/${ID}/800`);
  });

  it("accepts only lowercase v1–v8 UUIDs", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(ID.toUpperCase())).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid(`${ID}/../x`)).toBe(false);
  });

  it("maps valid public URL segments to R2 keys", () => {
    expect(parseMediaKey(["portfolio", ID, "800"])).toBe(`portfolio/${ID}/800`);
    expect(parseMediaKey(["site", ID, "2400"])).toBe(`site/${ID}/2400`);
  });

  it("never exposes private or unexpected keys", () => {
    for (const segments of [
      ["galleries", ID, "800"],
      ["portfolio", ID, "900"],
      ["portfolio", ID, "0800"],
      ["portfolio", ID, "800.webp"],
      ["portfolio", "..", "800"],
      ["portfolio", ID],
      ["portfolio", ID, "800", "extra"],
      [],
    ]) {
      expect(parseMediaKey(segments), segments.join("/")).toBeNull();
    }
  });
});
```

`test/unit/sniff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/media/sniff";

const bytes = (...values: (number | string)[]) =>
  new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));

describe("sniffImageType", () => {
  it("recognises WebP and JPEG by their magic bytes", () => {
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WEBPVP8 "))).toBe("image/webp");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("rejects everything else", () => {
    expect(sniffImageType(bytes("<html>hello</html>"))).toBeNull();
    expect(sniffImageType(bytes(0x89, "PNG", 0x0d, 0x0a))).toBeNull();
    expect(sniffImageType(bytes("RIFF", 0, 0, 0, 0, "WAVEfmt "))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});
```

`test/unit/portfolio-repo.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { IMAGE_SIZES, mediaKey } from "@/lib/media/keys";
import {
  MAX_CHAPTER_PREVIEW,
  MAX_HERO,
  PortfolioError,
  countByCategory,
  createImage,
  deleteImage,
  listByCategory,
  reorder,
  setRole,
  updateImage,
} from "@/lib/portfolio/repo";
import type { Category } from "@/lib/categories";

const db = () => createDb(env.DB);

async function uploadVariants(id: string, sizes = IMAGE_SIZES) {
  for (const size of sizes) {
    await env.MEDIA.put(mediaKey("portfolio", id, size), new Uint8Array([0xff, 0xd8, 0xff]), { httpMetadata: { contentType: "image/jpeg" } });
  }
}

async function addImage(category: Category = "floorball") {
  const id = crypto.randomUUID();
  await uploadVariants(id);
  return createImage(db(), env.MEDIA, { id, category, width: 3000, height: 2000, color: "#123456" });
}

beforeEach(async () => {
  await db().delete(portfolioImages);
});

describe("portfolio repository", () => {
  it("appends new images at the end of their category", async () => {
    const a = await addImage();
    const b = await addImage();
    const other = await addImage("studio");
    expect([a.sort, b.sort, other.sort]).toEqual([0, 1, 0]);
    expect(a).toMatchObject({ category: "floorball", width: 3000, height: 2000, color: "#123456", visible: true, role: null });
    expect((await listByCategory(db(), "floorball")).map((i) => i.id)).toEqual([a.id, b.id]);
  });

  it("refuses to create an image when a size is missing in R2 (interrupted upload)", async () => {
    const id = crypto.randomUUID();
    await uploadVariants(id, [800, 1600]);
    await expect(createImage(db(), env.MEDIA, { id, category: "floorball", width: 10, height: 10, color: "#000000" })).rejects.toThrow(
      "Upload unvollständig: nicht alle Bildgrößen sind vorhanden.",
    );
    expect(await listByCategory(db(), "floorball")).toHaveLength(0);
  });

  it("counts total and visible images per category", async () => {
    const a = await addImage();
    await addImage();
    await updateImage(db(), a.id, { visible: false });
    const counts = await countByCategory(db());
    expect(counts.floorball).toEqual({ total: 2, visible: 1 });
    expect(counts.studio).toEqual({ total: 0, visible: 0 });
  });

  it("updates visibility and alt texts, and reports unknown ids", async () => {
    const a = await addImage();
    const updated = await updateImage(db(), a.id, { visible: false, altDe: "Einlauf", altEn: "Walk-on" });
    expect(updated).toMatchObject({ visible: false, altDe: "Einlauf", altEn: "Walk-on" });
    await expect(updateImage(db(), crypto.randomUUID(), { visible: true })).rejects.toMatchObject({ status: 404 });
  });

  it("reorders a category and rejects incomplete or foreign id lists", async () => {
    const a = await addImage();
    const b = await addImage();
    const c = await addImage();
    await reorder(db(), "floorball", [c.id, a.id, b.id]);
    expect((await listByCategory(db(), "floorball")).map((i) => i.id)).toEqual([c.id, a.id, b.id]);

    const stranger = await addImage("studio");
    for (const ids of [[a.id, b.id], [a.id, b.id, c.id, c.id], [a.id, b.id, stranger.id]]) {
      await expect(reorder(db(), "floorball", ids)).rejects.toBeInstanceOf(PortfolioError);
    }
  });

  it("keeps exactly one chapter image per category", async () => {
    const a = await addImage();
    const b = await addImage();
    const studio = await addImage("studio");
    await setRole(db(), a.id, "chapter");
    await setRole(db(), studio.id, "chapter");
    await setRole(db(), b.id, "chapter");
    const roles = Object.fromEntries((await db().select().from(portfolioImages)).map((i) => [i.id, i.role]));
    expect(roles).toEqual({ [a.id]: null, [b.id]: "chapter", [studio.id]: "chapter" });
  });

  it(`allows at most ${MAX_HERO} hero images across all categories`, async () => {
    const images = [await addImage("floorball"), await addImage("studio"), await addImage("fussball"), await addImage("volleyball")];
    for (const image of images.slice(0, MAX_HERO)) await setRole(db(), image.id, "hero");
    await expect(setRole(db(), images[3].id, "hero")).rejects.toThrow(`Maximal ${MAX_HERO} Hero-Bilder.`);
    await expect(setRole(db(), images[0].id, "hero")).resolves.toMatchObject({ role: "hero" });
  });

  it(`allows at most ${MAX_CHAPTER_PREVIEW} chapter previews per category`, async () => {
    const images = [];
    for (let i = 0; i <= MAX_CHAPTER_PREVIEW; i++) images.push(await addImage());
    for (const image of images.slice(0, MAX_CHAPTER_PREVIEW)) await setRole(db(), image.id, "chapter_preview");
    await expect(setRole(db(), images[MAX_CHAPTER_PREVIEW].id, "chapter_preview")).rejects.toThrow(
      `Maximal ${MAX_CHAPTER_PREVIEW} Kapitel-Vorschaubilder pro Kategorie.`,
    );
    const other = await addImage("studio");
    await expect(setRole(db(), other.id, "chapter_preview")).resolves.toMatchObject({ role: "chapter_preview" });
  });

  it("clears a role with null", async () => {
    const a = await addImage();
    await setRole(db(), a.id, "hero");
    expect(await setRole(db(), a.id, null)).toMatchObject({ role: null });
  });

  it("deletes the row and all three sizes in R2", async () => {
    const a = await addImage();
    await deleteImage(db(), env.MEDIA, a.id);
    expect(await db().select().from(portfolioImages).where(eq(portfolioImages.id, a.id))).toHaveLength(0);
    for (const size of IMAGE_SIZES) expect(await env.MEDIA.head(mediaKey("portfolio", a.id, size))).toBeNull();
    await expect(deleteImage(db(), env.MEDIA, a.id)).rejects.toMatchObject({ status: 404 });
  });
});
```

- [ ] **Schritt 2: Tests laufen lassen, sie müssen fehlschlagen**

```bash
npm test
```
Erwartet: FAIL, die drei neuen Dateien können `@/lib/media/…` bzw. `@/lib/portfolio/repo` nicht auflösen.

- [ ] **Schritt 3: Implementieren**

`src/lib/media/keys.ts`:

```ts
export const IMAGE_SIZES = [800, 1600, 2400] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Öffentlich auslieferbare Bereiche. Kundengalerien (galleries/…) sind bewusst NICHT dabei. */
export const MEDIA_KINDS = ["portfolio", "site"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export const isUuid = (value: string) => UUID.test(value);
export const isImageSize = (value: number): value is ImageSize => (IMAGE_SIZES as readonly number[]).includes(value);
export const isMediaKind = (value: string): value is MediaKind => (MEDIA_KINDS as readonly string[]).includes(value);

export function mediaKey(kind: MediaKind, id: string, size: ImageSize): string {
  return `${kind}/${id}/${size}`;
}

export function mediaUrl(kind: MediaKind, id: string, size: ImageSize): string {
  return `/media/${mediaKey(kind, id, size)}`;
}

/** URL-Segmente → R2-Schlüssel; null bei allem Unerwarteten (fremde Präfixe, Pfad-Tricks, falsche Größen). */
export function parseMediaKey(segments: readonly string[]): string | null {
  if (segments.length !== 3) return null;
  const [kind, id, size] = segments;
  const width = Number(size);
  if (!isMediaKind(kind) || !isUuid(id) || String(width) !== size || !isImageSize(width)) return null;
  return mediaKey(kind, id, width);
}
```

`src/lib/media/sniff.ts`:

```ts
const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

/** Erkennt den Bildtyp an den ersten Bytes; der Content-Type-Header allein ist nicht vertrauenswürdig. */
export function sniffImageType(bytes: Uint8Array): "image/webp" | "image/jpeg" | null {
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "image/webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}
```

`src/lib/portfolio/repo.ts`:

```ts
import { and, asc, count, eq, max, ne, sql } from "drizzle-orm";
import { CATEGORIES, type Category } from "@/lib/categories";
import type { Db } from "@/lib/db/client";
import { portfolioImages } from "@/lib/db/schema";
import { IMAGE_SIZES, mediaKey } from "@/lib/media/keys";

export type PortfolioImage = typeof portfolioImages.$inferSelect;
export type PortfolioRole = NonNullable<PortfolioImage["role"]>;
export type NewPortfolioImage = { id: string; category: Category; width: number; height: number; color: string };
export type ImagePatch = { visible?: boolean; altDe?: string | null; altEn?: string | null };

export const MAX_HERO = 3;
export const MAX_CHAPTER_PREVIEW = 5;

export class PortfolioError extends Error {
  readonly status: 400 | 404;
  constructor(message: string, status: 400 | 404 = 400) {
    super(message);
    this.name = "PortfolioError";
    this.status = status;
  }
}

const notFound = () => new PortfolioError("Bild nicht gefunden.", 404);

export function listByCategory(db: Db, category: Category): Promise<PortfolioImage[]> {
  return db
    .select()
    .from(portfolioImages)
    .where(eq(portfolioImages.category, category))
    .orderBy(asc(portfolioImages.sort), asc(portfolioImages.createdAt));
}

export async function countByCategory(db: Db): Promise<Record<Category, { total: number; visible: number }>> {
  const rows = await db
    .select({ category: portfolioImages.category, total: count(), visible: sql<number>`sum(${portfolioImages.visible})` })
    .from(portfolioImages)
    .groupBy(portfolioImages.category);
  const result = Object.fromEntries(CATEGORIES.map((c) => [c, { total: 0, visible: 0 }])) as Record<Category, { total: number; visible: number }>;
  for (const row of rows) result[row.category] = { total: row.total, visible: Number(row.visible ?? 0) };
  return result;
}

/** Legt den DB-Eintrag erst an, wenn alle Größen in R2 liegen. Halbe Uploads werden nie sichtbar. */
export async function createImage(db: Db, media: R2Bucket, input: NewPortfolioImage): Promise<PortfolioImage> {
  const heads = await Promise.all(IMAGE_SIZES.map((size) => media.head(mediaKey("portfolio", input.id, size))));
  if (heads.some((head) => head === null)) throw new PortfolioError("Upload unvollständig: nicht alle Bildgrößen sind vorhanden.");
  const [{ last }] = await db
    .select({ last: max(portfolioImages.sort) })
    .from(portfolioImages)
    .where(eq(portfolioImages.category, input.category));
  const [row] = await db.insert(portfolioImages).values({ ...input, sort: (last ?? -1) + 1 }).returning();
  return row;
}

export async function updateImage(db: Db, id: string, patch: ImagePatch): Promise<PortfolioImage> {
  const [row] = await db.update(portfolioImages).set(patch).where(eq(portfolioImages.id, id)).returning();
  if (!row) throw notFound();
  return row;
}

export async function setRole(db: Db, id: string, role: PortfolioRole | null): Promise<PortfolioImage> {
  const [image] = await db.select().from(portfolioImages).where(eq(portfolioImages.id, id));
  if (!image) throw notFound();

  if (role === "hero") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(portfolioImages)
      .where(and(eq(portfolioImages.role, "hero"), ne(portfolioImages.id, id)));
    if (n >= MAX_HERO) throw new PortfolioError(`Maximal ${MAX_HERO} Hero-Bilder.`);
  }
  if (role === "chapter_preview") {
    const [{ n }] = await db
      .select({ n: count() })
      .from(portfolioImages)
      .where(and(eq(portfolioImages.category, image.category), eq(portfolioImages.role, "chapter_preview"), ne(portfolioImages.id, id)));
    if (n >= MAX_CHAPTER_PREVIEW) throw new PortfolioError(`Maximal ${MAX_CHAPTER_PREVIEW} Kapitel-Vorschaubilder pro Kategorie.`);
  }
  if (role === "chapter") {
    await db
      .update(portfolioImages)
      .set({ role: null })
      .where(and(eq(portfolioImages.category, image.category), eq(portfolioImages.role, "chapter"), ne(portfolioImages.id, id)));
  }
  const [row] = await db.update(portfolioImages).set({ role }).where(eq(portfolioImages.id, id)).returning();
  return row;
}

export async function reorder(db: Db, category: Category, ids: readonly string[]): Promise<void> {
  const current = await db.select({ id: portfolioImages.id }).from(portfolioImages).where(eq(portfolioImages.category, category));
  const known = new Set(current.map((row) => row.id));
  const complete = ids.length === known.size && new Set(ids).size === ids.length && ids.every((id) => known.has(id));
  if (!complete) throw new PortfolioError("Die Reihenfolge passt nicht zu den Bildern der Kategorie.");
  if (ids.length === 0) return;
  const [first, ...rest] = ids.map((id, index) => db.update(portfolioImages).set({ sort: index }).where(eq(portfolioImages.id, id)));
  await db.batch([first, ...rest]);
}

export async function deleteImage(db: Db, media: R2Bucket, id: string): Promise<void> {
  const [row] = await db.delete(portfolioImages).where(eq(portfolioImages.id, id)).returning();
  if (!row) throw notFound();
  await media.delete(IMAGE_SIZES.map((size) => mediaKey("portfolio", id, size)));
}
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test
```
Erwartet: 10 Testdateien, 45 Tests, alle PASS.

- [ ] **Schritt 5: Commit**

```bash
npm run lint && npm run build
git add -A
git commit -m "feat(portfolio): media keys, magic-byte check and portfolio repository

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Admin-API und öffentliche Medien-Route

**Dateien:**
- Erstellen:
  - `src/lib/http.ts`, `src/lib/portfolio/validation.ts`
  - `src/app/admin/api/media/[kind]/[id]/[size]/route.ts`
  - `src/app/admin/api/portfolio/route.ts`, `src/app/admin/api/portfolio/[id]/route.ts`, `src/app/admin/api/portfolio/order/route.ts`
  - `src/app/media/[...key]/route.ts`
  - `test/e2e/admin-api.spec.ts`
- Ändern: `package.json`, `package-lock.json` (zod), `test/e2e/helpers/admin.ts`

**Schnittstellen:**
- Nutzt: `adminApiGuard` (Task 2), Task 3 komplett, `getDb`, `getEnv` (Plan 1).
- Stellt bereit (HTTP):
  - `PUT /admin/api/media/<kind>/<uuid>/<size>` (Body = WebP/JPEG-Bytes) → 204 | 400 | 401 | 403 | 413 | 415
  - `GET /admin/api/portfolio?category=<c>` → `PortfolioImage[]`
  - `POST /admin/api/portfolio` `{id, category, width, height, color}` → 201 `PortfolioImage` | 400
  - `PATCH /admin/api/portfolio/<id>` `{visible?, altDe?, altEn?, role?}` → 200 | 400 | 404
  - `DELETE /admin/api/portfolio/<id>` → 204 | 404
  - `PUT /admin/api/portfolio/order` `{category, ids}` → 204 | 400
  - `GET /media/<kind>/<uuid>/<size>` → 200 mit `immutable`-Cache | 404
  - Fehlerformat überall `{ "error": "<deutsche Meldung>" }`
  - E2E-Helfer `clearCategory(page, category)`, `TINY_WEBP`

- [ ] **Schritt 1: zod installieren**

```bash
npm install --save-exact zod@4.6.5
npm run deps:lock
npm ci
```
Erwartet: `check:lock` meldet `added … packages`, und `package.json` enthält `"zod": "4.6.5"`.

- [ ] **Schritt 2: Fehlschlagende E2E-Tests schreiben**

In `test/e2e/helpers/admin.ts` ergänzen:

```ts
/** 1×1-WebP (gültige Magic Bytes) für API-Tests. */
export const TINY_WEBP = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");

/** Löscht alle Bilder einer Kategorie über die API (Tests sind so unabhängig voneinander). */
export async function clearCategory(page: Page, category: string) {
  const res = await page.request.get(`/admin/api/portfolio?category=${category}`);
  expect(res.status()).toBe(200);
  for (const image of (await res.json()) as { id: string }[]) {
    expect((await page.request.delete(`/admin/api/portfolio/${image.id}`)).status()).toBe(204);
  }
}
```

`test/e2e/admin-api.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { TINY_WEBP, clearCategory, loginAsAdmin } from "./helpers/admin";

const ID = "00000000-0000-4000-8000-000000000000";

test.describe.configure({ mode: "serial" });

test("alle Admin-APIs verlangen eine Anmeldung", async ({ request }) => {
  const calls = [
    request.put(`/admin/api/media/portfolio/${ID}/800`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } }),
    request.get("/admin/api/portfolio?category=volleyball"),
    request.post("/admin/api/portfolio", { data: { id: ID, category: "volleyball", width: 1, height: 1, color: "#000000" } }),
    request.patch(`/admin/api/portfolio/${ID}`, { data: { visible: false } }),
    request.delete(`/admin/api/portfolio/${ID}`),
    request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [] } }),
  ];
  for (const res of await Promise.all(calls)) {
    expect(res.status(), res.url()).toBe(401);
    expect(await res.json()).toEqual({ error: "Nicht angemeldet." });
  }
});

test.describe("angemeldet", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await clearCategory(page, "volleyball");
  });

  test("Anfragen von fremder Herkunft werden abgewiesen", async ({ page }) => {
    const res = await page.request.put(`/admin/api/media/portfolio/${ID}/800`, {
      data: TINY_WEBP,
      headers: { "content-type": "image/webp", origin: "https://evil.example" },
    });
    expect(res.status()).toBe(403);
  });

  test("Upload lehnt falsche Orte, Nicht-Bilder und zu große Dateien ab", async ({ page }) => {
    const put = (path: string, data: Buffer, type = "image/webp") =>
      page.request.put(path, { data, headers: { "content-type": type } });
    expect((await put(`/admin/api/media/galleries/${ID}/800`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/not-a-uuid/800`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/${ID}/900`, TINY_WEBP)).status()).toBe(400);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, Buffer.from("<html>no</html>"))).status()).toBe(415);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, TINY_WEBP, "image/jpeg")).status()).toBe(415);
    expect((await put(`/admin/api/media/portfolio/${ID}/800`, Buffer.alloc(10 * 1024 * 1024 + 1, 0))).status()).toBe(413);
    expect((await page.request.get(`/media/portfolio/${ID}/800`)).status()).toBe(404);
  });

  test("halber Upload wird nicht angelegt, vollständiger schon; Medien sind öffentlich und lange cachebar", async ({ page, browser }) => {
    const id = crypto.randomUUID();
    const put = (size: number) =>
      page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
    const create = () =>
      page.request.post("/admin/api/portfolio", { data: { id, category: "volleyball", width: 3000, height: 2000, color: "#aabbcc" } });

    expect((await put(800)).status()).toBe(204);
    expect((await put(1600)).status()).toBe(204);
    const incomplete = await create();
    expect(incomplete.status()).toBe(400);
    expect(await incomplete.json()).toEqual({ error: "Upload unvollständig: nicht alle Bildgrößen sind vorhanden." });

    expect((await put(2400)).status()).toBe(204);
    const created = await create();
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({ id, category: "volleyball", sort: 0, visible: true });

    // Öffentlich, auch für einen englischen Browser ohne Anmeldung, nicht umgeleitet
    const anon = await browser.newContext({ locale: "en-US" });
    const media = await anon.request.get(`/media/portfolio/${id}/800`, { maxRedirects: 0 });
    expect(media.status()).toBe(200);
    expect(media.headers()["content-type"]).toBe("image/webp");
    expect(media.headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
    await anon.close();

    expect((await page.request.delete(`/admin/api/portfolio/${id}`)).status()).toBe(204);
    expect((await page.request.get(`/media/portfolio/${id}/800`)).status()).toBe(404);
  });

  test("ändern, sortieren und Fehlermeldungen der Portfolio-API", async ({ page }) => {
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      const id = crypto.randomUUID();
      for (const size of [800, 1600, 2400]) {
        await page.request.put(`/admin/api/media/portfolio/${id}/${size}`, { data: TINY_WEBP, headers: { "content-type": "image/webp" } });
      }
      await page.request.post("/admin/api/portfolio", { data: { id, category: "volleyball", width: 10, height: 10, color: "#000000" } });
      ids.push(id);
    }

    const patched = await page.request.patch(`/admin/api/portfolio/${ids[0]}`, { data: { visible: false, altDe: "Block", role: "chapter" } });
    expect(await patched.json()).toMatchObject({ visible: false, altDe: "Block", role: "chapter" });

    expect((await page.request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [ids[1], ids[0]] } })).status()).toBe(204);
    const list = (await (await page.request.get("/admin/api/portfolio?category=volleyball")).json()) as { id: string }[];
    expect(list.map((i) => i.id)).toEqual([ids[1], ids[0]]);

    const badOrder = await page.request.put("/admin/api/portfolio/order", { data: { category: "volleyball", ids: [ids[0]] } });
    expect(badOrder.status()).toBe(400);
    expect((await page.request.patch(`/admin/api/portfolio/${ids[0]}`, { data: { unbekannt: 1 } })).status()).toBe(400);
    expect((await page.request.patch(`/admin/api/portfolio/${ID}`, { data: { visible: true } })).status()).toBe(404);
    expect((await page.request.get("/admin/api/portfolio?category=quatsch")).status()).toBe(400);
  });
});

test("öffentliche Medien-Route liefert nie private Bereiche", async ({ request }) => {
  expect((await request.get(`/media/galleries/${ID}/800`)).status()).toBe(404);
  expect((await request.get(`/media/portfolio/${ID}/800/extra`)).status()).toBe(404);
});
```

```bash
npm run test:e2e -- admin-api.spec.ts
```
Erwartet: FAIL, die Routen existieren noch nicht (404 statt 401 usw.).

- [ ] **Schritt 3: HTTP-Helfer und Validierung**

`src/lib/http.ts`:

```ts
import type { z } from "zod";

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Liest und prüft einen JSON-Body. Bei Fehlern kommt eine fertige 400-Antwort zurück. */
export async function readJson<T extends z.ZodType>(request: Request, schema: T): Promise<{ data: z.infer<T> } | { response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: jsonError("Ungültiges JSON.", 400) };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: jsonError(parsed.error.issues[0]?.message ?? "Ungültige Eingabe.", 400) };
  return { data: parsed.data };
}
```

`src/lib/portfolio/validation.ts`:

```ts
import { z } from "zod";
import { CATEGORIES } from "@/lib/categories";

export const categorySchema = z.enum(CATEGORIES, "Unbekannte Kategorie.");

export const createImageSchema = z.strictObject({
  id: z.uuid(),
  category: categorySchema,
  width: z.int().min(1).max(30000),
  height: z.int().min(1).max(30000),
  color: z.string().regex(/^#[0-9a-f]{6}$/i, "Ungültige Farbe."),
});

const altText = z.string().trim().max(300, "Alt-Text: höchstens 300 Zeichen.").nullable().optional();

export const patchImageSchema = z.strictObject({
  visible: z.boolean().optional(),
  altDe: altText,
  altEn: altText,
  role: z.enum(["hero", "chapter", "chapter_preview"]).nullable().optional(),
});

export const orderSchema = z.strictObject({
  category: categorySchema,
  ids: z.array(z.uuid()).max(5000),
});
```

- [ ] **Schritt 4: Routen**

`src/app/admin/api/media/[kind]/[id]/[size]/route.ts`:

```ts
import { adminApiGuard } from "@/lib/auth/admin";
import { getEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { isImageSize, isMediaKind, isUuid, mediaKey } from "@/lib/media/keys";
import { sniffImageType } from "@/lib/media/sniff";

const MAX_BYTES = 10 * 1024 * 1024;
const TOO_LARGE = "Datei zu groß (max. 10 MB).";

type Params = { params: Promise<{ kind: string; id: string; size: string }> };

export async function PUT(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;

  const { kind, id, size } = await params;
  const width = Number(size);
  if (!isMediaKind(kind) || !isUuid(id) || String(width) !== size || !isImageSize(width)) {
    return jsonError("Ungültiger Speicherort.", 400);
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return jsonError(TOO_LARGE, 413);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return jsonError(TOO_LARGE, 413);
  const type = sniffImageType(bytes);
  if (!type || type !== request.headers.get("content-type")) return jsonError("Nur WebP- oder JPEG-Bilder.", 415);

  await getEnv().MEDIA.put(mediaKey(kind, id, width), bytes, { httpMetadata: { contentType: type } });
  return new Response(null, { status: 204 });
}
```

`src/app/admin/api/portfolio/route.ts`:

```ts
import { adminApiGuard } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { PortfolioError, createImage, listByCategory } from "@/lib/portfolio/repo";
import { categorySchema, createImageSchema } from "@/lib/portfolio/validation";

export async function GET(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const category = categorySchema.safeParse(new URL(request.url).searchParams.get("category"));
  if (!category.success) return jsonError("Unbekannte Kategorie.", 400);
  return Response.json(await listByCategory(getDb(), category.data));
}

export async function POST(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const input = await readJson(request, createImageSchema);
  if ("response" in input) return input.response;
  try {
    return Response.json(await createImage(getDb(), getEnv().MEDIA, input.data), { status: 201 });
  } catch (error) {
    if (error instanceof PortfolioError) return jsonError(error.message, error.status);
    throw error;
  }
}
```

`src/app/admin/api/portfolio/[id]/route.ts`:

```ts
import { adminApiGuard } from "@/lib/auth/admin";
import { getDb, getEnv } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { isUuid } from "@/lib/media/keys";
import { PortfolioError, deleteImage, setRole, updateImage, type PortfolioImage } from "@/lib/portfolio/repo";
import { patchImageSchema } from "@/lib/portfolio/validation";

type Params = { params: Promise<{ id: string }> };

function portfolioErrorResponse(error: unknown): Response {
  if (error instanceof PortfolioError) return jsonError(error.message, error.status);
  throw error;
}

export async function PATCH(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bild nicht gefunden.", 404);
  const input = await readJson(request, patchImageSchema);
  if ("response" in input) return input.response;

  const { role, ...fields } = input.data;
  try {
    const db = getDb();
    let row: PortfolioImage | undefined;
    if (Object.keys(fields).length > 0) row = await updateImage(db, id, fields);
    if (role !== undefined) row = await setRole(db, id, role);
    return row ? Response.json(row) : jsonError("Keine Änderung angegeben.", 400);
  } catch (error) {
    return portfolioErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return jsonError("Bild nicht gefunden.", 404);
  try {
    await deleteImage(getDb(), getEnv().MEDIA, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return portfolioErrorResponse(error);
  }
}
```

`src/app/admin/api/portfolio/order/route.ts`:

```ts
import { adminApiGuard } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { jsonError, readJson } from "@/lib/http";
import { PortfolioError, reorder } from "@/lib/portfolio/repo";
import { orderSchema } from "@/lib/portfolio/validation";

export async function PUT(request: Request) {
  const denied = await adminApiGuard(request);
  if (denied) return denied;
  const input = await readJson(request, orderSchema);
  if ("response" in input) return input.response;
  try {
    await reorder(getDb(), input.data.category, input.data.ids);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof PortfolioError) return jsonError(error.message, error.status);
    throw error;
  }
}
```

`src/app/media/[...key]/route.ts`:

```ts
import { getEnv } from "@/lib/env";
import { parseMediaKey } from "@/lib/media/keys";

type Params = { params: Promise<{ key: string[] }> };

/** Öffentliche Bilder (Portfolio, Porträt). Schlüssel enthalten eine UUID → unveränderlich cachebar. */
export async function GET(_request: Request, { params }: Params) {
  const key = parseMediaKey((await params).key);
  if (!key) return new Response("Not found", { status: 404 });
  const object = await getEnv().MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      etag: object.httpEtag,
    },
  });
}
```

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 45 PASS, E2E 28 PASS.

Falls alle Browser-Uploads mit 403 scheitern (in späteren Tasks sichtbar), stimmt `request.url` hinter OpenNext nicht mit dem Origin-Host überein. Dann in `adminApiGuard` statt `new URL(request.url).host` den Header `host` vergleichen und als Ruling vermerken.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(admin): portfolio and upload API with public media route

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Bildverarbeitung im Browser

**Dateien:**
- Erstellen:
  - `src/lib/image/sizing.ts`, `src/lib/image/process.worker.ts`, `src/lib/image/process.ts`, `src/lib/image/upload.ts`
  - `test/unit/image-sizing.test.ts`

**Schnittstellen:**
- Nutzt: `IMAGE_SIZES`, `ImageSize`, `MediaKind` (Task 3), `PUT /admin/api/media/…` (Task 4).
- Stellt bereit:
  - `targetSize(width, height, max): { width, height }`, `averageColor(rgba): string`
  - `type ProcessedImage = { width; height; color; variants: { size: ImageSize; blob: Blob }[] }`, `processImage(file): Promise<ProcessedImage>`
  - `uploadVariants(kind, processed): Promise<string>` (gibt die neue UUID zurück)

- [ ] **Schritt 1: Fehlschlagenden Test schreiben**

`test/unit/image-sizing.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { averageColor, targetSize } from "@/lib/image/sizing";

describe("targetSize", () => {
  it("limits the longest edge", () => {
    expect(targetSize(6000, 4000, 2400)).toEqual({ width: 2400, height: 1600 });
    expect(targetSize(4000, 6000, 800)).toEqual({ width: 533, height: 800 });
  });

  it("never upscales small images", () => {
    expect(targetSize(600, 300, 800)).toEqual({ width: 600, height: 300 });
    expect(targetSize(1, 1, 2400)).toEqual({ width: 1, height: 1 });
  });

  it("never returns zero pixels for extreme panoramas", () => {
    expect(targetSize(20000, 10, 800)).toEqual({ width: 800, height: 1 });
  });
});

describe("averageColor", () => {
  it("averages RGB and ignores alpha", () => {
    expect(averageColor([255, 0, 0, 255, 0, 0, 255, 0])).toBe("#800080");
  });

  it("returns black for empty input", () => {
    expect(averageColor([])).toBe("#000000");
  });
});
```

```bash
npm test
```
Erwartet: FAIL, `@/lib/image/sizing` wird nicht gefunden.

- [ ] **Schritt 2: Implementieren**

`src/lib/image/sizing.ts`:

```ts
/** Längste Kante auf `max` begrenzen, nie vergrößern, nie 0 px. */
export function targetSize(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Durchschnittsfarbe aus RGBA-Pixeln als #rrggbb (Alpha wird ignoriert). */
export function averageColor(rgba: ArrayLike<number>): string {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return "#000000";
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    r += rgba[i];
    g += rgba[i + 1];
    b += rgba[i + 2];
  }
  const hex = (sum: number) => Math.round(sum / pixels).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
```

`src/lib/image/process.worker.ts`:

```ts
import { averageColor, targetSize } from "./sizing";

type Job = { file: File; sizes: readonly number[] };
// Worker-Kontext ohne die "webworker"-Lib (die kollidiert mit "dom" in derselben tsconfig).
const scope = self as unknown as {
  onmessage: ((event: MessageEvent<Job>) => void) | null;
  postMessage(message: unknown): void;
};

scope.onmessage = async (event) => {
  try {
    const { file, sizes } = event.data;
    // from-image: EXIF-Drehung (Handy, Hochformat aus der Kamera) wird eingerechnet.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const variants: { size: number; blob: Blob }[] = [];
    for (const size of sizes) {
      const { width, height } = targetSize(bitmap.width, bitmap.height, size);
      const canvas = new OffscreenCanvas(width, height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas ist nicht verfügbar.");
      context.imageSmoothingQuality = "high";
      context.drawImage(bitmap, 0, 0, width, height);
      variants.push({ size, blob: await encode(canvas) });
    }
    const probe = new OffscreenCanvas(16, 16);
    const probeContext = probe.getContext("2d");
    if (!probeContext) throw new Error("Canvas ist nicht verfügbar.");
    probeContext.drawImage(bitmap, 0, 0, 16, 16);
    const color = averageColor(probeContext.getImageData(0, 0, 16, 16).data);
    const result = { width: bitmap.width, height: bitmap.height, color, variants };
    bitmap.close();
    scope.postMessage(result);
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : "Bild konnte nicht gelesen werden." });
  }
};

async function encode(canvas: OffscreenCanvas): Promise<Blob> {
  const webp = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
  if (webp.type === "image/webp") return webp;
  // Browser ohne WebP-Encoder (z. B. manche Safari-Versionen) liefern PNG → dann JPEG.
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.85 });
}
```

`src/lib/image/process.ts`:

```ts
import { IMAGE_SIZES, type ImageSize } from "@/lib/media/keys";

export type ProcessedImage = {
  width: number;
  height: number;
  color: string;
  variants: { size: ImageSize; blob: Blob }[];
};

/** Dreht, skaliert und kodiert ein Bild in einem Web Worker (blockiert die Oberfläche nicht). */
export function processImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./process.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<ProcessedImage | { error: string }>) => {
      worker.terminate();
      if ("error" in event.data) reject(new Error(event.data.error));
      else resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || "Bild konnte nicht verarbeitet werden."));
    };
    worker.postMessage({ file, sizes: IMAGE_SIZES });
  });
}
```

`src/lib/image/upload.ts`:

```ts
import type { MediaKind } from "@/lib/media/keys";
import type { ProcessedImage } from "./process";

/** 1 Versuch + 2 automatische Wiederholungen (Spec §3.3). */
const ATTEMPTS = 3;

class ClientError extends Error {}

/** Lädt alle Varianten unter einer neuen UUID hoch und gibt die UUID zurück. */
export async function uploadVariants(kind: MediaKind, image: ProcessedImage): Promise<string> {
  const id = crypto.randomUUID();
  for (const variant of image.variants) {
    await putWithRetry(`/admin/api/media/${kind}/${id}/${variant.size}`, variant.blob);
  }
  return id;
}

async function putWithRetry(url: string, blob: Blob): Promise<void> {
  let lastError = new Error("Upload fehlgeschlagen.");
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, { method: "PUT", body: blob, headers: { "content-type": blob.type } });
      if (response.ok) return;
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      const message = body?.error ?? `Upload fehlgeschlagen (${response.status}).`;
      // 4xx: Wiederholen bringt nichts (falsches Format, abgemeldet …)
      if (response.status < 500) throw new ClientError(message);
      lastError = new Error(message);
    } catch (error) {
      if (error instanceof ClientError) throw error;
      lastError = error instanceof Error ? error : lastError;
    }
    if (attempt < ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
  throw lastError;
}
```

- [ ] **Schritt 3: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test && npm run lint && npm run build
```
Erwartet: 11 Testdateien, 50 Tests PASS, Lint und Build grün. Der Web Worker wird erst in Task 6 im Browser getestet.

- [ ] **Schritt 4: Commit**

```bash
git add -A
git commit -m "feat(image): in-browser resize, EXIF orientation and resilient upload

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Portfolio-Verwaltung (Oberfläche)

**Dateien:**
- Erstellen:
  - `src/app/admin/(protected)/portfolio/[category]/page.tsx`, `portfolio-manager.tsx`, `image-card.tsx`, `upload-zone.tsx`, `portfolio-api.ts`
  - `test/e2e/helpers/images.ts`, `test/e2e/admin-portfolio.spec.ts`
- Ändern:
  - `src/app/admin/(protected)/page.tsx` (Zähler)
  - `package.json`, `package-lock.json` (dnd-kit)

**Schnittstellen:**
- Nutzt: Tasks 3–5 (`listByCategory`, `countByCategory`, `PortfolioImage`, `PortfolioRole`, `ImagePatch`, `processImage`, `uploadVariants`, `mediaUrl`), `CATEGORY_LABELS_DE`.
- Stellt bereit:
  - `<UploadZone onUpload={(file) => Promise<void>} />` (Warteschlange, 3 parallel, „Erneut versuchen“)
  - E2E-Helfer `makeJpeg(page, w, h, color)`, `withExifOrientation(jpeg, orientation)`

- [ ] **Schritt 1: dnd-kit installieren**

```bash
npm install --save-exact @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2
npm run deps:lock
npm ci
```

- [ ] **Schritt 2: Fehlschlagende E2E-Tests schreiben**

`test/e2e/helpers/images.ts`:

```ts
import type { Page } from "@playwright/test";

/** Erzeugt ein JPEG im Browser: Grundfarbe plus weißes Feld oben links (so ist die Ausrichtung prüfbar). */
export async function makeJpeg(page: Page, width: number, height: number, color: string): Promise<Buffer> {
  const dataUrl = await page.evaluate(
    ({ width, height, color }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d")!;
      context.fillStyle = color;
      context.fillRect(0, 0, width, height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width / 4, height / 4);
      return canvas.toDataURL("image/jpeg", 0.9);
    },
    { width, height, color },
  );
  return Buffer.from(dataUrl.split(",")[1], "base64");
}

/** Fügt ein EXIF-Segment mit „Orientation“ ein (6 = um 90° im Uhrzeigersinn drehen, typisch für Hochformat-Fotos). */
export function withExifOrientation(jpeg: Buffer, orientation: number): Buffer {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0, 0, 0, 8, // Big Endian, erster IFD bei Offset 8
    0, 1, // ein Eintrag
    0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, orientation, 0, 0, // Orientation, SHORT, 1 Wert
    0, 0, 0, 0, // kein weiterer IFD
  ]);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const length = payload.length + 2;
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, length >> 8, length & 0xff]), payload]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}
```

`test/e2e/admin-portfolio.spec.ts`:

```ts
import { expect, test, type Page } from "@playwright/test";
import { clearCategory, loginAsAdmin } from "./helpers/admin";
import { makeJpeg, withExifOrientation } from "./helpers/images";

test.describe.configure({ mode: "serial" });

const cards = (page: Page) => page.getByTestId("portfolio-image");

/** Führt eine Aktion aus und wartet auf die zugehörige Portfolio-API-Antwort (keine überholenden Requests). */
async function andWait(page: Page, method: "PATCH" | "PUT", action: () => Promise<void>) {
  const response = page.waitForResponse((r) => r.url().includes("/admin/api/portfolio") && r.request().method() === method);
  await action();
  expect((await response).ok()).toBe(true);
}

async function upload(page: Page, files: { name: string; buffer: Buffer }[]) {
  await page.getByLabel("Bilder hinzufügen").setInputFiles(files.map((f) => ({ ...f, mimeType: "image/jpeg" })));
  await expect(page.locator('[data-testid="upload-item"][data-status="done"]')).toHaveCount(files.length, { timeout: 30_000 });
}

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await clearCategory(page, "studio");
  await page.goto("/admin/portfolio/studio");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Studio");
});

test("Bilder hochladen: erscheinen in Reihenfolge, Vorschau lädt, sichtbar", async ({ page }) => {
  await upload(page, [
    { name: "a.jpg", buffer: await makeJpeg(page, 3000, 2000, "#b3261e") },
    { name: "b.jpg", buffer: await makeJpeg(page, 2000, 3000, "#1e3a8a") },
  ]);
  await expect(cards(page)).toHaveCount(2);
  const first = cards(page).first().locator("img");
  await expect(first).toHaveJSProperty("complete", true);
  expect(await first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(cards(page).first().getByLabel("Sichtbar")).toBeChecked();

  await page.reload();
  await expect(cards(page)).toHaveCount(2);
});

test("EXIF-gedrehtes Foto wird aufrecht gespeichert und nie vergrößert", async ({ page }) => {
  const landscapePixels = await makeJpeg(page, 600, 300, "#0f766e");
  await upload(page, [{ name: "hochkant.jpg", buffer: withExifOrientation(landscapePixels, 6) }]);
  const card = cards(page).first();
  await expect(card).toHaveAttribute("data-width", "300");
  await expect(card).toHaveAttribute("data-height", "600");

  const id = await card.getAttribute("data-id");
  const size = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, `/media/portfolio/${id}/2400`);
  expect(size).toEqual([300, 600]);
});

test("Reihenfolge, Sichtbarkeit, Rollen und Löschen bleiben nach dem Neuladen erhalten", async ({ page }) => {
  await upload(page, [
    { name: "eins.jpg", buffer: await makeJpeg(page, 900, 600, "#111111") },
    { name: "zwei.jpg", buffer: await makeJpeg(page, 900, 600, "#222222") },
  ]);
  const [idOne, idTwo] = await cards(page).evaluateAll((els) => els.map((el) => el.getAttribute("data-id")));

  await andWait(page, "PUT", () => cards(page).first().getByRole("button", { name: "Nach hinten" }).click());
  await expect(cards(page).first()).toHaveAttribute("data-id", idTwo!);

  await andWait(page, "PATCH", () => cards(page).first().getByLabel("Sichtbar").uncheck());
  await andWait(page, "PATCH", async () => {
    await cards(page).first().getByLabel("Rolle").selectOption({ label: "Kapitel-Bild" });
  });
  await andWait(page, "PATCH", async () => {
    await cards(page).nth(1).getByLabel("Rolle").selectOption({ label: "Kapitel-Bild" });
  });
  await cards(page).nth(1).getByLabel("Alt-Text DE").fill("Studio-Porträt");
  await andWait(page, "PATCH", () => cards(page).nth(1).getByLabel("Alt-Text DE").blur());
  await expect(page.getByRole("alert")).toHaveCount(0);

  await page.reload();
  await expect(cards(page).first()).toHaveAttribute("data-id", idTwo!);
  await expect(cards(page).first().getByLabel("Sichtbar")).not.toBeChecked();
  await expect(cards(page).first().getByLabel("Rolle")).toHaveValue("");
  await expect(cards(page).nth(1).getByLabel("Rolle")).toHaveValue("chapter");
  await expect(cards(page).nth(1).getByLabel("Alt-Text DE")).toHaveValue("Studio-Porträt");

  page.once("dialog", (dialog) => dialog.accept());
  await cards(page).nth(1).getByRole("button", { name: "Löschen" }).click();
  await expect(cards(page)).toHaveCount(1);
  expect((await page.request.get(`/media/portfolio/${idOne}/800`)).status()).toBe(404);
});

test("Übersicht zählt die Bilder pro Kategorie", async ({ page }) => {
  await upload(page, [{ name: "x.jpg", buffer: await makeJpeg(page, 400, 400, "#444444") }]);
  await page.goto("/admin");
  await expect(page.getByRole("main").getByRole("link", { name: /Studio/ })).toContainText("1 sichtbar · 1 gesamt");
});
```

```bash
npm run test:e2e -- admin-portfolio.spec.ts
```
Erwartet: FAIL, `/admin/portfolio/studio` liefert 404 (die Seite fehlt).

- [ ] **Schritt 3: Oberfläche implementieren**

`src/app/admin/(protected)/portfolio/[category]/portfolio-api.ts`:

```ts
import type { Category } from "@/lib/categories";
import type { PortfolioImage, PortfolioRole } from "@/lib/portfolio/repo";

async function call<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json" } });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Fehler ${response.status}`);
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export type CardPatch = { visible?: boolean; altDe?: string | null; altEn?: string | null; role?: PortfolioRole | null };

export const portfolioApi = {
  create: (input: { id: string; category: Category; width: number; height: number; color: string }) =>
    call<PortfolioImage>("/admin/api/portfolio", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, patch: CardPatch) =>
    call<PortfolioImage>(`/admin/api/portfolio/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  remove: (id: string) => call<void>(`/admin/api/portfolio/${id}`, { method: "DELETE" }),
  reorder: (category: Category, ids: string[]) =>
    call<void>("/admin/api/portfolio/order", { method: "PUT", body: JSON.stringify({ category, ids }) }),
};
```

`src/app/admin/(protected)/portfolio/[category]/upload-zone.tsx`:

```tsx
"use client";

import { useState } from "react";

type Status = "waiting" | "running" | "done" | "error";
type Item = { key: string; file: File; status: Status; error?: string };

const PARALLEL = 3;
const STATUS_TEXT: Record<Status, string> = { waiting: "Wartet", running: "Wird verarbeitet …", done: "Fertig", error: "Fehler" };

export function UploadZone({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const setStatus = (key: string, status: Status, error?: string) =>
    setItems((all) => all.map((item) => (item.key === key ? { ...item, status, error } : item)));

  async function run(item: Item) {
    setStatus(item.key, "running");
    try {
      await onUpload(item.file);
      setStatus(item.key, "done");
    } catch (error) {
      setStatus(item.key, "error", error instanceof Error ? error.message : "Upload fehlgeschlagen.");
    }
  }

  async function addFiles(files: FileList | File[]) {
    const added: Item[] = [...files]
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({ key: crypto.randomUUID(), file, status: "waiting" }));
    setItems((all) => [...all, ...added]);
    let next = 0;
    const lane = async () => {
      while (next < added.length) await run(added[next++]);
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, added.length) }, lane));
  }

  return (
    <section aria-label="Upload">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void addFiles(event.dataTransfer.files);
        }}
        className={`grid place-items-center border border-dashed p-10 text-center text-sm ${dragOver ? "border-ink bg-mat" : "border-ink/30"}`}
      >
        <p>Bilder hierher ziehen oder</p>
        <label className="mt-2 cursor-pointer underline">
          Bilder hinzufügen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {items.length > 0 && (
        <ul aria-label="Upload-Warteschlange" className="mt-4 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item.key} data-testid="upload-item" data-status={item.status} className="flex flex-wrap gap-3">
              <span className="font-label">{item.file.name}</span>
              <span className={item.status === "error" ? "text-signal" : "text-stone"}>
                {STATUS_TEXT[item.status]}
                {item.error ? `: ${item.error}` : ""}
              </span>
              {item.status === "error" && (
                <button type="button" className="underline" onClick={() => void run(item)}>
                  Erneut versuchen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`src/app/admin/(protected)/portfolio/[category]/image-card.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { mediaUrl } from "@/lib/media/keys";
import type { PortfolioImage, PortfolioRole } from "@/lib/portfolio/repo";
import type { CardPatch } from "./portfolio-api";

const ROLE_OPTIONS: { value: "" | PortfolioRole; label: string }[] = [
  { value: "", label: "Keine" },
  { value: "hero", label: "Hero" },
  { value: "chapter", label: "Kapitel-Bild" },
  { value: "chapter_preview", label: "Kapitel-Vorschau" },
];
const field = "mt-1 block w-full border border-ink/20 bg-paper px-2 py-1";

type Props = {
  image: PortfolioImage;
  position: number;
  total: number;
  onPatch: (patch: CardPatch) => void;
  onMove: (delta: -1 | 1) => void;
  onDelete: () => void;
};

export function ImageCard({ image, position, total, onPatch, onMove, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });
  const saveAlt = (key: "altDe" | "altEn", value: string) => {
    if (value !== (image[key] ?? "")) onPatch({ [key]: value || null });
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="portfolio-image"
      data-id={image.id}
      data-width={image.width}
      data-height={image.height}
      className={`bg-mat p-3 ${isDragging ? "z-10 shadow-lg" : ""} ${image.visible ? "" : "opacity-60"}`}
    >
      <button type="button" aria-label={`Bild ${position + 1} verschieben`} className="block w-full cursor-grab touch-none" {...attributes} {...listeners}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Bilder kommen fertig skaliert aus R2 */}
        <img
          src={mediaUrl("portfolio", image.id, 800)}
          alt={image.altDe ?? ""}
          width={image.width}
          height={image.height}
          loading="lazy"
          className="aspect-[2/3] w-full object-cover"
          style={{ backgroundColor: image.color }}
        />
      </button>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={image.visible} onChange={(event) => onPatch({ visible: event.target.checked })} />
          Sichtbar
        </label>
        <label className="block">
          Rolle
          <select className={field} value={image.role ?? ""} onChange={(event) => onPatch({ role: (event.target.value || null) as PortfolioRole | null })}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          Alt-Text DE
          <input className={field} defaultValue={image.altDe ?? ""} onBlur={(event) => saveAlt("altDe", event.target.value)} />
        </label>
        <label className="block">
          Alt-Text EN
          <input className={field} defaultValue={image.altEn ?? ""} onBlur={(event) => saveAlt("altEn", event.target.value)} />
        </label>
        <div className="flex gap-3 pt-1">
          <button type="button" className="underline disabled:opacity-30" disabled={position === 0} onClick={() => onMove(-1)}>
            Nach vorne
          </button>
          <button type="button" className="underline disabled:opacity-30" disabled={position === total - 1} onClick={() => onMove(1)}>
            Nach hinten
          </button>
          <button type="button" className="ml-auto text-signal underline" onClick={onDelete}>
            Löschen
          </button>
        </div>
      </div>
    </li>
  );
}
```

`src/app/admin/(protected)/portfolio/[category]/portfolio-manager.tsx`:

```tsx
"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { Category } from "@/lib/categories";
import { processImage } from "@/lib/image/process";
import { uploadVariants } from "@/lib/image/upload";
import type { PortfolioImage } from "@/lib/portfolio/repo";
import { ImageCard } from "./image-card";
import { portfolioApi, type CardPatch } from "./portfolio-api";
import { UploadZone } from "./upload-zone";

export function PortfolioManager({ category, initialImages }: { category: Category; initialImages: PortfolioImage[] }) {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function attempt(action: () => Promise<void>) {
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unbekannter Fehler.");
    }
  }

  async function upload(file: File) {
    const processed = await processImage(file);
    const id = await uploadVariants("portfolio", processed);
    const created = await portfolioApi.create({ id, category, width: processed.width, height: processed.height, color: processed.color });
    setImages((current) => [...current, created]);
  }

  function saveOrder(next: PortfolioImage[]) {
    const previous = images;
    setImages(next);
    void attempt(async () => {
      try {
        await portfolioApi.reorder(category, next.map((image) => image.id));
      } catch (cause) {
        setImages(previous);
        throw cause;
      }
    });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = images.findIndex((image) => image.id === active.id);
    const to = images.findIndex((image) => image.id === over.id);
    saveOrder(arrayMove(images, from, to));
  }

  function patch(id: string, change: CardPatch) {
    void attempt(async () => {
      const updated = await portfolioApi.update(id, change);
      setImages((current) =>
        current.map((image) => {
          if (image.id === id) return updated;
          // Nur ein Kapitel-Bild pro Kategorie: der Server hat das alte zurückgesetzt.
          if (change.role === "chapter" && image.role === "chapter") return { ...image, role: null };
          return image;
        }),
      );
    });
  }

  function remove(id: string) {
    if (!window.confirm("Bild endgültig löschen?")) return;
    void attempt(async () => {
      await portfolioApi.remove(id);
      setImages((current) => current.filter((image) => image.id !== id));
    });
  }

  return (
    <div className="space-y-8">
      <UploadZone onUpload={upload} />
      {error && (
        <p role="alert" className="text-signal">
          {error}
        </p>
      )}
      {images.length === 0 ? (
        <p className="text-stone">Noch keine Bilder in dieser Kategorie.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((image) => image.id)} strategy={rectSortingStrategy}>
            <ol className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {images.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  position={index}
                  total={images.length}
                  onPatch={(change) => patch(image.id, change)}
                  onMove={(delta) => saveOrder(arrayMove(images, index, index + delta))}
                  onDelete={() => remove(image.id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
```

`src/app/admin/(protected)/portfolio/[category]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CATEGORY_LABELS_DE, isCategory } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { listByCategory } from "@/lib/portfolio/repo";
import { PortfolioManager } from "./portfolio-manager";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  return { title: isCategory(category) ? CATEGORY_LABELS_DE[category] : "Portfolio" };
}

export default async function AdminPortfolioPage({ params }: Props) {
  const { category } = await params;
  if (!isCategory(category)) notFound();
  const images = await listByCategory(getDb(), category);
  return (
    <div>
      <p className="font-label text-xs text-stone">Portfolio</p>
      <h1 className="font-sport mt-2 text-7xl">{CATEGORY_LABELS_DE[category]}</h1>
      <p className="mt-4 max-w-xl text-sm text-stone">
        Reihenfolge per Ziehen oder mit „Nach vorne/hinten“. Rollen: ein Kapitel-Bild und bis zu 5 Kapitel-Vorschaubilder pro Kategorie,
        insgesamt 3 Hero-Bilder.
      </p>
      <div className="mt-10">
        <PortfolioManager category={category} initialImages={images} />
      </div>
    </div>
  );
}
```

`src/app/admin/(protected)/page.tsx` ersetzen durch:

```tsx
import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS_DE } from "@/lib/categories";
import { getDb } from "@/lib/env";
import { countByCategory } from "@/lib/portfolio/repo";

export default async function AdminHomePage() {
  const counts = await countByCategory(getDb());
  return (
    <div>
      <h1 className="font-display text-5xl">Übersicht</h1>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((category) => (
          <li key={category}>
            <Link href={`/admin/portfolio/${category}`} className="block bg-mat p-6">
              <span className="font-sport text-4xl">{CATEGORY_LABELS_DE[category]}</span>
              <span className="mt-2 block font-label text-xs text-stone">
                {counts[category].visible} sichtbar · {counts[category].total} gesamt
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Schritt 4: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit 50 PASS, E2E 32 PASS.

- [ ] **Schritt 5: Sichtprüfung**

Screenshot von `/admin/portfolio/studio` nach dem Hochladen von 3 Testbildern machen, z. B. mit `npx playwright screenshot` nach dem Login in einem eigenen Skript oder im Browser. Erwartet:
- Papier-Hintergrund, Karten im Weiß, Vorschaubilder im 2:3-Format mit Farbton-Platzhalter
- Bedienelemente lesbar, ausgeblendete Bilder blasser

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(admin): portfolio manager with upload queue, sorting and roles

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Texte & Links (Einstellungen mit Porträt)

**Dateien:**
- Erstellen:
  - `src/lib/settings/schema.ts`, `src/lib/settings/repo.ts`
  - `src/app/admin/(protected)/texte/page.tsx`, `settings-form.tsx`, `portrait-field.tsx`, `actions.ts`
  - `scripts/check-server-actions.mjs`
  - `test/unit/settings-repo.test.ts`, `test/e2e/admin-settings.spec.ts`
- Ändern: `package.json` (Lint-Script)

**Schnittstellen:**
- Nutzt: `requireAdmin` (Task 2), `processImage`, `uploadVariants` (Task 5), `mediaUrl`, `isUuid` (Task 3), `settings`-Tabelle (Plan 1).
- Stellt bereit:
  - `SETTINGS_KEYS`, `type Settings` (alle Werte `string`, leer = nicht gesetzt), `SETTINGS_DEFAULTS`, `settingsSchema`
  - `getSettings(db): Promise<Settings>`, `saveSettings(db, input: unknown): Promise<{ ok: true } | { ok: false; errors: Partial<Record<keyof Settings, string>> }>`

  Plan 4 liest die Texte über `getSettings`.

- [ ] **Schritt 1: Fehlschlagende Tests schreiben**

`test/unit/settings-repo.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SETTINGS_DEFAULTS } from "@/lib/settings/schema";
import { getSettings, saveSettings } from "@/lib/settings/repo";

const db = () => createDb(env.DB);
const valid = {
  ...SETTINGS_DEFAULTS,
  hero_headline_de: "  Hallen, Rauch, Gänsehaut.  ",
  contact_email: "hallo@cosmo-photos.de",
  instagram_url: "https://www.instagram.com/cosmo.photos_/",
  about_portrait_id: "3f2b8c4e-9a1d-4c7e-8b2a-1e5f6a7b8c9d",
};

beforeEach(async () => {
  await db().delete(settings);
});

describe("settings", () => {
  it("returns empty defaults when nothing is stored", async () => {
    expect(await getSettings(db())).toEqual(SETTINGS_DEFAULTS);
    expect(Object.values(SETTINGS_DEFAULTS).every((v) => v === "")).toBe(true);
  });

  it("saves trimmed values and reads them back", async () => {
    expect(await saveSettings(db(), valid)).toEqual({ ok: true });
    const stored = await getSettings(db());
    expect(stored.hero_headline_de).toBe("Hallen, Rauch, Gänsehaut.");
    expect(stored.contact_email).toBe("hallo@cosmo-photos.de");
  });

  it("overwrites on second save and clears with empty strings", async () => {
    await saveSettings(db(), valid);
    await saveSettings(db(), { ...valid, instagram_url: "" });
    expect((await getSettings(db())).instagram_url).toBe("");
  });

  it("reports field errors in German and stores nothing", async () => {
    const result = await saveSettings(db(), {
      ...valid,
      contact_email: "keine-mail",
      pictrs_url: "http://unsicher.example",
      about_portrait_id: "../../etc",
      hero_headline_de: "x".repeat(121),
    });
    expect(result).toEqual({
      ok: false,
      errors: {
        contact_email: "Keine gültige E-Mail-Adresse.",
        pictrs_url: "Bitte eine vollständige https-Adresse angeben.",
        about_portrait_id: "Ungültige Bild-ID.",
        hero_headline_de: "Höchstens 120 Zeichen.",
      },
    });
    expect(await getSettings(db())).toEqual(SETTINGS_DEFAULTS);
  });

  it("ignores unknown keys and treats missing keys as empty", async () => {
    expect(await saveSettings(db(), { hero_headline_de: "Nur das", fremd: "x" })).toEqual({ ok: true });
    const stored = await getSettings(db());
    expect(stored.hero_headline_de).toBe("Nur das");
    expect("fremd" in stored).toBe(false);
  });
});
```

`test/e2e/admin-settings.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin";
import { makeJpeg } from "./helpers/images";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/texte");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Texte & Links");
});

test("Texte speichern und nach dem Neuladen wiederfinden", async ({ page }) => {
  await page.getByLabel("Hero-Headline (DE)").fill("Hallen, Rauch, Gänsehaut.");
  await page.getByLabel("Kontakt-E-Mail").fill("hallo@cosmo-photos.de");
  await page.getByLabel("Referenzen").fill("ETV Hamburg\nFZ17\nUnihoc");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  await page.reload();
  await expect(page.getByLabel("Hero-Headline (DE)")).toHaveValue("Hallen, Rauch, Gänsehaut.");
  await expect(page.getByLabel("Referenzen")).toHaveValue("ETV Hamburg\nFZ17\nUnihoc");
});

test("ungültige Eingaben zeigen Fehler am Feld", async ({ page }) => {
  await page.getByLabel("Kontakt-E-Mail").fill("keine-mail");
  await page.getByLabel("Instagram").fill("http://instagram.com/x");
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Keine gültige E-Mail-Adresse.")).toBeVisible();
  await expect(page.getByText("Bitte eine vollständige https-Adresse angeben.")).toBeVisible();
});

test("Porträt hochladen, speichern und behalten", async ({ page }) => {
  const portrait = await makeJpeg(page, 1200, 1800, "#334155");
  await page.getByLabel("Porträt wählen").setInputFiles({ name: "felix.jpg", mimeType: "image/jpeg", buffer: portrait });
  await expect(page.getByRole("img", { name: "Porträt-Vorschau" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByRole("status")).toHaveText("Gespeichert.");

  await page.reload();
  const preview = page.getByRole("img", { name: "Porträt-Vorschau" });
  await expect(preview).toHaveAttribute("src", /^\/media\/site\/[0-9a-f-]{36}\/800$/);
});
```

```bash
npm test
npm run test:e2e -- admin-settings.spec.ts
```
Erwartet: Beide FAIL (`@/lib/settings/…` fehlt, `/admin/texte` liefert 404).

- [ ] **Schritt 2: Einstellungen implementieren**

`src/lib/settings/schema.ts`:

```ts
import { z } from "zod";
import { isUuid } from "@/lib/media/keys";

const text = (max: number) => z.string().trim().max(max, `Höchstens ${max} Zeichen.`);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
};

/** Alle pflegbaren Texte und Links (Spec §8). Leerer String = nicht gesetzt. */
export const settingsSchema = z.object({
  hero_headline_de: text(120),
  hero_headline_en: text(120),
  about_statement_de: text(200),
  about_statement_en: text(200),
  about_text_de: text(5000),
  about_text_en: text(5000),
  about_portrait_id: z.string().trim().refine((v) => v === "" || isUuid(v), "Ungültige Bild-ID."),
  references: text(2000),
  contact_email: z.string().trim().refine((v) => v === "" || EMAIL.test(v), "Keine gültige E-Mail-Adresse."),
  instagram_url: z.string().trim().refine((v) => v === "" || isHttpsUrl(v), "Bitte eine vollständige https-Adresse angeben."),
  pictrs_url: z.string().trim().refine((v) => v === "" || isHttpsUrl(v), "Bitte eine vollständige https-Adresse angeben."),
  imprint_de: text(50000),
  imprint_en: text(50000),
  privacy_de: text(50000),
  privacy_en: text(50000),
});

export type Settings = z.infer<typeof settingsSchema>;
export const SETTINGS_KEYS = Object.keys(settingsSchema.shape) as (keyof Settings)[];
export const SETTINGS_DEFAULTS = Object.fromEntries(SETTINGS_KEYS.map((key) => [key, ""])) as Settings;
```

`src/lib/settings/repo.ts`:

```ts
import { inArray } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, settingsSchema, type Settings } from "./schema";

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.select().from(settings).where(inArray(settings.key, SETTINGS_KEYS));
  return { ...SETTINGS_DEFAULTS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
}

export type SaveResult = { ok: true } | { ok: false; errors: Partial<Record<keyof Settings, string>> };

/** Speichert alle bekannten Felder atomar; fehlende gelten als leer, unbekannte werden ignoriert. */
export async function saveSettings(db: Db, input: unknown): Promise<SaveResult> {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const candidate = Object.fromEntries(SETTINGS_KEYS.map((key) => [key, typeof raw[key] === "string" ? raw[key] : ""]));
  const parsed = settingsSchema.safeParse(candidate);
  if (!parsed.success) {
    const errors: Partial<Record<keyof Settings, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof Settings;
      errors[key] ??= issue.message;
    }
    return { ok: false, errors };
  }
  const [first, ...rest] = SETTINGS_KEYS.map((key) =>
    db.insert(settings).values({ key, value: parsed.data[key] }).onConflictDoUpdate({ target: settings.key, set: { value: parsed.data[key] } }),
  );
  await db.batch([first, ...rest]);
  return { ok: true };
}
```

```bash
npm test
```
Erwartet: 12 Testdateien, 55 Tests PASS.

- [ ] **Schritt 3: Seite, Formular und Aktion**

`src/app/admin/(protected)/texte/actions.ts`:

```ts
"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { getDb } from "@/lib/env";
import { saveSettings } from "@/lib/settings/repo";
import type { Settings } from "@/lib/settings/schema";

export type SettingsState = { ok?: boolean; errors?: Partial<Record<keyof Settings, string>> };

export async function saveSettingsAction(_previous: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const input = Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith("$")).map(([key, value]) => [key, typeof value === "string" ? value : ""]),
  );
  const result = await saveSettings(getDb(), input);
  return result.ok ? { ok: true } : { errors: result.errors };
}
```

`src/app/admin/(protected)/texte/portrait-field.tsx`:

```tsx
"use client";

import { useState } from "react";
import { processImage } from "@/lib/image/process";
import { uploadVariants } from "@/lib/image/upload";
import { mediaUrl } from "@/lib/media/keys";

export function PortraitField({ initialId }: { initialId: string }) {
  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      setId(await uploadVariants("site", await processImage(file)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm">Porträt (Über mich)</legend>
      {id && (
        // eslint-disable-next-line @next/next/no-img-element -- Bild kommt fertig skaliert aus R2
        <img src={mediaUrl("site", id, 800)} alt="Porträt-Vorschau" className="w-40 bg-mat p-2" />
      )}
      <input type="hidden" name="about_portrait_id" value={id} />
      <div className="flex gap-4 text-sm">
        <label className="cursor-pointer underline">
          Porträt wählen
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
          />
        </label>
        {id && (
          <button type="button" className="underline" onClick={() => setId("")}>
            Entfernen
          </button>
        )}
        {busy && <span className="text-stone">Wird hochgeladen …</span>}
        {error && (
          <span role="alert" className="text-signal">
            {error}
          </span>
        )}
      </div>
    </fieldset>
  );
}
```

`src/app/admin/(protected)/texte/settings-form.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import type { Settings } from "@/lib/settings/schema";
import { saveSettingsAction, type SettingsState } from "./actions";
import { PortraitField } from "./portrait-field";

type Field = { key: keyof Settings; label: string; multiline?: boolean; type?: "email" | "url" };

const GROUPS: { title: string; fields: Field[] }[] = [
  { title: "Startseite", fields: [
    { key: "hero_headline_de", label: "Hero-Headline (DE)" },
    { key: "hero_headline_en", label: "Hero-Headline (EN)" },
  ] },
  { title: "Über mich", fields: [
    { key: "about_statement_de", label: "Statement (DE)" },
    { key: "about_statement_en", label: "Statement (EN)" },
    { key: "about_text_de", label: "Text (DE)", multiline: true },
    { key: "about_text_en", label: "Text (EN)", multiline: true },
    { key: "references", label: "Referenzen", multiline: true },
  ] },
  { title: "Kontakt & Links", fields: [
    { key: "contact_email", label: "Kontakt-E-Mail", type: "email" },
    { key: "instagram_url", label: "Instagram", type: "url" },
    { key: "pictrs_url", label: "pictrs-Shop", type: "url" },
  ] },
  { title: "Rechtliches", fields: [
    { key: "imprint_de", label: "Impressum (DE)", multiline: true },
    { key: "imprint_en", label: "Impressum (EN)", multiline: true },
    { key: "privacy_de", label: "Datenschutz (DE)", multiline: true },
    { key: "privacy_en", label: "Datenschutz (EN)", multiline: true },
  ] },
];

const control = "mt-1 block w-full border border-ink/20 bg-paper px-3 py-2";

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettingsAction, {});
  return (
    <form action={action} className="max-w-3xl space-y-12" noValidate>
      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-5">
          <h2 className="font-label text-xs text-stone">{group.title}</h2>
          {group.title === "Über mich" && <PortraitField initialId={settings.about_portrait_id} />}
          {group.fields.map((field) => {
            const error = state.errors?.[field.key];
            const describedBy = error ? `${field.key}-error` : undefined;
            return (
              <label key={field.key} className="block text-sm">
                {field.label}
                {field.multiline ? (
                  <textarea name={field.key} defaultValue={settings[field.key]} rows={field.key.startsWith("about_text") ? 8 : 6} className={control} aria-describedby={describedBy} aria-invalid={!!error} />
                ) : (
                  <input name={field.key} type={field.type ?? "text"} defaultValue={settings[field.key]} className={control} aria-describedby={describedBy} aria-invalid={!!error} />
                )}
                {error && (
                  <span id={describedBy} className="mt-1 block text-signal">
                    {error}
                  </span>
                )}
              </label>
            );
          })}
        </section>
      ))}
      <div className="flex items-center gap-6">
        <button type="submit" disabled={pending} className="bg-ink px-8 py-3 text-paper disabled:opacity-60">
          {pending ? "Speichere …" : "Speichern"}
        </button>
        {state.ok && (
          <p role="status" className="text-sm">
            Gespeichert.
          </p>
        )}
        {state.errors && (
          <p role="alert" className="text-sm text-signal">
            Bitte die markierten Felder prüfen.
          </p>
        )}
      </div>
    </form>
  );
}
```

`src/app/admin/(protected)/texte/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getDb } from "@/lib/env";
import { getSettings } from "@/lib/settings/repo";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Texte & Links" };

export default async function SettingsPage() {
  const settings = await getSettings(getDb());
  return (
    <div>
      <h1 className="font-display text-5xl">Texte &amp; Links</h1>
      <p className="mt-4 max-w-xl text-sm text-stone">
        Leere Felder werden auf der Website ausgeblendet oder durch Standardtexte ersetzt. Rechtstexte gern aus einem Generator einfügen.
      </p>
      <div className="mt-10">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
```

- [ ] **Schritt 4: Wächter für Server Actions (Review-Fokus 1), Test zuerst**

`scripts/check-server-actions.mjs`:

```js
// Jede Datei mit "use server" muss die Anmeldung selbst prüfen (requireAdmin). Das Layout schützt nur Seiten,
// Server Actions sind direkt aufrufbar. Ausnahme: die Login-Aktion, die die Anmeldung erst erzeugt.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOW = new Set(["src/app/admin/login/actions.ts"]);
const unguarded = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("._")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(entry)) {
      const source = readFileSync(path, "utf8");
      if (/^\s*["']use server["']/m.test(source) && !ALLOW.has(path) && !source.includes("requireAdmin(")) unguarded.push(path);
    }
  }
}

walk("src");
if (unguarded.length > 0) {
  console.error(`Server Actions ohne requireAdmin():\n  ${unguarded.join("\n  ")}`);
  process.exit(1);
}
console.log("Server Actions geprüft: alle geschützt.");
```

In `package.json` das Lint-Script ersetzen durch:

```json
"lint": "eslint && node scripts/check-server-actions.mjs"
```

Probe (RED → GREEN):

```bash
printf '"use server";\nexport async function x() {}\n' > src/app/admin/probe-action.ts
npm run lint; echo "exit $?"
rm src/app/admin/probe-action.ts
npm run lint; echo "exit $?"
```
Erwartet: Erst `exit 1` mit „Server Actions ohne requireAdmin(): src/app/admin/probe-action.ts“, danach `exit 0` mit „Server Actions geprüft: alle geschützt.“

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün (inkl. Wächter), Unit 55 PASS, E2E 35 PASS.

- [ ] **Schritt 6: Commit**

```bash
git add -A
git commit -m "feat(admin): texts, links and portrait settings; guard server actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: README, Secrets, Deployment und Live-Test

**Dateien:**
- Erstellen: `scripts/e2e-deployed.sh`
- Ändern: `README.md` (komplett), `package.json`, `.gitignore`

**Schnittstellen:**
- Stellt bereit:
  - Scripts `test:e2e:preview`, `test:e2e:prod`
  - Secrets `SESSION_SECRET` und `ADMIN_PASSWORD_HASH` in Produktion und Vorschau

- [ ] **Schritt 1: Skript für Tests gegen Deployments**

`scripts/e2e-deployed.sh`:

```bash
#!/usr/bin/env bash
# E2E gegen ein Deployment. Die Vorschau nutzt ein zufälliges Test-Passwort aus .env.e2e.local (nicht im Git).
# Aufruf: bash scripts/e2e-deployed.sh <preview|prod> [playwright-Argumente …]
set -euo pipefail
TARGET="$1"; shift
case "$TARGET" in
  preview) export PLAYWRIGHT_BASE_URL="https://cosmo-web-preview.felix-vatterodt.workers.dev" ;;
  prod)    export PLAYWRIGHT_BASE_URL="https://cosmo-web.felix-vatterodt.workers.dev" ;;
  *) echo "Ziel muss preview oder prod sein." >&2; exit 1 ;;
esac
if [ -f .env.e2e.local ]; then set -a; . ./.env.e2e.local; set +a; fi
npx playwright test "$@"
```

Scripts in `package.json` ergänzen:

```json
"test:e2e:preview": "bash scripts/e2e-deployed.sh preview",
"test:e2e:prod": "bash scripts/e2e-deployed.sh prod routing.spec.ts design-system.spec.ts admin-auth.spec.ts -g \"ohne Anmeldung|gefälscht|Clickjacking|Robust|Deutsch|Englisch|Spracherkennung|Nicht lokalisierte|Tokens|Schriften\""
```

Prüfen, dass `.env.e2e.local` vom bestehenden Muster `.env*` in `.gitignore` erfasst wird:

```bash
git check-ignore -v .env.e2e.local
```
Erwartet: `.gitignore:…:.env*	.env.e2e.local`.

- [ ] **Schritt 2: Secrets für die Vorschau setzen**

```bash
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put SESSION_SECRET --env=preview
E2E_PW="vorschau-$(openssl rand -hex 12)"
printf 'E2E_ADMIN_USER=felix\nE2E_ADMIN_PASSWORD=%s\n' "$E2E_PW" > .env.e2e.local
ADMIN_PASSWORD="$E2E_PW" node scripts/hash-password.mts | npx wrangler secret put ADMIN_PASSWORD_HASH --env=preview
npx wrangler secret list --env=preview
```
Erwartet: Beide Secrets stehen in der Liste. Das Vorschau-Passwort liegt nur lokal in `.env.e2e.local`.

- [ ] **Schritt 3: Vorschau deployen und live testen**

```bash
npm run check:lock
CI=true npm run deploy:preview
npm run test:e2e:preview
```
Erwartet: Deploy erfolgreich, alle 35 E2E-Tests PASS gegen die Vorschau.

- [ ] **Schritt 4: 👤 Secrets für die Produktion setzen**

Das Session-Secret kann der Ausführende setzen:

```bash
openssl rand -base64 48 | tr -d '\n' | npx wrangler secret put SESSION_SECRET
```

👤 **Felix** wählt sein Admin-Passwort selbst (verdeckte Eingabe, mindestens 12 Zeichen):

```bash
npm run admin:password
```
Erwartet: „ADMIN_PASSWORD_HASH gesetzt.“ Dann `npx wrangler secret list` zeigt beide Secrets.

- [ ] **Schritt 5: README neu schreiben**

`README.md` komplett ersetzen:

````markdown
# Cosmo Photos – Website

Next.js 16 auf Cloudflare Workers (OpenNext), D1 (Datenbank), R2 (Bilder).
Spec und Pläne: `docs/superpowers/`.

## Voraussetzungen

- Das Projekt liegt im Disk-Image `SSD FELIX 3/CODING/CosmoDev.sparsebundle`.
  Nach jedem Neustart per Doppelklick einhängen, dann liegt es unter `/Volumes/CosmoDev/cosmo-website`.
- Node 24 (`.node-version`), npm 11 lokal. **Cloudflare baut mit npm 10.9.2.**
- Einmalig: `npx wrangler login`, `npx playwright install chromium`.

## Entwicklung

| Befehl | Zweck |
|---|---|
| `npm run dev` | Next-Dev-Server (lokale D1/R2 aus `.wrangler/`) |
| `npm run preview` | Build und Vorschau in der echten Workers-Laufzeit (:8787) |
| `npm run lint` | ESLint und Prüfung, dass jede Server Action die Anmeldung prüft |
| `npm test` | Unit-Tests in workerd |
| `npm run test:e2e` | Browser-Tests gegen eine frische lokale Vorschau |
| `npm run db:generate -- --name <name>` | Neue Migration aus `src/lib/db/schema.ts` |
| `npm run db:migrate:local` / `:remote` / `:preview` | Migrationen anwenden |

Lokale Zugangsdaten für `/admin`: Benutzer `felix`, Passwort `lokal-test-passwort` (aus `.dev.vars`, nur lokal).

## Abhängigkeiten ändern

```bash
npm install --save-exact <paket>@<version>
npm run deps:lock   # Lock-Datei mit npm 10.9.2 erzeugen und prüfen
npm ci
```
Ohne `deps:lock` scheitert der Cloudflare-Build.

## Deployment

- **Produktion:** Jeder Push auf `main` baut und deployt automatisch (Cloudflare Workers Builds, Worker `cosmo-web`).
- **Vorschau:** `npm run deploy:preview` (Worker `cosmo-web-preview`, eigene D1/R2).
- **Tests gegen Deployments:** `npm run test:e2e:preview` (Vorschau-Passwort in `.env.e2e.local`), `npm run test:e2e:prod` (ohne Login).

## Secrets

| Name | Wo | Setzen |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | Produktion, Vorschau | `npm run admin:password` (bzw. `-- --env=preview`) |
| `SESSION_SECRET` | Produktion, Vorschau | `openssl rand -base64 48 \| tr -d '\n' \| npx wrangler secret put SESSION_SECRET` |

Admin-Benutzername: `ADMIN_USERNAME` in `wrangler.jsonc` (`felix`).
````

- [ ] **Schritt 6: Commit, Push und Produktions-Test**

```bash
npm run lint && npm test && npm run check:lock
git add -A
git commit -m "docs: README; e2e against deployments; admin secrets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push origin main
```

Warten, bis Workers Builds fertig ist: `https://cosmo-web.felix-vatterodt.workers.dev/admin/login` liefert 200. Dann:

```bash
npm run test:e2e:prod
```
Erwartet: Alle ausgewählten Tests PASS. 👤 Felix meldet sich unter `/admin/login` mit seinem Passwort an und lädt probeweise ein Bild hoch.

---

## Abschluss von Plan 2 (Definition of Done)

- `npm run lint` grün (inkl. Server-Action-Wächter), `npm test` 12 Dateien / 55 Tests, `npm run test:e2e` 35 Tests.
- Vorschau: alle 35 E2E-Tests PASS. Produktion: Auswahl ohne Login PASS, Felix' Login funktioniert.
- `npm run check:lock` grün, Secrets in beiden Umgebungen gesetzt, README aktuell.

---

## Review nach Abschluss (2026-09-25)

**Status:** ✅ abgeschlossen und auf `main` gepusht (Produktion per Workers Builds).
**Tests:**
- lokal: `npm run lint` grün (inkl. Server-Action-Wächter), `npm test` 13 Dateien / 57 Tests, `npm run test:e2e` 48 Tests (Chromium und WebKit/Safari)
- Vorschau live: 40/40 (Chromium)
- Produktion: Auswahl ohne Login

### Abweichungen und Entscheidungen

| Punkt | Entscheidung | Grund |
|---|---|---|
| `.dev.vars` | Hash **ohne** Maskierung von `$` | Wrangler liest `.dev.vars` mit `dotenv.parse` ohne Variablen-Ersetzung; die Maskierung aus Task 1 hatte den lokalen Login gebrochen und wurde zurückgenommen |
| E2E-Login | Setup-Projekt `auth.setup.ts` speichert **eine** Admin-Sitzung (`test/e2e/.auth/`, nicht im Git) | Das echte Rate-Limit (5/min) hätte die eigenen Tests blockiert |
| E2E-Meldungen | `alert`-Prüfungen auf `form`/`main` eingegrenzt | Next.js blendet einen Seitenwechsel-Ansager mit `role="alert"` ein |
| Geschützte Seiten im Test | Liste wächst mit Task 6/7 | Seiten existierten in Task 2 noch nicht |
| Portfolio-Karten | Änderungen sofort sichtbar (optimistisch); bei Fehler wird der Server-Stand neu geladen | Häkchen sprang erst nach der Antwort um; Momentaufnahmen liefen bei parallelen Uploads auseinander (Review) |
| Upload | Eine seitenweite Warteschlange (max. 3), Ordner-Auswahl und Ordner-Drop, Meldung übersprungener Dateien (auch `._`), Hinweis bei abgelaufener Anmeldung und „Alle fehlgeschlagenen erneut versuchen“ | Review-Befunde 2 und 3, Spec §3.3 („Ordner“) |
| Safari | Playwright-Projekt `webkit` für `admin-portfolio.spec.ts` | Bildverarbeitung (Worker, OffscreenCanvas, EXIF, Fallback) auch in Safaris Engine abgesichert |
| Deployment-Tests | `test:e2e:prod` mit `--no-deps` | Produktion ohne Test-Zugangsdaten |
| Reihenfolge Task 8 | Review und Vorschau vor Felix' Passwort und vor dem Push | Push = Produktions-Deployment |

### Für spätere Pläne

- **Plan 3 (Galerien):**
  - Originale **streamen** (die Medien-Route puffert den Body).
  - Eigener Upload-Weg für Originale, nicht die 10-MB-Varianten-Route.
  - Doppelte UUID liefert 409 statt 500.
- **Plan 3/6:** Eine R2-Custom-Domain gibt den **ganzen** Bucket frei. Galerien brauchen deshalb einen eigenen Bucket oder bleiben hinter einer Worker-Route mit Zugangsprüfung.
- **Plan 4 (öffentliche Seiten):**
  - `srcset`-Breiten = `min(Größe, längste Kante)`.
  - Hero und Kapitel nur aus sichtbaren Bildern.
  - `saveSettings` behandelt fehlende Felder als leer, also nur vollständige Formulare senden.
- **Kleinere Punkte (aufgeschoben):**
  - Skalierung als Kette 2400 → 1600 → 800 (weniger CPU).
  - Der Server-Action-Wächter prüft pro Datei, nicht pro Aktion.
  - Es gibt keinen E2E-Test für die Einstellungs-Aktion ohne Anmeldung.
  - Parallele Uploads bekommen ggf. dieselbe Sortierzahl.
  - Verwaiste R2-Dateien (ausgetauschtes Porträt, fehlgeschlagene Varianten), und es fehlt der Hinweis „Porträt erst nach Speichern übernommen“.
  - Secure-Cookie auf `http://localhost` in älteren Safari-Versionen.
  - Abmelden entwertet Tokens nicht serverseitig (bei Verdacht `SESSION_SECRET` rotieren).
  - Uploads erscheinen in der Reihenfolge ihres Abschlusses.
- **Akzeptiert:**
  - Rate-Limit pro Cloudflare-Standort und IP (ein Admin, PBKDF2)
  - `/media` ohne Edge-Cache bis Plan 6
