# Plan 1 · Fundament: Implementierungsplan

> **Für agentische Worker:** PFLICHT-SUB-SKILL: superpowers:subagent-driven-development (empfohlen) oder superpowers:executing-plans, um diesen Plan Task für Task umzusetzen. Schritte nutzen Checkbox-Syntax (`- [ ]`) zum Abhaken.

**Ziel:** Ein lauffähiges, getestetes Grundgerüst der neuen Cosmo-Website auf Cloudflare. Es umfasst:
- Next.js 16 mit dem OpenNext-Adapter
- D1-Datenbankschema und R2-Anbindung
- DE/EN-Routing mit lokalisierten Pfaden
- Designsystem-Tokens und Schriften
- Deployment für Produktion und Vorschau

Inhalte sind noch Platzhalter.

**Architektur:** Next.js (App Router) läuft über `@opennextjs/cloudflare` auf Cloudflare Workers.
- **Daten:** D1 (per Drizzle ORM), Dateien in R2, beide als Bindings `DB` und `MEDIA`.
- **Sprachen:** next-intl mit `localePrefix: 'as-needed'` und lokalisierten Pfaden. Die Weiche ist eine **Edge-`middleware.ts`**, denn Next-16-`proxy.ts` läuft auf Node, und das unterstützt OpenNext nicht.
- **Tests:**
  - Unit-Tests laufen in der echten Workers-Laufzeit (`@cloudflare/vitest-plugin`).
  - E2E-Tests (Playwright) laufen gegen `opennextjs-cloudflare preview`, also ebenfalls in workerd.

**Tech-Stack:** next 16.3.6 · react 19 · @opennextjs/cloudflare 1.20.6 · wrangler 4.138.0 · next-intl 4.14.7 · drizzle-orm 0.45.3 / drizzle-kit 0.31.11 · Tailwind CSS 4 · vitest 4.1.11 + @cloudflare/vitest-plugin 1.2.5 · @playwright/test 1.63.0 · Node 24

**Spec:** `docs/superpowers/specs/2026-09-24-cosmo-website-design.md`. Betroffen sind die Abschnitte 3.1, 3.2, 4.1, 4.2, 9, 12 und 14 (Phase 1).

## Planreihe

Die Spec wird in 6 Plänen umgesetzt, einem pro Phase (Spec §14). Jeder Plan wird erst zu Beginn seiner Phase geschrieben, auf Basis des dann existierenden Codes.

| Plan | Phase | Status |
|---|---|---|
| **1 · Fundament** | Setup, Datenbank, Routing, Tokens, Deploy | **dieser Plan** |
| 2 · Admin-Kern | Login, Upload-Pipeline, Portfolio-Verwaltung, Texte | folgt |
| 3 · Kundengalerien | Galerien, Passwort, Favoriten, Statistik, `zip-stream` | folgt |
| 4 · Öffentliche Seiten | Start, Kategorien, Lightbox, Über mich, Kontakt, Pflichtseiten | folgt |
| 5 · Bewegung | Intro „Orbit“, Lenis, „Licht aus“, Parallaxe, Übergänge | folgt |
| 6 · Launch | SEO, Performance, Barrierefreiheit, Domain-Umzug | folgt |

## Globale Vorgaben

- Projektwurzel: `/Volumes/SSD FELIX 3/CODING/Cosmo Website neu`. Das Laufwerk ist **exFAT**, macOS legt dort `._*`-Dateien an. Die dürfen nie Build, Lint, Tests oder Migrationen brechen und nie committet werden.
- Versionen exakt wie im Tech-Stack oben. `next` und `eslint-config-next` liegen auf `16.3.6`.
- **Kein `proxy.ts`.** Die Sprach-Weiche ist `src/middleware.ts` (Edge-Runtime). Die Deprecation-Warnung von Next 16 ist erwartet.
- Sprachen `de` (Standard, ohne Präfix) und `en` (mit Präfix `/en`). Pfade exakt nach Spec §3.2: `/floorball`, `/volleyball`, `/fussball`→`/en/football`, `/hochzeiten`→`/en/weddings`, `/studio`, `/ueber-mich`→`/en/about`, `/kontakt`→`/en/contact`, `/kunden`→`/en/clients`, `/impressum`→`/en/imprint`, `/datenschutz`→`/en/privacy`.
- `/g/…`, `/admin…` und `/api/…` sind **nicht** lokalisiert und werden von der Middleware nie angefasst.
- Kategorie-Werte (DB und DE-Pfad): `floorball`, `volleyball`, `fussball`, `hochzeiten`, `studio`.
- Farb-Tokens exakt: `paper #F1EFEA`, `ink #141414`, `stone #8B877E`, `mat #FFFFFF`, `hall #0B0B0C`, `hall-ink #ECEAE4`, `signal #FF3D2E`.
- Schriften nur über `next/font/google`, also beim Build selbst gehostet: Bodoni Moda (Achse `opsz`), Archivo (Achse `wdth`), Martian Mono (Achse `wdth`). **Zur Laufzeit keine Anfragen an Google.**
- DB-Tabellen und -Spalten exakt nach Spec §9, Spalten in `snake_case`.
- Worker-Namen: `cosmo-web` (Produktion) und `cosmo-web-preview` (Vorschau). D1: `cosmo-db` / `cosmo-db-preview`. R2: `cosmo-media` / `cosmo-media-preview`.
- Commit-Messages im Conventional-Commits-Stil, abgeschlossen mit der Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Mit 👤 markierte Schritte braucht Felix (Konto-Zugänge, Browser-Logins). Dort anhalten und fragen.

## Review-Fokus

1. **`._*`-Dateien auf exFAT.** Eine `._x.tsx` im `src/`-Baum oder eine `._0000_init.sql` in `drizzle/` darf Build, Lint und Migrationen nicht brechen. Erwartung: Sie werden vorher entfernt bzw. ignoriert. *Test: Task 1, Schritt 6 (Probe-Datei) und Task 3, Schritt 9 (Probe-SQL).*
2. **Middleware-Matcher.** `/admin`, `/g/<slug>`, `/api/…` und Dateien wie `/favicon.ico` werden nie umgeleitet oder mit `/en` versehen, auch nicht bei englischem Browser. *Test: Task 4, `routing.spec.ts` → „Nicht lokalisierte Bereiche“.*
3. **Seltsame URLs:** `/fu%C3%9Fball` (ß), unbekannte Kategorie, tief verschachtelter unbekannter Pfad, Schrägstrich am Ende. Erwartung: 404 oder Weiterleitung auf die richtige Seite, **nie 500**. *Test: Task 4, „Robust gegen seltsame URLs“.*
4. **Browsersprache.** Ein englischer Browser landet auf `/` → `/en`. Ein deutscher Browser bleibt auf `/`. `/de/...` wird zu `/...`. *Test: Task 4, „Spracherkennung“ und „/de-Präfix“.*
5. **Fehlendes Binding in einer Umgebung,** z. B. vergessenes `MEDIA` in `env.preview`. Erwartung: klare Fehlermeldung mit dem Binding-Namen statt `undefined`-Crash. *Test: Task 3, `bindings.test.ts`.*

---

## Dateistruktur nach Plan 1

```
.
├── .gitignore  .node-version  .dev.vars (lokal, ignoriert)  .dev.vars.example
├── package.json  tsconfig.json  next.config.ts  eslint.config.mjs  postcss.config.mjs
├── open-next.config.ts        # OpenNext: Static-Assets-Cache für SSG
├── wrangler.jsonc             # Worker, Bindings DB/MEDIA, env.preview
├── cloudflare-env.d.ts        # generiert (npm run cf-typegen), committet
├── drizzle.config.ts  drizzle/0000_init.sql (+ meta/)
├── vitest.config.ts  playwright.config.ts
├── public/_headers            # Immutable-Cache für /_next/static
├── brand/                     # Logo-Original, Porträt (existiert schon)
├── docs/superpowers/…         # Spec & Pläne (existiert schon)
├── src/
│   ├── middleware.ts          # next-intl-Weiche (Edge)
│   ├── i18n/pathnames.ts      # reine Daten: Locales + lokalisierte Pfade
│   ├── i18n/routing.ts        # defineRouting(...)
│   ├── i18n/navigation.ts     # Link, redirect, usePathname, getPathname
│   ├── i18n/request.ts        # Messages je Locale
│   ├── messages/de.json  en.json
│   ├── lib/categories.ts      # CATEGORIES, isCategory
│   ├── lib/bindings.ts        # assertBindings (rein, testbar)
│   ├── lib/env.ts             # getEnv(), getDb() – nur serverseitig
│   ├── lib/db/schema.ts  lib/db/client.ts
│   ├── components/placeholder-page.tsx
│   └── app/
│       ├── globals.css  fonts.ts  favicon.ico  global-not-found.tsx
│       └── [locale]/layout.tsx  page.tsx  not-found.tsx
│           ├── [category]/page.tsx  [...rest]/page.tsx
│           └── ueber-mich/ kontakt/ kunden/ impressum/ datenschutz/  (je page.tsx)
└── test/
    ├── tsconfig.json  env.d.ts  setup/apply-migrations.ts
    ├── unit/categories.test.ts  bindings.test.ts  db-schema.test.ts  pathnames.test.ts
    └── e2e/routing.spec.ts  design-system.spec.ts
```

---

### Task 1: Projekt-Grundgerüst, Git und exFAT-Hygiene

**Dateien:**
- Erstellen (per Scaffold): `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/*`, `public/*`
- Erstellen: `.node-version`
- Ändern: `.gitignore`, `package.json` (Scripts), `tsconfig.json` (exclude), `eslint.config.mjs` (Ignores)
- Löschen: `public/*.svg` aus dem Scaffold

**Schnittstellen:**
- Stellt bereit: Script `npm run clean:dot`. Alle späteren Tasks hängen ihn vor Build, Lint, Tests und Migrationen.

- [ ] **Schritt 1: Git-Repo anlegen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Website neu"
git init -b main
```
Erwartet: `Initialized empty Git repository …`

- [ ] **Schritt 2: Next.js 16 in einen Hilfsordner scaffolden und hochziehen**

`create-next-app` verweigert nicht-leere Ordner (hier liegen `brand/`, `docs/` und `.superpowers/`), deshalb der Umweg über einen Hilfsordner.

```bash
npx --yes create-next-app@16.3.6 _scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --yes
rsync -a --exclude '._*' _scaffold/ ./
rm -rf _scaffold
rm -f public/*.svg
npm install
```
Erwartet: `package.json` mit `"next": "16.3.6"`, dazu die Ordner `src/app/` und `node_modules/`. Falls der Scaffold trotz `--yes` nachfragt, die Standardantwort wählen.

- [ ] **Schritt 3: `.gitignore` ergänzen und `.node-version` anlegen**

Ans Ende von `.gitignore` anhängen:

```gitignore

# macOS / exFAT-Metadaten
._*
.DS_Store

# Brainstorming-Mockups (lokal)
.superpowers/
```

`.node-version` anlegen, Inhalt:

```
24
```

- [ ] **Schritt 4: Aufräum-Script und Hooks in `package.json`**

Den `scripts`-Block von `package.json` durch diesen ersetzen:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "clean:dot": "find . \\( -path ./node_modules -o -path ./.git \\) -prune -o -name '._*' -type f -exec rm -f {} +",
  "prebuild": "npm run clean:dot",
  "prelint": "npm run clean:dot"
}
```

- [ ] **Schritt 5: TypeScript und ESLint ignorieren `._*`**

In `tsconfig.json` den `exclude`-Eintrag ersetzen durch:

```json
"exclude": ["node_modules", "test", ".open-next", "**/._*"]
```

`eslint.config.mjs` komplett ersetzen durch:

```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "cloudflare-env.d.ts",
    "**/._*",
  ]),
]);

export default eslintConfig;
```

- [ ] **Schritt 6: Probe: eine `._`-Datei darf nichts brechen (Review-Fokus 1)**

```bash
printf '\x00\x05\x16\x07binary-appledouble' > src/app/._probe.tsx
npm run lint && npm run build
test ! -e src/app/._probe.tsx && echo "PROBE ENTFERNT"
```
Erwartet: Lint ohne Fehler, `next build` erfolgreich, Ausgabe `PROBE ENTFERNT`.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git status --short | grep -E '(^|/)\._' && echo "FEHLER: ._-Datei im Index" || echo "sauber"
git commit -m "chore: scaffold Next.js 16 app with exFAT-safe tooling

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Erwartet: `sauber` und danach ein erfolgreicher Commit. `brand/` und `docs/` sind mit eingecheckt.

---

### Task 2: Cloudflare-Adapter (OpenNext) mit lokaler Vorschau in workerd

**Dateien:**
- Erstellen: `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars`, `.dev.vars.example`, `public/_headers`, `cloudflare-env.d.ts` (generiert)
- Ändern: `next.config.ts`, `package.json`, `tsconfig.json`, `.gitignore`

**Schnittstellen:**
- Stellt bereit: `npm run preview`, das die App auf `http://localhost:8787` in workerd startet (Task 4 nutzt das für Playwright). Außerdem `npm run cf-typegen` für den globalen Typ `CloudflareEnv`.

- [ ] **Schritt 1: Pakete installieren**

```bash
npm install @opennextjs/cloudflare@1.20.6
npm install -D wrangler@4.138.0
```

- [ ] **Schritt 2: `wrangler.jsonc` anlegen**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "cosmo-web",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-08-15",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "binding": "ASSETS",
    "directory": ".open-next/assets"
  },
  "observability": {
    "enabled": true
  }
}
```

- [ ] **Schritt 3: `open-next.config.ts` anlegen**

Die Seiten sind vorerst statisch (SSG). Deshalb liefern wir sie aus den Static Assets, ohne ISR-Infrastruktur.

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
```

- [ ] **Schritt 4: `next.config.ts` ersetzen**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keine Next-Bildoptimierung: Bildgrößen entstehen beim Upload (Spec §3.3).
  images: { unoptimized: true },
};

export default nextConfig;

// Bindings (D1, R2) auch in `next dev` verfügbar machen.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

- [ ] **Schritt 5: Dev-Variablen, Header und `.gitignore`**

`.dev.vars` und `.dev.vars.example` mit identischem Inhalt anlegen:

```
# Lädt .env.development* bei `wrangler dev`
NEXTJS_ENV=development
```

`public/_headers` anlegen:

```
/_next/static/*
  Cache-Control: public,max-age=31536000,immutable
```

An `.gitignore` anhängen:

```gitignore

# OpenNext / Wrangler
/.open-next
.wrangler
.dev.vars*
!.dev.vars.example
```

- [ ] **Schritt 6: Scripts ergänzen**

Im `scripts`-Block von `package.json` hinzufügen (die bestehenden bleiben):

```json
"preview": "opennextjs-cloudflare build && npm run clean:dot && opennextjs-cloudflare preview",
"deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"deploy:preview": "opennextjs-cloudflare build && opennextjs-cloudflare deploy --env=preview",
"upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
"cf-typegen": "wrangler types --env-interface CloudflareEnv ./cloudflare-env.d.ts"
```

- [ ] **Schritt 7: Typen erzeugen und in `tsconfig.json` einbinden**

```bash
npm run cf-typegen
```
Erwartet: `cloudflare-env.d.ts` mit `interface CloudflareEnv extends Cloudflare.Env {}`.

In `tsconfig.json` unter `compilerOptions` setzen bzw. ergänzen:

```json
"target": "es2024",
"types": ["./cloudflare-env.d.ts", "node"]
```

- [ ] **Schritt 8: In workerd bauen und prüfen**

Terminal 1:
```bash
npm run preview
```
Warten auf `Ready on http://localhost:8787`.

Terminal 2:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/
```
Erwartet: `200`. Danach Terminal 1 mit Ctrl+C beenden.

- [ ] **Schritt 9: Commit**

```bash
git add -A
git commit -m "build: run Next.js on Cloudflare Workers via OpenNext

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Datenbankschema (D1 + Drizzle) mit Tests in der Workers-Laufzeit

**Dateien:**
- Erstellen: `vitest.config.ts`, `test/tsconfig.json`, `test/env.d.ts`, `test/setup/apply-migrations.ts`, `test/unit/categories.test.ts`, `test/unit/bindings.test.ts`, `test/unit/db-schema.test.ts`, `src/lib/categories.ts`, `src/lib/bindings.ts`, `src/lib/env.ts`, `src/lib/db/schema.ts`, `src/lib/db/client.ts`, `drizzle.config.ts`, `drizzle/0000_init.sql` (generiert)
- Ändern: `wrangler.jsonc` (Bindings), `package.json`, `cloudflare-env.d.ts` (neu generiert)

**Schnittstellen:**
- Stellt bereit:
  - `CATEGORIES: readonly ['floorball','volleyball','fussball','hochzeiten','studio']`
  - `type Category`, `isCategory(value: string): value is Category` (`src/lib/categories.ts`)
  - `assertBindings(env: Partial<CloudflareEnv>, names: readonly ('DB'|'MEDIA')[]): asserts env is CloudflareEnv` (`src/lib/bindings.ts`)
  - `createDb(d1: D1Database)` und `type Db` (`src/lib/db/client.ts`)
  - `getEnv(): CloudflareEnv` und `getDb(): Db` (`src/lib/env.ts`, nur serverseitig)
  - Tabellen `portfolioImages`, `galleries`, `galleryImages`, `favorites`, `galleryEvents`, `settings` sowie `GALLERY_EVENT_TYPES` (`src/lib/db/schema.ts`)
  - Bindings `DB` (D1) und `MEDIA` (R2)

- [ ] **Schritt 1: Pakete installieren**

```bash
npm install drizzle-orm@0.45.3
npm install -D drizzle-kit@0.31.11 vitest@4.1.11 @cloudflare/vitest-plugin@1.2.5
```

- [ ] **Schritt 2: Test-Infrastruktur anlegen**

`vitest.config.ts`:

```ts
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "drizzle"));

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-08-15",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          r2Buckets: ["MEDIA"],
          // Test-only: Migrationen im Setup anwenden
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    resolve: {
      alias: { "@": path.join(import.meta.dirname, "src") },
    },
    test: {
      include: ["test/unit/**/*.test.ts"],
      exclude: ["**/node_modules/**", "**/._*"],
      setupFiles: ["./test/setup/apply-migrations.ts"],
    },
  };
});
```

`test/setup/apply-migrations.ts`:

```ts
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Setup-Dateien laufen außerhalb der Speicher-Isolation pro Testdatei und evtl. mehrfach.
// applyD1Migrations() wendet nur noch nicht angewandte Migrationen an.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

`test/env.d.ts`:

```ts
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    MEDIA: R2Bucket;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
```

`test/tsconfig.json`:

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/vitest-plugin/types", "./../cloudflare-env.d.ts", "node"]
  },
  "include": ["./**/*.ts", "../src/**/*.ts"],
  "exclude": ["**/._*", "e2e"]
}
```

Leeren Migrationsordner anlegen, damit die Vitest-Konfiguration lädt:

```bash
mkdir -p drizzle
```

Falls das Plugin beim Start einen fehlenden `main`-Einstieg bemängelt: `test/setup/stub-worker.ts` mit `export default { fetch: () => new Response("ok") };` anlegen und in `cloudflareTest({...})` die Option `main: "./test/setup/stub-worker.ts"` ergänzen.

- [ ] **Schritt 3: Scripts ergänzen**

Im `scripts`-Block von `package.json` hinzufügen:

```json
"test": "vitest run",
"pretest": "npm run clean:dot",
"db:generate": "npm run clean:dot && drizzle-kit generate",
"db:migrate:local": "npm run clean:dot && wrangler d1 migrations apply DB --local",
"db:migrate:remote": "npm run clean:dot && wrangler d1 migrations apply DB --remote",
"db:migrate:preview": "npm run clean:dot && wrangler d1 migrations apply DB --remote --env=preview"
```

- [ ] **Schritt 4: Fehlschlagende Tests schreiben**

`test/unit/categories.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES, isCategory } from "@/lib/categories";

describe("categories", () => {
  it("contains exactly the five categories in display order", () => {
    expect(CATEGORIES).toEqual(["floorball", "volleyball", "fussball", "hochzeiten", "studio"]);
  });

  it("accepts known slugs only (case-sensitive, no umlauts)", () => {
    expect(isCategory("fussball")).toBe(true);
    expect(isCategory("fußball")).toBe(false);
    expect(isCategory("Floorball")).toBe(false);
    expect(isCategory("")).toBe(false);
    expect(isCategory("football")).toBe(false);
  });
});
```

`test/unit/bindings.test.ts` (Review-Fokus 5):

```ts
import { describe, expect, it } from "vitest";
import { assertBindings } from "@/lib/bindings";

describe("assertBindings", () => {
  it("passes when all required bindings exist", () => {
    const env = { DB: {}, MEDIA: {} } as unknown as Partial<CloudflareEnv>;
    expect(() => assertBindings(env, ["DB", "MEDIA"])).not.toThrow();
  });

  it("names every missing binding and where to fix it", () => {
    expect(() => assertBindings({} as Partial<CloudflareEnv>, ["DB", "MEDIA"])).toThrow(
      "Missing Cloudflare binding(s): DB, MEDIA – check wrangler.jsonc for this environment.",
    );
  });

  it("names only the missing one", () => {
    const env = { DB: {} } as unknown as Partial<CloudflareEnv>;
    expect(() => assertBindings(env, ["DB", "MEDIA"])).toThrow(/binding\(s\): MEDIA –/);
  });
});
```

`test/unit/db-schema.test.ts`:

```ts
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "@/lib/db/client";
import {
  favorites,
  galleries,
  galleryEvents,
  galleryImages,
  portfolioImages,
  settings,
} from "@/lib/db/schema";

// Speicher ist pro Testdatei isoliert, nicht pro Test: daher eindeutige Slugs.
const db = () => createDb(env.DB);
const uid = () => crypto.randomUUID();

async function insertGallery(slug = `g-${uid().slice(0, 8)}`) {
  const id = uid();
  await db().insert(galleries).values({
    id,
    slug,
    title: "Final4 Zwickau 2026",
    passwordHash: "hash",
    passwordSalt: "salt",
  });
  return id;
}

async function insertImage(galleryId: string, crc32 = 0xcbf43926) {
  const id = uid();
  await db().insert(galleryImages).values({
    id,
    galleryId,
    filename: "IMG_2041.jpg",
    bytes: 18_000_000,
    crc32,
    width: 6000,
    height: 4000,
    color: "#1a1a1a",
    sort: 0,
  });
  return id;
}

/** Drizzle verpackt D1-Fehler; die eigentliche Meldung steckt in `cause`. */
async function errorText(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "";
  } catch (e) {
    const err = e as Error & { cause?: Error };
    return `${err.message} ${err.cause?.message ?? ""}`;
  }
}

describe("D1 schema", () => {
  it("creates galleries as draft with ISO timestamps and no expiry", async () => {
    const id = await insertGallery();
    const [row] = await db().select().from(galleries).where(eq(galleries.id, id));
    expect(row.status).toBe("draft");
    expect(row.expiresAt).toBeNull();
    expect(row.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("rejects duplicate gallery slugs", async () => {
    await insertGallery("same-slug");
    expect(await errorText(insertGallery("same-slug"))).toMatch(/UNIQUE/i);
  });

  it("keeps CRC32 values above 2^31 exact", async () => {
    const g = await insertGallery();
    const img = await insertImage(g, 0xffffffff);
    const [row] = await db().select().from(galleryImages).where(eq(galleryImages.id, img));
    expect(row.crc32).toBe(4294967295);
  });

  it("allows the same favorite for two visitors but not twice for one", async () => {
    const g = await insertGallery();
    const img = await insertImage(g);
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" });
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Tom" });
    expect(
      await errorText(db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" })),
    ).toMatch(/UNIQUE|PRIMARY KEY/i);
  });

  it("deletes images, favorites and events together with the gallery", async () => {
    const g = await insertGallery();
    const img = await insertImage(g);
    await db().insert(favorites).values({ galleryId: g, imageId: img, visitorName: "Anna" });
    await db().insert(galleryEvents).values({ galleryId: g, type: "view" });

    await db().delete(galleries).where(eq(galleries.id, g));

    expect(await db().select().from(galleryImages).where(eq(galleryImages.galleryId, g))).toHaveLength(0);
    expect(await db().select().from(favorites).where(eq(favorites.galleryId, g))).toHaveLength(0);
    expect(await db().select().from(galleryEvents).where(eq(galleryEvents.galleryId, g))).toHaveLength(0);
  });

  it("stores portfolio images visible by default without a role", async () => {
    const id = uid();
    await db().insert(portfolioImages).values({ id, category: "floorball", width: 2400, height: 3600, color: "#b3261e" });
    const [row] = await db().select().from(portfolioImages).where(eq(portfolioImages.id, id));
    expect(row.visible).toBe(true);
    expect(row.role).toBeNull();
    expect(row.sort).toBe(0);
  });

  it("upserts settings by key", async () => {
    const write = (value: string) =>
      db().insert(settings).values({ key: "hero_headline_de", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
    await write("Hallen, Rauch, Gänsehaut.");
    await write("Neu");
    const rows = await db().select().from(settings).where(eq(settings.key, "hero_headline_de"));
    expect(rows).toEqual([{ key: "hero_headline_de", value: "Neu" }]);
  });
});
```

- [ ] **Schritt 5: Tests laufen lassen, sie müssen fehlschlagen**

```bash
npm test
```
Erwartet: FAIL mit „Failed to resolve import "@/lib/categories"“ bzw. „@/lib/db/client“.

- [ ] **Schritt 6: Kategorien und Binding-Prüfung implementieren**

`src/lib/categories.ts`:

```ts
/** Die fünf Portfolio-Kategorien: DB-Wert, deutscher Pfad und Anzeige-Reihenfolge. */
export const CATEGORIES = ["floorball", "volleyball", "fussball", "hochzeiten", "studio"] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
```

`src/lib/bindings.ts`:

```ts
export type RequiredBinding = "DB" | "MEDIA";

/** Wirft eine verständliche Meldung, wenn ein Binding in dieser Umgebung fehlt. */
export function assertBindings(
  env: Partial<CloudflareEnv>,
  names: readonly RequiredBinding[],
): asserts env is CloudflareEnv {
  const missing = names.filter((name) => env[name] == null);
  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudflare binding(s): ${missing.join(", ")} – check wrangler.jsonc for this environment.`,
    );
  }
}
```

```bash
npm test
```
Erwartet: `categories.test.ts` und `bindings.test.ts` bestehen (PASS), `db-schema.test.ts` schlägt weiter fehl.

- [ ] **Schritt 7: Schema, Client und Drizzle-Konfiguration implementieren**

`src/lib/db/schema.ts` (Spec §9; relative Imports, weil `drizzle-kit` den Alias `@/` nicht kennt):

```ts
import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { CATEGORIES } from "../categories";

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;
const createdAt = () => text("created_at").notNull().default(now);

export const portfolioImages = sqliteTable(
  "portfolio_images",
  {
    id: text("id").primaryKey(),
    category: text("category", { enum: CATEGORIES }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    color: text("color").notNull(),
    altDe: text("alt_de"),
    altEn: text("alt_en"),
    sort: integer("sort").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    role: text("role", { enum: ["hero", "chapter", "chapter_preview"] }),
    createdAt: createdAt(),
  },
  (t) => [index("portfolio_images_category_sort_idx").on(t.category, t.sort)],
);

export const galleries = sqliteTable("galleries", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shootDate: text("shoot_date"),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  expiresAt: text("expires_at"),
  status: text("status", { enum: ["draft", "online"] }).notNull().default("draft"),
  coverImageId: text("cover_image_id"),
  createdAt: createdAt(),
  updatedAt: text("updated_at").notNull().default(now),
});

export const galleryImages = sqliteTable(
  "gallery_images",
  {
    id: text("id").primaryKey(),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    bytes: integer("bytes").notNull(),
    crc32: integer("crc32").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    color: text("color").notNull(),
    sort: integer("sort").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_images_gallery_sort_idx").on(t.galleryId, t.sort)],
);

export const favorites = sqliteTable(
  "favorites",
  {
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    imageId: text("image_id")
      .notNull()
      .references(() => galleryImages.id, { onDelete: "cascade" }),
    visitorName: text("visitor_name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.galleryId, t.imageId, t.visitorName] })],
);

export const GALLERY_EVENT_TYPES = [
  "view",
  "download_image",
  "download_zip",
  "favorite_add",
  "favorite_remove",
] as const;

export const galleryEvents = sqliteTable(
  "gallery_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    galleryId: text("gallery_id")
      .notNull()
      .references(() => galleries.id, { onDelete: "cascade" }),
    type: text("type", { enum: GALLERY_EVENT_TYPES }).notNull(),
    visitorName: text("visitor_name"),
    imageId: text("image_id"),
    zipPart: integer("zip_part"),
    createdAt: createdAt(),
  },
  (t) => [index("gallery_events_gallery_created_idx").on(t.galleryId, t.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

`src/lib/db/client.ts`:

```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Db = ReturnType<typeof createDb>;
```

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
```

Migration erzeugen:

```bash
npm run db:generate -- --name init
ls drizzle
grep -c "ON DELETE cascade" drizzle/0000_init.sql
```
Erwartet: `0000_init.sql` und `meta/` sind vorhanden, `grep` meldet `4` (gallery_images, 2× favorites, gallery_events). Falls drizzle-kit einen Unterordner je Migration anlegt statt `0000_init.sql`, `readD1Migrations` und `migrations_dir` auf diesen Aufbau anpassen und hier vermerken.

- [ ] **Schritt 8: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm test
```
Erwartet: 3 Testdateien, 12 Tests, alle PASS.

- [ ] **Schritt 9: Probe: `._`-SQL darf Tests und Migrationen nicht brechen (Review-Fokus 1)**

```bash
printf '\x00\x05\x16\x07garbage' > drizzle/._0000_init.sql
npm test
test ! -e drizzle/._0000_init.sql && echo "PROBE ENTFERNT"
```
Erwartet: alle Tests PASS, danach `PROBE ENTFERNT`.

- [ ] **Schritt 10: Bindings in `wrangler.jsonc`, Typen und Server-Helfer**

In `wrangler.jsonc` auf oberster Ebene ergänzen. Die `database_id` ist vorerst ein Platzhalter nur für lokal, Task 6 ersetzt sie.

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "cosmo-db",
    "database_id": "00000000-0000-0000-0000-000000000000",
    "migrations_dir": "drizzle"
  }
],
"r2_buckets": [
  {
    "binding": "MEDIA",
    "bucket_name": "cosmo-media"
  }
]
```

```bash
npm run cf-typegen
grep -E "DB: D1Database|MEDIA: R2Bucket" cloudflare-env.d.ts
```
Erwartet: Beide Zeilen werden gefunden.

`src/lib/env.ts`:

```ts
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { assertBindings } from "./bindings";
import { createDb, type Db } from "./db/client";

/** Cloudflare-Bindings der aktuellen Anfrage. Nur in Server-Code aufrufen. */
export function getEnv(): CloudflareEnv {
  const { env } = getCloudflareContext();
  assertBindings(env, ["DB", "MEDIA"]);
  return env;
}

export function getDb(): Db {
  return createDb(getEnv().DB);
}
```

- [ ] **Schritt 11: Lokale Datenbank migrieren und Build prüfen**

```bash
npm run db:migrate:local
npx wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
npm run lint && npm run build
```
Erwartet: Die Migration `0000_init.sql` ist angewandt. Die Tabellenliste enthält `favorites`, `galleries`, `gallery_events`, `gallery_images`, `portfolio_images` und `settings` (plus `d1_migrations`, `_cf_KV` o. ä.). Lint und Build sind grün.

- [ ] **Schritt 12: Commit**

```bash
git add -A
git commit -m "feat(db): D1 schema for portfolio, galleries, favorites and events

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: DE/EN-Routing mit lokalisierten Pfaden, Platzhalterseiten und E2E-Tests

**Dateien:**
- Erstellen: `src/i18n/pathnames.ts`, `src/i18n/routing.ts`, `src/i18n/navigation.ts`, `src/i18n/request.ts`, `src/middleware.ts`, `src/messages/de.json`, `src/messages/en.json`, `src/components/placeholder-page.tsx`, `src/app/global-not-found.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/app/[locale]/[category]/page.tsx`, `src/app/[locale]/[...rest]/page.tsx`, `src/app/[locale]/ueber-mich/page.tsx`, `src/app/[locale]/kontakt/page.tsx`, `src/app/[locale]/kunden/page.tsx`, `src/app/[locale]/impressum/page.tsx`, `src/app/[locale]/datenschutz/page.tsx`, `playwright.config.ts`, `test/unit/pathnames.test.ts`, `test/e2e/routing.spec.ts`
- Löschen: `src/app/layout.tsx`, `src/app/page.tsx` (Scaffold)
- Ändern: `next.config.ts`, `package.json`

**Schnittstellen:**
- Nutzt: `CATEGORIES`, `Category`, `isCategory` aus Task 3.
- Stellt bereit:
  - `LOCALES`, `type Locale`, `PATHNAMES`, `externalPath(internal, locale)` (`src/i18n/pathnames.ts`)
  - `routing` (`src/i18n/routing.ts`)
  - `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` (`src/i18n/navigation.ts`)
  - Message-Namespaces `meta`, `home`, `categories`, `nav`, `pages`, `notFound`
  - Playwright gegen workerd, mit `PLAYWRIGHT_BASE_URL` für Tests gegen Deployments

- [ ] **Schritt 1: Pakete installieren**

```bash
npm install next-intl@4.14.7
npm install -D @playwright/test@1.63.0
npx playwright install chromium
```

- [ ] **Schritt 2: Fehlschlagenden Unit-Test für die Pfad-Tabelle schreiben**

`test/unit/pathnames.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import { LOCALES, PATHNAMES, externalPath } from "@/i18n/pathnames";

describe("pathnames", () => {
  it("has an entry for every category", () => {
    for (const c of CATEGORIES) expect(Object.keys(PATHNAMES)).toContain(`/${c}`);
  });

  it("maps localized paths from the spec", () => {
    expect(externalPath("/fussball", "de")).toBe("/fussball");
    expect(externalPath("/fussball", "en")).toBe("/football");
    expect(externalPath("/hochzeiten", "en")).toBe("/weddings");
    expect(externalPath("/ueber-mich", "en")).toBe("/about");
    expect(externalPath("/kunden", "en")).toBe("/clients");
    expect(externalPath("/impressum", "en")).toBe("/imprint");
    expect(externalPath("/datenschutz", "en")).toBe("/privacy");
  });

  it("uses unique, lowercase ASCII paths per locale", () => {
    for (const locale of LOCALES) {
      const paths = Object.keys(PATHNAMES).map((k) => externalPath(k as keyof typeof PATHNAMES, locale));
      expect(new Set(paths).size).toBe(paths.length);
      for (const p of paths) expect(p).toMatch(/^\/[a-z-]*$/);
    }
  });
});
```

```bash
npm test
```
Erwartet: FAIL, „Failed to resolve import "@/i18n/pathnames"“.

- [ ] **Schritt 3: Pfad-Tabelle, Routing und Navigation implementieren**

`src/i18n/pathnames.ts`:

```ts
export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Interne Pfade (= deutsche Pfade) → lokalisierte externe Pfade (Spec §3.2). */
export const PATHNAMES = {
  "/": "/",
  "/floorball": "/floorball",
  "/volleyball": "/volleyball",
  "/fussball": { de: "/fussball", en: "/football" },
  "/hochzeiten": { de: "/hochzeiten", en: "/weddings" },
  "/studio": "/studio",
  "/ueber-mich": { de: "/ueber-mich", en: "/about" },
  "/kontakt": { de: "/kontakt", en: "/contact" },
  "/kunden": { de: "/kunden", en: "/clients" },
  "/impressum": { de: "/impressum", en: "/imprint" },
  "/datenschutz": { de: "/datenschutz", en: "/privacy" },
} as const;

export function externalPath(internal: keyof typeof PATHNAMES, locale: Locale): string {
  const entry = PATHNAMES[internal];
  return typeof entry === "string" ? entry : entry[locale];
}
```

`src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";
import { LOCALES, PATHNAMES } from "./pathnames";

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: "de",
  localePrefix: "as-needed",
  pathnames: PATHNAMES,
});
```

`src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
```

`src/i18n/request.ts`:

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

```bash
npm test
```
Erwartet: 4 Testdateien, alle PASS.

- [ ] **Schritt 4: Middleware (Edge) und Next-Konfiguration**

`src/middleware.ts`:

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Bewusst middleware.ts statt proxy.ts: OpenNext unterstützt keine Node-Middleware (Next 16 proxy = Node).
export default createMiddleware(routing);

export const config = {
  // Nicht lokalisiert: /api, /g (Kundengalerien), /admin, Next-Interna und Dateien mit Endung.
  matcher: ["/((?!api(?:/|$)|g(?:/|$)|admin(?:/|$)|_next|_vercel|.*\\..*).*)"],
};
```

`next.config.ts` ersetzen:

```ts
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
```

- [ ] **Schritt 5: Texte DE/EN**

`src/messages/de.json`:

```json
{
  "meta": {
    "title": "Cosmo Photos · Sportfotografie aus Hamburg",
    "description": "Floorball, Volleyball, Fußball, Hochzeiten und Studio – Fotografie von Felix Vatterodt aus Hamburg."
  },
  "home": {
    "headline": "Hallen, Rauch, Gänsehaut.",
    "intro": "Sport- und Hochzeitsfotografie aus Hamburg."
  },
  "categories": {
    "floorball": "Floorball",
    "volleyball": "Volleyball",
    "fussball": "Fußball",
    "hochzeiten": "Hochzeiten",
    "studio": "Studio"
  },
  "nav": {
    "about": "Über mich",
    "contact": "Kontakt",
    "clients": "Kunden",
    "imprint": "Impressum",
    "privacy": "Datenschutz",
    "switchLocale": "English"
  },
  "pages": {
    "about": "Über mich",
    "contact": "Kontakt",
    "clients": "Kundenbereich",
    "imprint": "Impressum",
    "privacy": "Datenschutz"
  },
  "notFound": {
    "title": "Seite nicht gefunden",
    "back": "Zur Startseite"
  }
}
```

`src/messages/en.json`:

```json
{
  "meta": {
    "title": "Cosmo Photos · Sports photography from Hamburg",
    "description": "Floorball, volleyball, football, weddings and studio – photography by Felix Vatterodt from Hamburg."
  },
  "home": {
    "headline": "Halls, smoke, goosebumps.",
    "intro": "Sports and wedding photography from Hamburg."
  },
  "categories": {
    "floorball": "Floorball",
    "volleyball": "Volleyball",
    "fussball": "Football",
    "hochzeiten": "Weddings",
    "studio": "Studio"
  },
  "nav": {
    "about": "About",
    "contact": "Contact",
    "clients": "Clients",
    "imprint": "Imprint",
    "privacy": "Privacy",
    "switchLocale": "Deutsch"
  },
  "pages": {
    "about": "About",
    "contact": "Contact",
    "clients": "Clients",
    "imprint": "Imprint",
    "privacy": "Privacy"
  },
  "notFound": {
    "title": "Page not found",
    "back": "Back to home"
  }
}
```

- [ ] **Schritt 6: App-Struktur unter `[locale]` aufbauen**

```bash
rm src/app/layout.tsx src/app/page.tsx
mkdir -p "src/app/[locale]/[category]" "src/app/[locale]/[...rest]" src/components
mkdir -p "src/app/[locale]/ueber-mich" "src/app/[locale]/kontakt" "src/app/[locale]/kunden" "src/app/[locale]/impressum" "src/app/[locale]/datenschutz"
```

`src/app/[locale]/layout.tsx`:

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import "../globals.css";

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`src/app/[locale]/page.tsx` (vorläufige Startseite; die Klassen `font-display`, `font-sport` und `font-label` definiert erst Task 5):

```tsx
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, type Category } from "@/lib/categories";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-label text-xs text-stone">Cosmo Photos</p>
      <h1 className="font-display mt-4 text-6xl leading-[0.95]">{t("home.headline")}</h1>
      <p className="mt-6 max-w-md text-stone">{t("home.intro")}</p>

      <ol className="mt-16 space-y-3">
        {CATEGORIES.map((category, i) => (
          <li key={category} className="flex items-baseline gap-4">
            <span className="font-label text-xs text-stone">{String(i + 1).padStart(2, "0")}</span>
            <Link href={`/${category}` as `/${Category}`} className="font-sport text-5xl">
              {t(`categories.${category}`)}
            </Link>
          </li>
        ))}
      </ol>

      <nav className="mt-16 flex flex-wrap gap-6 text-sm">
        <Link href="/ueber-mich">{t("nav.about")}</Link>
        <Link href="/kontakt">{t("nav.contact")}</Link>
        <Link href="/kunden">{t("nav.clients")}</Link>
        <Link href="/impressum">{t("nav.imprint")}</Link>
        <Link href="/datenschutz">{t("nav.privacy")}</Link>
        <Link href="/" locale={locale === "de" ? "en" : "de"}>
          {t("nav.switchLocale")}
        </Link>
      </nav>
    </main>
  );
}
```

`src/app/[locale]/[category]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CATEGORIES, isCategory } from "@/lib/categories";

type Props = { params: Promise<{ locale: string; category: string }> };

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category }));
}

export default async function CategoryPage({ params }: Props) {
  const { locale, category } = await params;
  if (!isCategory(category)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <h1 className="font-sport text-8xl">{t(`categories.${category}`)}</h1>
      <p className="mt-10">
        <Link href="/">{t("notFound.back")}</Link>
      </p>
    </main>
  );
}
```

`src/app/[locale]/[...rest]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

export default function CatchAllPage() {
  notFound();
}
```

`src/app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-8">
        <Link href="/">{t("back")}</Link>
      </p>
    </main>
  );
}
```

`src/app/global-not-found.tsx`:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "404 · Cosmo Photos" };

export default function GlobalNotFound() {
  return (
    <html lang="de">
      <body>
        <main className="grid min-h-dvh place-items-center px-6">
          <p>404 · Seite nicht gefunden / Page not found</p>
        </main>
      </body>
    </html>
  );
}
```

`src/components/placeholder-page.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type PageKey = "about" | "contact" | "clients" | "imprint" | "privacy";

/** Vorläufige Seite mit Titel; wird in Plan 4 durch die echten Seiten ersetzt. */
export async function PlaceholderPage({ titleKey }: { titleKey: PageKey }) {
  const t = await getTranslations();
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-display text-5xl">{t(`pages.${titleKey}`)}</h1>
      <p className="mt-8">
        <Link href="/">{t("notFound.back")}</Link>
      </p>
    </main>
  );
}
```

Die fünf Seiten haben denselben Aufbau, nur `titleKey` unterscheidet sich:

`src/app/[locale]/ueber-mich/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="about" />;
}
```

`src/app/[locale]/kontakt/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="contact" />;
}
```

`src/app/[locale]/kunden/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="clients" />;
}
```

`src/app/[locale]/impressum/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="imprint" />;
}
```

`src/app/[locale]/datenschutz/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { PlaceholderPage } from "@/components/placeholder-page";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlaceholderPage titleKey="privacy" />;
}
```

```bash
npm run lint && npm run build
```
Erwartet: grün. Die Middleware-Deprecation-Warnung von Next 16 ist erwartet.

- [ ] **Schritt 7: Playwright konfigurieren**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

// Standard: lokale workerd-Vorschau. Mit PLAYWRIGHT_BASE_URL gegen ein Deployment testen.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8787";

export default defineConfig({
  testDir: "./test/e2e",
  testIgnore: ["**/._*"],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, locale: "de-DE" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], locale: "de-DE" } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run preview",
        url: "http://localhost:8787",
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
      },
});
```

Im `scripts`-Block von `package.json` ergänzen:

```json
"test:e2e": "npm run clean:dot && playwright test"
```

An `.gitignore` anhängen:

```gitignore

# Playwright
/test-results
/playwright-report
```

- [ ] **Schritt 8: E2E-Tests schreiben (Review-Fokus 2, 3, 4)**

`test/e2e/routing.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

const pathOf = (url: string) => new URL(url).pathname;

test.describe("Deutsch (Standard, ohne Präfix)", () => {
  test("Startseite ist deutsch und bleibt auf /", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    expect(pathOf(page.url())).toBe("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hallen, Rauch, Gänsehaut.");
  });

  test("Kategorien und Seiten haben deutsche Pfade", async ({ page }) => {
    const cases = [
      ["/floorball", "Floorball"],
      ["/volleyball", "Volleyball"],
      ["/fussball", "Fußball"],
      ["/hochzeiten", "Hochzeiten"],
      ["/studio", "Studio"],
      ["/ueber-mich", "Über mich"],
      ["/kontakt", "Kontakt"],
      ["/kunden", "Kundenbereich"],
      ["/impressum", "Impressum"],
      ["/datenschutz", "Datenschutz"],
    ] as const;
    for (const [path, title] of cases) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    }
  });

  test("/de-Präfix wird entfernt", async ({ page }) => {
    await page.goto("/de/floorball");
    expect(pathOf(page.url())).toBe("/floorball");
  });

  test("Sprachumschalter führt zur englischen Startseite", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("Englisch", () => {
  test("lokalisierte Pfade", async ({ page }) => {
    const cases = [
      ["/en/floorball", "Floorball"],
      ["/en/football", "Football"],
      ["/en/weddings", "Weddings"],
      ["/en/about", "About"],
      ["/en/contact", "Contact"],
      ["/en/clients", "Clients"],
      ["/en/imprint", "Imprint"],
      ["/en/privacy", "Privacy"],
    ] as const;
    for (const [path, title] of cases) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.getByRole("heading", { level: 1 }), path).toHaveText(title);
    }
  });

  test("Links auf der englischen Startseite zeigen auf englische Pfade", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("link", { name: "Football" })).toHaveAttribute("href", "/en/football");
    await expect(page.getByRole("link", { name: "Weddings" })).toHaveAttribute("href", "/en/weddings");
    await expect(page.getByRole("link", { name: "About" })).toHaveAttribute("href", "/en/about");
  });
});

test.describe("Spracherkennung", () => {
  test.use({ locale: "en-US" });

  test("englischer Browser landet von / auf /en", async ({ page }) => {
    await page.goto("/");
    expect(pathOf(page.url())).toBe("/en");
  });
});

test.describe("Nicht lokalisierte Bereiche", () => {
  test.use({ locale: "en-US" });

  test("/admin und /g/… werden nie umgeleitet", async ({ page }) => {
    for (const path of ["/admin", "/g/test-galerie"]) {
      const res = await page.goto(path);
      expect(pathOf(page.url()), path).toBe(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("Dateien werden nicht umgeleitet", async ({ request }) => {
    const res = await request.get("/favicon.ico", { maxRedirects: 0 });
    expect(res.status()).toBe(200);
  });
});

test.describe("Robust gegen seltsame URLs", () => {
  test("unbekannte Kategorie, tiefer Pfad und ß-URL geben 404 statt 500", async ({ page }) => {
    for (const path of ["/quatsch", "/en/quatsch/tief/drin", "/fu%C3%9Fball", "/xx/floorball"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("Schrägstrich am Ende führt zur Seite", async ({ page }) => {
    const res = await page.goto("/en/football/");
    expect(res?.status()).toBe(200);
    expect(pathOf(page.url())).toBe("/en/football");
  });
});
```

- [ ] **Schritt 9: E2E-Tests ausführen**

```bash
npm run test:e2e
```
Erwartet: 11 Tests, alle PASS. Der erste Lauf dauert länger, weil die Vorschau gebaut wird.

Falls „englischer Browser landet auf /en“ fehlschlägt, weil der Test keinen `Accept-Language`-Header schickt: Das ist kein Grund, den Test zu löschen. Dann prüfen, ob `localeDetection` in `routing.ts` aktiv ist (Standard: ja), und den Header per `test.use({ extraHTTPHeaders: { "accept-language": "en-US,en;q=0.9" } })` explizit setzen.

- [ ] **Schritt 10: Commit**

```bash
git add -A
git commit -m "feat(i18n): DE/EN routing with localized paths and placeholder pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Designsystem-Grundlagen (Tokens und selbst gehostete Schriften)

**Dateien:**
- Erstellen: `src/app/fonts.ts`, `test/e2e/design-system.spec.ts`
- Ändern: `src/app/globals.css` (komplett ersetzen), `src/app/[locale]/layout.tsx` (Schrift-Variablen), `src/app/global-not-found.tsx` (Schrift-Variablen)

**Schnittstellen:**
- Nutzt: die Startseite aus Task 4 mit den Klassen `font-display`, `font-sport` und `font-label`.
- Stellt bereit:
  - Tailwind-Farben `paper`, `ink`, `stone`, `mat`, `hall`, `hall-ink`, `signal` (z. B. `bg-paper`, `text-stone`)
  - Easing `ease-expo-out`, `ease-expo-in-out`
  - Utilities `font-display` (Bodoni, opsz 96), `font-sport` (Archivo schmal, kursiv, 900, Versalien), `font-label` (Martian Mono), `font-sans` (Archivo), `font-mono` (Martian)
  - CSS-Variablen `--font-bodoni`, `--font-archivo`, `--font-martian`

- [ ] **Schritt 1: Fehlschlagenden E2E-Test schreiben**

`test/e2e/design-system.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("Tokens: Papier-Hintergrund, Tinte als Textfarbe", async ({ page }) => {
  await page.goto("/");
  const colors = await page.evaluate(() => {
    const s = getComputedStyle(document.body);
    return { bg: s.backgroundColor, fg: s.color };
  });
  expect(colors).toEqual({ bg: "rgb(241, 239, 234)", fg: "rgb(20, 20, 20)" });
});

test("Schriften: Bodoni-Headline, Archivo-Kategorien (schmal, kursiv, 900), Martian-Labels", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);

  const h1 = page.getByRole("heading", { level: 1 });
  expect(await h1.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Bodoni Moda");

  const category = page.getByRole("link", { name: "Floorball" });
  const sport = await category.evaluate((el) => {
    const s = getComputedStyle(el);
    return { family: s.fontFamily, style: s.fontStyle, weight: s.fontWeight, transform: s.textTransform };
  });
  expect(sport.family).toContain("Archivo");
  expect(sport).toMatchObject({ style: "italic", weight: "900", transform: "uppercase" });

  const label = page.getByText("01", { exact: true });
  expect(await label.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Martian Mono");
});

test("Schriften sind geladen und kommen nicht von Google (DSGVO)", async ({ page }) => {
  const googleRequests: string[] = [];
  page.on("request", (r) => {
    const host = new URL(r.url()).host;
    if (host.endsWith("fonts.googleapis.com") || host.endsWith("fonts.gstatic.com")) googleRequests.push(r.url());
  });

  await page.goto("/");
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return ["Bodoni Moda", "Archivo", "Martian Mono"].map((f) => document.fonts.check(`16px "${f}"`));
  });

  expect(loaded).toEqual([true, true, true]);
  expect(googleRequests).toEqual([]);
});
```

```bash
npm run test:e2e -- design-system.spec.ts
```
Erwartet: FAIL, weil Hintergrund und Schriften noch Scaffold-Standard sind.

- [ ] **Schritt 2: Schriften per `next/font` einbinden**

`src/app/fonts.ts`:

```ts
import { Archivo, Bodoni_Moda, Martian_Mono } from "next/font/google";

// Werden beim Build geladen und selbst ausgeliefert: zur Laufzeit keine Anfrage an Google.
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-bodoni",
  display: "swap",
});

export const archivo = Archivo({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const martian = Martian_Mono({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-martian",
  display: "swap",
});

export const fontVariables = `${bodoni.variable} ${archivo.variable} ${martian.variable}`;
```

- [ ] **Schritt 3: Tokens in `globals.css`**

`src/app/globals.css` komplett ersetzen:

```css
@import "tailwindcss";

/* Designsystem „Licht aus“ – Spec §4 */
@theme {
  --color-paper: #f1efea;
  --color-ink: #141414;
  --color-stone: #8b877e;
  --color-mat: #ffffff;
  --color-hall: #0b0b0c;
  --color-hall-ink: #eceae4;
  --color-signal: #ff3d2e;

  --ease-expo-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-expo-in-out: cubic-bezier(0.87, 0, 0.13, 1);
}

@theme inline {
  --font-sans: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-martian), ui-monospace, monospace;
}

/* Editorial: Bodoni Moda in Display-Optik */
@utility font-display {
  font-family: var(--font-bodoni), ui-serif, Georgia, serif;
  font-variation-settings: "opsz" 96;
  letter-spacing: -0.02em;
}

/* Sport-Display: Archivo schmal, kursiv, schwarz, Versalien */
@utility font-sport {
  font-family: var(--font-archivo), ui-sans-serif, sans-serif;
  font-style: italic;
  font-weight: 900;
  font-variation-settings: "wdth" 62;
  text-transform: uppercase;
  line-height: 0.85;
}

/* Labels und Zähler: Martian Mono, leicht schmal */
@utility font-label {
  font-family: var(--font-martian), ui-monospace, monospace;
  font-variation-settings: "wdth" 87;
  letter-spacing: 0.02em;
}

html {
  background-color: var(--color-paper);
  color: var(--color-ink);
}

body {
  background-color: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Schritt 4: Schrift-Variablen an `<html>` hängen**

In `src/app/[locale]/layout.tsx`:
- den Import `import { fontVariables } from "@/app/fonts";` ergänzen
- `<html lang={locale}>` ersetzen durch `<html lang={locale} className={fontVariables}>`

In `src/app/global-not-found.tsx`:
- den Import `import { fontVariables } from "./fonts";` ergänzen
- `<html lang="de">` ersetzen durch `<html lang="de" className={fontVariables}>`

- [ ] **Schritt 5: Tests laufen lassen, jetzt müssen alle bestehen**

```bash
npm run lint && npm test && npm run test:e2e
```
Erwartet: Lint grün, Unit-Tests PASS, E2E 14 Tests PASS (11 Routing + 3 Design).

- [ ] **Schritt 6: Sichtprüfung**

```bash
npm run preview
```
`http://localhost:8787/` und `http://localhost:8787/en/football` im Browser öffnen. Erwartet:
- warmes Papier-Weiß als Hintergrund
- Bodoni-Headline
- Kategorien in schmaler, kursiver, fetter Versalschrift mit Mono-Nummern davor

Danach mit Ctrl+C beenden.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "feat(design): Licht-aus tokens and self-hosted Bodoni, Archivo, Martian Mono

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Cloudflare-Ressourcen, Vorschau- und Produktions-Deployment

**Dateien:**
- Ändern: `wrangler.jsonc` (echte IDs, `env.preview`), `cloudflare-env.d.ts` (neu generiert)

**Schnittstellen:**
- Stellt bereit:
  - Worker `cosmo-web` (Produktion, automatisch aus `main` über Workers Builds)
  - Worker `cosmo-web-preview` (manuell über `npm run deploy:preview`)
  - Remote-D1 `cosmo-db` / `cosmo-db-preview` mit Schema und R2 `cosmo-media` / `cosmo-media-preview`

**Hinweis zur Spec (§12):** Workers Builds erzeugt Vorschau-Versionen für andere Branches **im selben Worker**, also mit den Produktions-Bindings. Damit Vorschau-Deployments nie Produktionsdaten berühren, laufen sie über den eigenen Worker `cosmo-web-preview` per `npm run deploy:preview`. Automatische PR-Vorschauen sind in Workers Builds **deaktiviert**.

- [ ] **Schritt 1: 👤 Konto vorbereiten (Felix, im Cloudflare-Dashboard)**
  1. *Workers & Pages → Plans:* **Workers Paid** aktivieren (5 $/Monat).
  2. *R2 Object Storage:* R2 aktivieren (Zahlungsmittel hinterlegen; Freikontingent 10 GB).

- [ ] **Schritt 2: 👤 Wrangler anmelden (Felix, im Terminal, öffnet den Browser)**

```bash
npx wrangler login
npx wrangler whoami
```
Erwartet: `whoami` zeigt Felix' Konto und die Account-ID.

- [ ] **Schritt 3: D1-Datenbanken und R2-Buckets anlegen**

```bash
npx wrangler d1 create cosmo-db
npx wrangler d1 create cosmo-db-preview
npx wrangler r2 bucket create cosmo-media
npx wrangler r2 bucket create cosmo-media-preview
```
Erwartet: Die beiden `database_id`-UUIDs aus der Ausgabe notieren. Die Buckets werden bestätigt.

- [ ] **Schritt 4: `wrangler.jsonc` mit echten IDs und Vorschau-Umgebung**

Im Block `d1_databases` auf oberster Ebene die Platzhalter-ID durch die ID von `cosmo-db` ersetzen. Dann auf oberster Ebene ergänzen (Bindings werden nicht vererbt, deshalb vollständig wiederholen):

```jsonc
"env": {
  "preview": {
    "name": "cosmo-web-preview",
    "d1_databases": [
      {
        "binding": "DB",
        "database_name": "cosmo-db-preview",
        "database_id": "<ID von cosmo-db-preview>",
        "migrations_dir": "drizzle"
      }
    ],
    "r2_buckets": [
      {
        "binding": "MEDIA",
        "bucket_name": "cosmo-media-preview"
      }
    ]
  }
}
```

```bash
npm run cf-typegen
npm run build
```
Erwartet: grün.

- [ ] **Schritt 5: Schema in beide Remote-Datenbanken**

```bash
npm run db:migrate:remote
npm run db:migrate:preview
npx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
npx wrangler d1 execute DB --remote --env=preview --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```
Erwartet: Beide listen `favorites`, `galleries`, `gallery_events`, `gallery_images`, `portfolio_images` und `settings`.

- [ ] **Schritt 6: Vorschau deployen und gegen das Deployment testen**

```bash
npm run deploy:preview
```
Erwartet: Die Ausgabe zeigt eine URL `https://cosmo-web-preview.<subdomain>.workers.dev`.

```bash
PLAYWRIGHT_BASE_URL="https://cosmo-web-preview.<subdomain>.workers.dev" npx playwright test
```
Erwartet: 14 Tests PASS, also Routing und Schriften auch live in Cloudflare.

- [ ] **Schritt 7: Commit**

```bash
git add -A
git commit -m "build: Cloudflare D1/R2 resources and preview environment

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Schritt 8: 👤 GitHub-Repo anlegen und pushen (Felix)**
  1. Auf github.com ein **privates** Repo `cosmo-website` anlegen, ohne README.
  2. Danach im Projekt:

```bash
git remote add origin git@github.com:<github-user>/cosmo-website.git
git push -u origin main
```

- [ ] **Schritt 9: 👤 Workers Builds verbinden (Felix, im Cloudflare-Dashboard)**

*Workers & Pages → Create → Import a repository →* `cosmo-website` auswählen:
- **Project name:** `cosmo-web` (muss `name` in `wrangler.jsonc` entsprechen)
- **Build command:** `npx opennextjs-cloudflare build`
- **Deploy command:** `npx opennextjs-cloudflare deploy`
- **Production branch:** `main`
- **Builds for non-production branches:** **aus** (siehe Hinweis oben)

Speichern. Der erste Build startet automatisch.

- [ ] **Schritt 10: Produktions-Deployment prüfen**

Nach grünem Build im Dashboard:

```bash
PLAYWRIGHT_BASE_URL="https://cosmo-web.<subdomain>.workers.dev" npx playwright test
```
Erwartet: 14 Tests PASS. Die Domain `cosmo-photos.de` bleibt unverändert, der Umzug folgt erst in Plan 6.

---

## Abschluss von Plan 1 (Definition of Done)

- `npm run lint`, `npm test` (4 Dateien, 15 Tests) und `npm run test:e2e` (14 Tests) sind lokal grün.
- Vorschau und Produktion laufen unter `*.workers.dev` und bestehen die E2E-Tests.
- Die Remote-D1-Datenbanken haben das Schema, die R2-Buckets existieren.
- Keine `._*`-Datei im Git-Index: `git ls-files | grep '/\._\|^\._'` liefert nichts.
