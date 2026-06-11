# Cosmo Photos — Index-Portfolio Redesign: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Komplett neues Frontend im Stil von carlosprado.dev (Panel-Galerie, Logo-Intro, minimal-typografisch) bei vollständig erhaltenem Backend (Admin, Drive, Kundenbereich), plus neues `projects`-Datenmodell mit Admin-Verwaltung.

**Architecture:** Next.js 14 App Router bleibt. Neues Design-System über Tailwind-Tokens (`paper/ink/fog/hairline`) + `next/font/google` (Instrument Sans, IBM Plex Mono); Alt-Tokens bleiben für den Admin. Neue Tabelle `projects` (1 Projekt = 1 Drive-Ordner), `images.projectId` verknüpft Bilder. Öffentliche Seiten werden ersetzt, Admin bekommt eine Projekte-Seite. Intro/Hover-Animationen via CSS-Keyframes + React-State (Framer Motion bleibt installiert, wird aber nur wo nötig genutzt).

**Tech Stack:** Next.js 14, TypeScript, Tailwind, Drizzle/Turso, next-intl 4 (mit lokalisierten `pathnames`), next/font.

**Spec:** `docs/superpowers/specs/2026-06-11-cosmo-redesign-index-portfolio-design.md`

**Verifikation statt TDD:** Das Repo hat keinen Test-Runner. Jeder Task endet mit `npx tsc --noEmit` und/oder `npm run build` + manuellem Check im Dev-Server (`npm run dev`, http://localhost:3000). Kein neues Test-Framework einführen (YAGNI).

**Wichtig für alle Tasks:** Das Arbeitsverzeichnis ist `/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website` (Leerzeichen im Pfad — immer quoten!).

---

### Task 1: Design-Foundation (Fonts, Tokens, Logo-Asset)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `public/logo.svg`
- Modify: `.gitignore`
- Delete: `public/fonts/BebasNeue-Regular.woff2`, `public/fonts/IBMPlexSans-*.woff2` (5 Dateien)

- [ ] **Step 1: tailwind.config.ts ersetzen**

Neue Tokens hinzufügen, Alt-Tokens für den Admin behalten (Admin-Komponenten nutzen `primary/surface/muted/border` weiter):

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Neues Design-System
        paper: "#F4F4F2",
        ink: "#111111",
        fog: "#9A9A96",
        hairline: "#E2E2DF",
        // Legacy (nur noch Admin-Bereich)
        bg: "#FFFFFF",
        surface: "#F5F5F5",
        primary: "#1D1D1B",
        secondary: "#555555",
        muted: "#999999",
        border: "#E0E0E0",
        accent: "#1D1D1B",
        "accent-hover": "#333333",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        // Legacy-Aliase, damit Admin-Markup (font-heading/font-body) weiter rendert
        heading: ["var(--font-sans)", "sans-serif"],
        body: ["var(--font-sans)", "sans-serif"],
      },
      letterSpacing: {
        label: "0.14em",
        nav: "0.02em",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(.16,1,.3,1)",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 2: globals.css ersetzen**

Alle `@font-face` raus (Fonts kommen aus next/font), neue Basis + Animations-Keyframes für Intro und Panels:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  background: #f4f4f2;
  color: #111111;
}

::selection {
  background: #111111;
  color: #f4f4f2;
}

/* ---------- Intro-Overlay ---------- */
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #f4f4f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  animation: intro-lift 1s cubic-bezier(0.7, 0, 0.3, 1) 2.9s forwards;
}
.intro-letters {
  clip-path: inset(0 100% 0 0);
  animation: intro-wipe 1.1s cubic-bezier(0.65, 0, 0.35, 1) 0.3s forwards;
}
.intro-swoosh {
  clip-path: inset(0 100% -20% 0);
  animation: intro-wipe 0.9s cubic-bezier(0.65, 0, 0.35, 1) 1.15s forwards;
}
.intro-photos span {
  opacity: 0;
  transform: translateY(8px);
  animation: intro-char 0.5s ease forwards;
}
/* Klick = Skip: alle Delays kollabieren */
.intro-skip,
.intro-skip .intro-letters,
.intro-skip .intro-swoosh,
.intro-skip .intro-photos span {
  animation-delay: 0s !important;
  animation-duration: 0.3s !important;
}
@keyframes intro-wipe {
  to { clip-path: inset(0 0% -20% 0); }
}
@keyframes intro-char {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes intro-lift {
  to { transform: translateY(-101%); visibility: hidden; }
}

/* ---------- Homepage-Panels ---------- */
.panel {
  transition: flex-grow 0.65s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel img {
  transition: transform 1.1s cubic-bezier(0.16, 1, 0.3, 1), filter 0.7s ease;
}
.reveal {
  opacity: 0;
  animation: reveal-rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes reveal-rise {
  from { opacity: 0; transform: translateY(34px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-swap {
  animation: fade-swap 0.3s ease;
}
@keyframes fade-swap {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Idle-Drift: langsame, kaum merkliche Bewegung der Panel-Bilder, pausiert bei Hover */
.panel-drift {
  position: absolute;
  inset: 0;
  animation: panel-drift 18s ease-in-out infinite alternate;
}
.panels-hovering .panel-drift {
  animation-play-state: paused;
}
@keyframes panel-drift {
  from { transform: scale(1.045) translateX(-0.7%); }
  to { transform: scale(1.045) translateX(0.7%); }
}

@media (prefers-reduced-motion: reduce) {
  .panel, .panel img { transition: none; }
  .reveal { animation-duration: 0.01s; }
  .panel-drift { animation: none; }
}
```

- [ ] **Step 3: Root-Layout mit next/font ersetzen** (`src/app/layout.tsx`)

```tsx
import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Cosmo Photos",
    default: "Cosmo Photos — Fotograf für Sport, Hochzeiten & Events",
  },
  description:
    "Cosmo Photos — Fotografie für Vereine, Paare und Veranstalter. Sport, Hochzeiten und Events: ehrlich, nah dran, ohne Pose.",
  keywords: [
    "Sportfotografie",
    "Hochzeitsfotograf",
    "Eventfotografie",
    "Cosmo Photos",
    "Fotograf",
    "Deutschland",
  ],
  authors: [{ name: "Cosmo Photos" }],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "de_DE",
    alternateLocale: "en_US",
    siteName: "Cosmo Photos",
    title: "Cosmo Photos — Fotograf für Sport, Hochzeiten & Events",
    description:
      "Fotografie für Vereine, Paare und Veranstalter — ehrlich, nah dran, ohne Pose.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Logo-SVG prüfen** (`public/logo.svg`)

Die Datei liegt bereits im Repo (während der Planung aus der vom Nutzer gelieferten „logo neu.svg" abgelegt) — nur prüfen, dass sie existiert, und mitcommitten. Sie dient als Asset/Referenz, nicht fürs Rendering (das `<text>`-Element nutzt die nicht verfügbare Font „Industry").

- [ ] **Step 5: Alte Font-Dateien löschen + .gitignore ergänzen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git rm public/fonts/BebasNeue-Regular.woff2 public/fonts/IBMPlexSans-Regular.woff2 public/fonts/IBMPlexSans-Medium.woff2 public/fonts/IBMPlexSans-SemiBold.woff2 public/fonts/IBMPlexSans-Bold.woff2
printf "\n# Firecrawl Scrape-Cache\n.firecrawl/\n" >> .gitignore
```

- [ ] **Step 6: Verifizieren**

Run: `npx tsc --noEmit && npm run build`
Expected: Build OK. (Öffentliche Seiten sehen jetzt anders aus — alte Komponenten nutzen die Legacy-Tokens weiter, nichts bricht.)

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(redesign): design tokens, next/font setup, new logo asset"
```

---

### Task 2: Neues CosmoLogo (SVG-Komponente)

**Files:**
- Modify (komplett ersetzen): `src/components/layout/CosmoLogo.tsx`

- [ ] **Step 1: Komponente ersetzen**

Die 14 Buchstaben-Pfade + Swoosh aus „logo neu.svg". Die unsichtbaren `cls-1`-Hilfspfade und der `<text>`-Schriftzug „PHOTOS" (Font „Industry" nicht verfügbar) werden weggelassen; viewBox auf die Wortmarke beschnitten. `letterClass`/`swooshClass` erlauben der Intro, die Gruppen einzeln zu animieren.

```tsx
const LETTERS = [
  "M27.93,48.4l2.98-21.1c.11-1.03.44-1.31,1.15-1.31h8.19c.77,0,.99.27.88,1.31l-.99,6.67h9.13l1.21-8.39c.88-6.46-1.04-9.49-6.05-9.49h-13.64c-5,0-7.86,3.03-8.8,9.49l-3.13,22.41c.43.03.87.06,1.3.09,2.58.15,5.17.25,7.76.32Z",
  "M37.51,54.15c-.17.96-.44,1.31-1.26,1.31h-8.14c-.77,0-.99-.34-.82-1.31l.2-1.44c-2.52-.18-5.04-.37-7.55-.6-.48-.06-.97-.12-1.45-.18l-.55,3.94c-.94,6.39,1.04,9.49,6.05,9.49h13.64c4.95,0,7.86-3.09,8.74-9.49l.33-2.3c-3.02-.06-6.04-.15-9.06-.28l-.12.87Z",
  "M47.57,46.28h-9.13l-.3,2.2c3.05-.02,6.09-.07,9.14-.14l.29-2.06Z",
  "M64.07,27.3c.11-1.03.44-1.31,1.15-1.31h9.18c.77,0,.94.27.83,1.31l-2.82,20.01c3.07-.16,6.14-.31,9.21-.49l2.96-21.24c.93-6.46-1.04-9.49-6.1-9.49h-14.57c-5,0-7.81,3.03-8.74,9.49l-3.16,22.62c3.06-.11,6.11-.23,9.17-.36l2.9-20.54Z",
  "M71.61,54.15c-.17.96-.44,1.31-1.15,1.31h-9.18c-.77,0-.99-.34-.83-1.31l.07-.5c-3.04.02-6.07.02-9.11-.01l-.31,2.23c-.94,6.39,1.04,9.49,6.05,9.49h14.57c5.06,0,7.86-3.09,8.8-9.49l.38-2.74c-3.06.13-6.13.24-9.19.32l-.1.7Z",
  "M108.9,36.65l-9.62-3.09c-1.1-.34-1.32-.69-1.15-2.06l.66-4.47c.11-1.03.44-1.31,1.15-1.31h7.53c.77,0,.99.27.83,1.31l-.61,4.33h9.02l.83-5.78c.88-6.46-1.1-9.49-6.1-9.49h-12.87c-5,0-7.81,3.03-8.74,9.49l-1.1,7.91c-.88,6.46,1.54,8.04,6.38,9.63l7.03,2.32c4.44-.33,8.88-.69,13.31-1.07.16-4.9-2.22-6.37-6.54-7.72Z",
  "M105.51,51.76l-.35,2.67c-.17.96-.44,1.31-1.26,1.31h-8.19c-.83,0-.99-.34-.88-1.31l.29-2.01c-3.02.18-6.04.34-9.06.48l-.41,2.97c-.93,6.39,1.04,9.49,6.05,9.49h13.64c5,0,7.86-3.09,8.74-9.49l.69-4.81c-1.36.11-2.71.23-4.07.34-1.72.12-3.45.24-5.18.36Z",
  "M152.34,35l-.81,5.77c3-.34,5.99-.7,8.99-1.07l3.32-23.61h-10.89l-11.7,25.82c2.8-.3,5.61-.62,8.41-.94l2.69-5.98Z",
  "M118.52,65.36h8.69l2.2-15.61c-2.94.29-5.88.56-8.81.82l-2.08,14.79Z",
  "M136.01,59.24h5.94l5.16-11.46c-4.37.54-8.74,1.03-13.11,1.49l2.02,9.97Z",
  "M148.22,65.36h8.85l2.71-19.3c-3,.44-6.01.85-9.02,1.25l-2.55,18.05Z",
  "M131.34,35l1.57,7.75c2.57-.26,5.14-.5,7.71-.77l-5.15-25.89h-10.17l-3.9,27.76c2.94-.27,5.88-.54,8.82-.83l1.13-8.02Z",
  "M176.18,37.66l1.46-10.36c.11-1.03.44-1.31,1.16-1.31h9.18c.77,0,.93.27.82,1.31l-1.21,8.59c3.14-.53,6.26-1.12,9.37-1.78l1.19-8.53c.93-6.46-1.04-9.49-6.1-9.49h-14.57c-5,0-7.81,3.03-8.74,9.49l-1.86,13.34c1.07-.14,2.14-.26,3.2-.4,2.04-.28,4.07-.57,6.11-.86Z",
  "M185.18,54.15c-.17.96-.44,1.31-1.16,1.31h-9.18c-.77,0-.99-.34-.83-1.31l1.5-10.64c-3.11.56-6.23,1.09-9.35,1.58l-1.5,10.78c-.93,6.39,1.04,9.49,6.05,9.49h14.57c5.06,0,7.86-3.09,8.8-9.49l2.34-16.72c-3.13.78-6.28,1.47-9.43,2.14l-1.82,12.87Z",
];

const SWOOSH =
  "M14.62,39.88c-20.47,6.59-5.74,8.61,5.85,9.43,20.03,1.16,40.15.11,60.17-.99,20.05-1.16,40.07-2.77,60.06-4.7,19.95-2.04,40-4.12,59.58-8.49,13.39-3.12,22.9-7.29,2.05-10.18,4.59.28,20.03,2.22,9.02,7.68-12.85,5.31-26.81,7.3-40.39,9.83-19.88,3.37-39.91,5.69-59.99,7.33-30.13,2.19-60.46,3.46-90.62.92-5.02-.62-10.22-.97-14.9-3.04-6.71-3.88,6.44-7.07,9.17-7.79h0Z";

interface CosmoLogoProps {
  className?: string;
  letterClass?: string;
  swooshClass?: string;
}

export default function CosmoLogo({ className = "", letterClass, swooshClass }: CosmoLogoProps) {
  return (
    <svg
      viewBox="0 0 222.94 68"
      className={className}
      fill="currentColor"
      role="img"
      aria-label="Cosmo Photos"
    >
      <g className={letterClass}>
        {LETTERS.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g className={swooshClass}>
        <path d={SWOOSH} />
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: Verifizieren**

Run: `npx tsc --noEmit`
Expected: OK. (Header/Hero nutzen die Komponente bereits — neues Logo erscheint sofort im alten Layout; das ist in Ordnung, beides wird in Task 7/8 ersetzt.)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/CosmoLogo.tsx && git commit -m "feat(redesign): new Cosmo wordmark logo component (letters + swoosh groups)"
```

---

### Task 3: Datenmodell — projects-Tabelle + images.projectId

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/queries.ts`
- Create: `src/lib/slug.ts`

- [ ] **Step 1: Schema erweitern** (`src/lib/db/schema.ts`)

In `images` nach `tags` ergänzen:

```ts
  projectId: text("project_id"),
```

Neue Tabelle ans Dateiende:

```ts
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  titleDe: text("title_de").notNull(),
  titleEn: text("title_en"),
  category: text("category").notNull(), // 'sport' | 'hochzeit' | 'event'
  year: integer("year").notNull(),
  location: text("location"),
  driveFolderId: text("drive_folder_id").notNull(),
  coverImageId: text("cover_image_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
```

- [ ] **Step 2: Slug-Helper anlegen** (`src/lib/slug.ts`)

```ts
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 3: Queries erweitern** (`src/lib/db/queries.ts`)

Import um `projects` ergänzen, dann ans Dateiende:

```ts
export async function getVisibleProjects() {
  return db
    .select()
    .from(projects)
    .where(eq(projects.visible, true))
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt));
}

export interface ProjectWithCover {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  location: string | null;
  coverId: string;
}

/** Sichtbare Projekte mit Cover (coverImageId oder erstes Bild); Projekte ohne Bilder werden ausgelassen. */
export async function getProjectsWithCovers(): Promise<ProjectWithCover[]> {
  const list = await getVisibleProjects();
  const result: ProjectWithCover[] = [];
  for (const p of list) {
    let coverId = p.coverImageId;
    if (!coverId) {
      const first = await db
        .select({ id: images.id })
        .from(images)
        .where(eq(images.projectId, p.id))
        .orderBy(asc(images.sortOrder))
        .limit(1);
      coverId = first[0]?.id ?? null;
    }
    if (coverId) {
      result.push({
        id: p.id,
        slug: p.slug,
        titleDe: p.titleDe,
        titleEn: p.titleEn,
        category: p.category,
        year: p.year,
        location: p.location,
        coverId,
      });
    }
  }
  return result;
}

export async function getProjectBySlug(slug: string) {
  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.slug, slug), eq(projects.visible, true)));
  return result[0] ?? null;
}

export async function getProjectImages(projectId: string) {
  return db
    .select()
    .from(images)
    .where(and(eq(images.projectId, projectId), eq(images.visible, true)))
    .orderBy(asc(images.sortOrder));
}
```

- [ ] **Step 4: Migration ausführen**

Run: `cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website" && npx drizzle-kit push`
Expected: `projects`-Tabelle + Spalte `images.project_id` werden angelegt (gegen die in `.env.local` konfigurierte DB). Bei Rückfrage des CLI: Änderungen bestätigen.

- [ ] **Step 5: Verifizieren + Commit**

Run: `npx tsc --noEmit`
Expected: OK

```bash
git add src/lib/db/schema.ts src/lib/db/queries.ts src/lib/slug.ts drizzle
git commit -m "feat(redesign): projects table, projectId on images, project queries"
```

---

### Task 4: API — Projekte CRUD + Sync

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/sync/route.ts`

- [ ] **Step 1: CRUD-Route anlegen** (`src/app/api/projects/route.ts`)

Pattern identisch zu `src/app/api/images/route.ts` (Auth-Check via `auth()`):

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, images } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { slugify } from "@/lib/slug";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const all = await db.select().from(projects).orderBy(asc(projects.sortOrder), asc(projects.createdAt));
  const allImages = await db.select({ id: images.id, projectId: images.projectId }).from(images);
  const withCounts = all.map((p) => ({
    ...p,
    imageCount: allImages.filter((img) => img.projectId === p.id).length,
  }));
  return NextResponse.json(withCounts);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { titleDe, titleEn, category, year, location, driveFolderId } = body;
  if (!titleDe || !category || !year || !driveFolderId) {
    return NextResponse.json({ error: "Pflichtfelder: Titel (DE), Kategorie, Jahr, Drive-Ordner-ID" }, { status: 400 });
  }
  if (!["sport", "hochzeit", "event"].includes(category)) {
    return NextResponse.json({ error: "Ungültige Kategorie" }, { status: 400 });
  }

  // Slug eindeutig machen
  const base = slugify(titleDe) || "projekt";
  const existing = await db.select({ slug: projects.slug }).from(projects);
  const taken = new Set(existing.map((p) => p.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;

  const maxOrder = (await db.select({ sortOrder: projects.sortOrder }).from(projects)).reduce(
    (max, p) => Math.max(max, p.sortOrder),
    0
  );

  const inserted = await db
    .insert(projects)
    .values({
      slug,
      titleDe,
      titleEn: titleEn || null,
      category,
      year: Number(year),
      location: location || null,
      driveFolderId,
      sortOrder: maxOrder + 1,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.update(projects).set(updates).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(images).where(eq(images.projectId, id));
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Sync-Route anlegen** (`src/app/api/projects/sync/route.ts`)

Analog zu `src/app/api/drive/sync/route.ts`, aber pro Projekt-Ordner:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listImagesInFolder } from "@/lib/drive";
import { db } from "@/lib/db";
import { projects, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await request.json();
  if (!projectId) return NextResponse.json({ error: "Missing projectId" }, { status: 400 });

  const project = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];
  if (!project) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });

  try {
    const driveFiles = await listImagesInFolder(project.driveFolderId);
    const existing = await db.select({ driveFileId: images.driveFileId }).from(images);
    const existingIds = new Set(existing.map((img) => img.driveFileId));

    let added = 0;
    for (const file of driveFiles) {
      if (!existingIds.has(file.id)) {
        await db.insert(images).values({
          driveFileId: file.id,
          projectId,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: added + 1,
        });
        added++;
      }
    }

    return NextResponse.json({ synced: added, total: driveFiles.length });
  } catch (error) {
    console.error("Project sync error:", error);
    return NextResponse.json({ error: "Sync fehlgeschlagen — Drive-Ordner-ID prüfen" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verifizieren + Commit**

Run: `npx tsc --noEmit`
Expected: OK

```bash
git add src/app/api/projects && git commit -m "feat(redesign): projects CRUD + per-project drive sync API"
```

---

### Task 5: Admin — Projekte-Seite, Sidebar, Dashboard, Settings

**Files:**
- Create: `src/app/admin/projects/page.tsx`
- Create: `src/components/admin/ProjectManager.tsx`
- Modify: `src/components/admin/AdminSidebar.tsx:7-12`
- Modify: `src/app/admin/page.tsx`
- Modify (komplett ersetzen): `src/components/admin/SettingsForm.tsx`
- Delete: `src/app/admin/images/page.tsx`, `src/components/admin/ImageManager.tsx`
- Delete: `src/app/api/settings/hero-image/route.ts`

- [ ] **Step 1: ProjectManager-Komponente anlegen** (`src/components/admin/ProjectManager.tsx`)

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";

interface Project {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  location: string | null;
  driveFolderId: string;
  coverImageId: string | null;
  sortOrder: number;
  visible: boolean;
  imageCount: number;
}

interface ProjectImage {
  id: string;
  projectId: string | null;
}

const emptyForm = { titleDe: "", titleEn: "", category: "sport", year: new Date().getFullYear(), location: "", driveFolderId: "" };

export default function ProjectManager() {
  const [list, setList] = useState<Project[]>([]);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [coverPickerFor, setCoverPickerFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [projectsRes, imagesRes] = await Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]);
    setList(Array.isArray(projectsRes) ? projectsRes : []);
    setImages(Array.isArray(imagesRes) ? imagesRes : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ ...emptyForm });
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Fehler beim Anlegen");
    }
    setBusy(null);
  }

  async function patch(id: string, updates: Record<string, unknown>) {
    setBusy(id);
    await fetch("/api/projects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    await load();
    setBusy(null);
  }

  async function sync(id: string) {
    setBusy(id);
    setError("");
    const res = await fetch("/api/projects/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Sync fehlgeschlagen");
    }
    await load();
    setBusy(null);
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Projekt „${title}" und zugehörige Bild-Einträge löschen? (Drive-Dateien bleiben erhalten)`)) return;
    setBusy(id);
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    setBusy(null);
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const a = list[index];
    const b = list[target];
    setBusy(a.id);
    await Promise.all([
      fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id, sortOrder: b.sortOrder }) }),
      fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: b.id, sortOrder: a.sortOrder }) }),
    ]);
    await load();
    setBusy(null);
  }

  const input = "w-full px-3 py-2 border border-border text-sm focus:outline-none focus:border-primary";

  return (
    <div className="space-y-10 max-w-5xl">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Neues Projekt */}
      <form onSubmit={create} className="bg-white border border-border p-6 grid grid-cols-2 gap-4">
        <h2 className="col-span-2 font-heading text-xl tracking-wide">NEUES PROJEKT</h2>
        <input className={input} placeholder="Titel (DE) *" value={form.titleDe} onChange={(e) => setForm({ ...form, titleDe: e.target.value })} required />
        <input className={input} placeholder="Titel (EN)" value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} />
        <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option value="sport">Sport</option>
          <option value="hochzeit">Hochzeit</option>
          <option value="event">Event</option>
        </select>
        <input className={input} type="number" placeholder="Jahr *" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} required />
        <input className={input} placeholder="Ort (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className={input} placeholder="Google-Drive-Ordner-ID *" value={form.driveFolderId} onChange={(e) => setForm({ ...form, driveFolderId: e.target.value })} required />
        <button type="submit" disabled={busy === "create"} className="col-span-2 justify-self-start px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase disabled:opacity-50">
          {busy === "create" ? "Legt an..." : "Anlegen"}
        </button>
      </form>

      {/* Liste */}
      <div className="space-y-4">
        {list.map((p, i) => {
          const projectImages = images.filter((img) => img.projectId === p.id);
          return (
            <div key={p.id} className="bg-white border border-border p-4">
              <div className="flex items-center gap-4 flex-wrap">
                {p.coverImageId && (
                  <img src={`/api/drive/image/${p.coverImageId}?w=400`} alt="" className="w-16 h-16 object-cover" />
                )}
                <div className="flex-1 min-w-48">
                  <p className="font-medium">{p.titleDe}</p>
                  <p className="text-xs text-muted">
                    {p.category} · {p.year} · {p.imageCount} Bilder · /{p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <button onClick={() => move(i, -1)} className="px-2 py-1 border border-border" title="Nach oben">↑</button>
                  <button onClick={() => move(i, 1)} className="px-2 py-1 border border-border" title="Nach unten">↓</button>
                  <button onClick={() => sync(p.id)} disabled={busy === p.id} className="px-3 py-1 border border-border disabled:opacity-50">
                    {busy === p.id ? "..." : "Sync"}
                  </button>
                  <button onClick={() => setCoverPickerFor(coverPickerFor === p.id ? null : p.id)} className="px-3 py-1 border border-border">
                    Cover
                  </button>
                  <button onClick={() => patch(p.id, { visible: !p.visible })} className={`px-3 py-1 border ${p.visible ? "border-primary" : "border-border text-muted"}`}>
                    {p.visible ? "Sichtbar" : "Versteckt"}
                  </button>
                  <button onClick={() => remove(p.id, p.titleDe)} className="px-3 py-1 border border-border text-red-600">
                    Löschen
                  </button>
                </div>
              </div>

              {coverPickerFor === p.id && (
                <div className="mt-4 border-t border-border pt-4">
                  {projectImages.length === 0 ? (
                    <p className="text-sm text-muted">Erst „Sync" ausführen, dann Cover wählen.</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {projectImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => { patch(p.id, { coverImageId: img.id }); setCoverPickerFor(null); }}
                          className={`aspect-square overflow-hidden border-2 ${img.id === p.coverImageId ? "border-primary" : "border-transparent hover:border-border"}`}
                        >
                          <img src={`/api/drive/image/${img.id}?w=400`} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {list.length === 0 && <p className="text-muted text-sm">Noch keine Projekte angelegt.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Admin-Seite anlegen** (`src/app/admin/projects/page.tsx`)

```tsx
import ProjectManager from "@/components/admin/ProjectManager";

export default function AdminProjectsPage() {
  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">PROJEKTE</h1>
      <ProjectManager />
    </div>
  );
}
```

- [ ] **Step 3: Sidebar umbauen** (`src/components/admin/AdminSidebar.tsx`, Zeilen 7–12)

```ts
const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projekte" },
  { href: "/admin/downloads", label: "Downloads" },
  { href: "/admin/settings", label: "Einstellungen" },
];
```

- [ ] **Step 4: Dashboard-Stats anpassen** (`src/app/admin/page.tsx`)

```tsx
import { db } from "@/lib/db";
import { projects, albums } from "@/lib/db/schema";

export default async function AdminDashboard() {
  const allProjects = await db.select().from(projects);
  const visibleProjects = allProjects.filter((p) => p.visible).length;
  const allAlbums = await db.select().from(albums);
  const activeAlbums = allAlbums.filter((a) => a.active).length;

  const stats = [
    { label: "Projekte gesamt", value: allProjects.length },
    { label: "Projekte sichtbar", value: visibleProjects },
    { label: "Alben", value: allAlbums.length },
    { label: "Alben aktiv", value: activeAlbums },
  ];

  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">DASHBOARD</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white border border-border p-6">
            <p className="font-heading text-3xl">{stat.value}</p>
            <p className="text-xs tracking-label uppercase text-muted mt-2">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: SettingsForm ersetzen** (`src/components/admin/SettingsForm.tsx`)

Hero-Picker raus, About-Bild-Picker + neue Textfelder rein (gleiche `/api/settings`- und `/api/images`-Endpoints wie bisher):

```tsx
"use client";

import { useState, useEffect } from "react";

const fields = [
  { key: "status_text_de", label: "Status-Zeile Header (Deutsch)", type: "input" },
  { key: "status_text_en", label: "Status-Zeile Header (English)", type: "input" },
  { key: "about_headline_de", label: "About-Headline (Deutsch)", type: "input" },
  { key: "about_headline_en", label: "About-Headline (English)", type: "input" },
  { key: "bio_de", label: "Bio (Deutsch)", type: "textarea" },
  { key: "bio_en", label: "Bio (English)", type: "textarea" },
  { key: "contact_email", label: "Kontakt E-Mail", type: "input" },
  { key: "instagram_url", label: "Instagram URL", type: "input" },
  { key: "linkedin_url", label: "LinkedIn URL", type: "input" },
  { key: "facebook_url", label: "Facebook URL", type: "input" },
];

type Image = { id: string; titleDe: string | null };

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [aboutImageId, setAboutImageId] = useState<string | null>(null);
  const [aboutStatus, setAboutStatus] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/images").then((r) => r.json()),
    ]).then(([settingsData, imagesData]) => {
      setValues(settingsData);
      setAboutImageId(settingsData.about_image_id ?? null);
      setImages(Array.isArray(imagesData) ? imagesData : []);
      setLoading(false);
    });
  }, []);

  async function selectAboutImage(id: string) {
    setAboutStatus("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about_image_id: id }),
      });
      if (res.ok) {
        setAboutImageId(id);
        setAboutStatus("✓ Gespeichert");
      } else {
        setAboutStatus(`Fehler ${res.status}`);
      }
    } catch {
      setAboutStatus("Netzwerkfehler");
    }
    setTimeout(() => setAboutStatus(""), 4000);
  }

  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* About-Bild */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs tracking-label uppercase text-muted">
            Über-mich-Foto
          </label>
          {aboutStatus && <span className="text-xs text-muted">{aboutStatus}</span>}
        </div>

        {aboutImageId && (
          <img
            src={`/api/drive/image/${aboutImageId}?w=400`}
            alt="Aktuelles About-Bild"
            className="h-32 w-auto object-cover border border-primary mb-4"
          />
        )}

        {images.length === 0 ? (
          <p className="text-sm text-muted">Keine Bilder gefunden. Bitte zuerst ein Projekt syncen.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {images.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => selectAboutImage(img.id)}
                className={`aspect-square overflow-hidden border-2 transition-all hover:opacity-90 ${
                  img.id === aboutImageId ? "border-primary" : "border-transparent hover:border-border"
                }`}
                title={img.titleDe ?? ""}
              >
                <img src={`/api/drive/image/${img.id}?w=400`} alt={img.titleDe ?? ""} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <hr className="border-border" />

      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs tracking-label uppercase text-muted mb-2">
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={values[field.key] || ""}
              onChange={(e) => update(field.key, e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-border text-sm focus:outline-none focus:border-primary resize-none"
            />
          ) : (
            <input
              value={values[field.key] || ""}
              onChange={(e) => update(field.key, e.target.value)}
              className="w-full px-4 py-3 border border-border text-sm focus:outline-none focus:border-primary"
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-8 py-3 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {saved ? "Gespeichert ✓" : saving ? "Speichert..." : "Speichern"}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Alte Bilderverwaltung + Hero-Route löschen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git rm -r src/app/admin/images src/components/admin/ImageManager.tsx src/app/api/settings/hero-image
```

- [ ] **Step 7: Verifizieren**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Danach `npm run dev`: `/admin` einloggen → „Projekte" → Testprojekt mit echter Drive-Ordner-ID anlegen → Sync → Bilder erscheinen, Cover wählbar.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(redesign): admin projects management, settings rework, drop flat image manager"
```

---

### Task 6: i18n — lokalisierte Pfade + neue Messages

**Files:**
- Modify: `src/i18n/routing.ts`
- Create: `src/i18n/navigation.ts`
- Modify (komplett ersetzen): `src/messages/de.json`, `src/messages/en.json`

- [ ] **Step 1: routing.ts mit pathnames** (`src/i18n/routing.ts`)

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
  pathnames: {
    "/": "/",
    "/projects/[slug]": {
      de: "/projekte/[slug]",
      en: "/projects/[slug]",
    },
    "/about": "/about",
    "/contact": "/contact",
    "/downloads": "/downloads",
  },
});
```

- [ ] **Step 2: navigation.ts anlegen** (`src/i18n/navigation.ts`)

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 3: de.json ersetzen**

`hero.*` bleibt vorübergehend drin (wird noch vom alten HeroSection genutzt, fliegt in Task 12):

```json
{
  "nav": {
    "projects": "Projekte",
    "about": "Über mich",
    "contact": "Kontakt",
    "downloads": "Kundenbereich"
  },
  "hero": {
    "tagline": "Sport, Hochzeiten, Events",
    "cta": "Portfolio ansehen"
  },
  "home": {
    "identity": "Cosmo Photos",
    "role": "Fotograf — Sport · Hochzeiten · Events",
    "empty": "Projekte folgen in Kürze.",
    "statusFallback": "Verfügbar für Buchungen"
  },
  "categories": {
    "sport": "Sport",
    "hochzeit": "Hochzeit",
    "event": "Event"
  },
  "project": {
    "images": "{count} Bilder",
    "prev": "Vorheriges",
    "next": "Nächstes Projekt"
  },
  "about": {
    "title": "Über mich",
    "label": "Über mich",
    "clients": "Kunden & Referenzen",
    "headlineFallback": "Fotograf für die Momente, die man nicht wiederholen kann."
  },
  "contact": {
    "title": "Kontakt",
    "headline": "Lass uns über dein Projekt reden.",
    "name": "Name",
    "email": "E-Mail",
    "subject": "Worum geht es? (Sport, Hochzeit, Event …)",
    "message": "Nachricht",
    "file": "Datei anhängen (optional)",
    "send": "Senden",
    "success": "Nachricht wurde gesendet!",
    "error": "Fehler beim Senden. Bitte versuche es erneut."
  },
  "downloads": {
    "title": "Kundenbereich",
    "label": "Privater Bereich",
    "headline": "Dein Album. Dein Code.",
    "placeholder": "CODE EINGEBEN",
    "hint": "Den Code findest du in deiner E-Mail nach dem Shooting.",
    "submit": "Zugang",
    "invalid": "Ungültiger oder abgelaufener Code",
    "downloadAll": "Alle herunterladen",
    "emptyAlbum": "Dieses Album enthält noch keine Fotos."
  }
}
```

- [ ] **Step 4: en.json ersetzen**

```json
{
  "nav": {
    "projects": "Projects",
    "about": "About",
    "contact": "Contact",
    "downloads": "Client Area"
  },
  "hero": {
    "tagline": "Sports, Weddings, Events",
    "cta": "View portfolio"
  },
  "home": {
    "identity": "Cosmo Photos",
    "role": "Photographer — Sports · Weddings · Events",
    "empty": "Projects coming soon.",
    "statusFallback": "Available for bookings"
  },
  "categories": {
    "sport": "Sports",
    "hochzeit": "Wedding",
    "event": "Event"
  },
  "project": {
    "images": "{count} photos",
    "prev": "Previous",
    "next": "Next project"
  },
  "about": {
    "title": "About",
    "label": "About me",
    "clients": "Clients & References",
    "headlineFallback": "A photographer for the moments you can't repeat."
  },
  "contact": {
    "title": "Contact",
    "headline": "Let's talk about your project.",
    "name": "Name",
    "email": "Email",
    "subject": "What is it about? (Sports, wedding, event …)",
    "message": "Message",
    "file": "Attach file (optional)",
    "send": "Send",
    "success": "Message sent!",
    "error": "Sending failed. Please try again."
  },
  "downloads": {
    "title": "Client Area",
    "label": "Private area",
    "headline": "Your album. Your code.",
    "placeholder": "ENTER CODE",
    "hint": "You received the code by email after your shoot.",
    "submit": "Access",
    "invalid": "Invalid or expired code",
    "downloadAll": "Download all",
    "emptyAlbum": "This album has no photos yet."
  }
}
```

- [ ] **Step 5: Verifizieren + Commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK (alte Komponenten nutzen `nav.portfolio` nicht mehr? Doch — der alte Header nutzt `t("portfolio")`, der Key heißt jetzt `projects`. Der alte Header wird im nächsten Task ersetzt; für diesen Commit den alten Header minimal anfassen: in `src/components/layout/Header.tsx:17` `t("portfolio")` → `t("projects")` ändern, damit nichts crasht.)

```bash
git add -A && git commit -m "feat(redesign): localized pathnames, i18n navigation helpers, new message catalogs"
```

---

### Task 7: Layout-Shell — neuer Header, Mobile-Menü, Locale-Layout

**Files:**
- Modify (komplett ersetzen): `src/components/layout/Header.tsx`
- Modify (komplett ersetzen): `src/components/layout/MobileMenu.tsx`
- Modify (komplett ersetzen): `src/components/layout/LanguageToggle.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: LanguageToggle ersetzen**

```tsx
"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const other = locale === "de" ? "en" : "de";

  return (
    <button
      onClick={() =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace({ pathname, params } as any, { locale: other })
      }
      className="font-mono text-xs text-fog hover:text-ink transition-colors"
      aria-label="Sprache wechseln"
    >
      {other.toUpperCase()}
    </button>
  );
}
```

- [ ] **Step 2: Header ersetzen**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import CosmoLogo from "./CosmoLogo";
import LanguageToggle from "./LanguageToggle";
import MobileMenu from "./MobileMenu";

const NAV = [
  { href: "/" as const, key: "projects" as const },
  { href: "/about" as const, key: "about" as const },
  { href: "/contact" as const, key: "contact" as const },
  { href: "/downloads" as const, key: "downloads" as const },
];

export default function Header({ statusText }: { statusText: string }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 bg-paper/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 md:px-10 h-[72px]">
          <Link href="/" aria-label="Startseite" className="text-ink">
            <CosmoLogo className="h-7 w-auto" />
          </Link>

          <span className="hidden lg:block text-sm text-ink">{statusText}</span>

          <nav className="hidden md:flex items-center gap-10">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`text-sm tracking-nav transition-colors ${
                    active ? "text-ink" : "text-fog hover:text-ink"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
            <LanguageToggle />
          </nav>

          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setOpen(!open)}
            aria-label="Menü"
          >
            <span className={`w-6 h-px bg-ink transition-transform ${open ? "rotate-45 translate-y-[3.5px]" : ""}`} />
            <span className={`w-6 h-px bg-ink transition-transform ${open ? "-rotate-45 -translate-y-[3.5px]" : ""}`} />
          </button>
        </div>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: MobileMenu ersetzen**

```tsx
"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageToggle from "./LanguageToggle";

const NAV = [
  { href: "/" as const, key: "projects" as const },
  { href: "/about" as const, key: "about" as const },
  { href: "/contact" as const, key: "contact" as const },
  { href: "/downloads" as const, key: "downloads" as const },
];

export default function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("nav");

  return (
    <div
      className={`fixed inset-0 z-30 bg-paper flex flex-col justify-center px-8 transition-opacity duration-300 md:hidden ${
        open ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <nav className="flex flex-col gap-2">
        {NAV.map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            onClick={onClose}
            className="text-4xl font-medium tracking-tight text-ink py-2"
            style={{
              transition: "opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)",
              transitionDelay: `${i * 60}ms`,
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(16px)",
            }}
          >
            {t(item.key)}
          </Link>
        ))}
      </nav>
      <div className="mt-10">
        <LanguageToggle />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Locale-Layout anpassen** (`src/app/[locale]/layout.tsx`)

Footer raus, Status-Text aus Settings laden:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import { getSetting } from "@/lib/db/queries";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);

  if (!routing.locales.includes(locale as "de" | "en")) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("home");
  const statusText =
    (await getSetting(locale === "en" ? "status_text_en" : "status_text_de")) ||
    t("statusFallback");

  return (
    <NextIntlClientProvider messages={messages}>
      <Header statusText={statusText} />
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
```

Hinweis: Die alten Seiten (Home/About/…) verlieren dadurch `pt-20` und den Footer — sie werden in Task 8–11 ohnehin ersetzt. Der alte `Footer.tsx` bleibt bis Task 12 ungenutzt liegen.

- [ ] **Step 5: Verifizieren + Commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Im Dev-Server: Header neu (Logo, Status, graue Nav), Sprachwechsel DE↔EN funktioniert auf `/de` ↔ `/en` und `/de/about` ↔ `/en/about`, Mobile-Menü öffnet als Fullscreen.

```bash
git add -A && git commit -m "feat(redesign): new minimal header, fullscreen mobile menu, locale layout"
```

---

### Task 8: Startseite — Intro-Overlay + Panel-Galerie

**Files:**
- Create: `src/components/home/IntroOverlay.tsx`
- Create: `src/components/home/HomeStage.tsx`
- Create: `src/components/home/HomeClient.tsx`
- Modify (komplett ersetzen): `src/app/[locale]/page.tsx`

- [ ] **Step 1: IntroOverlay anlegen** (`src/components/home/IntroOverlay.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";
import CosmoLogo from "@/components/layout/CosmoLogo";

const PHOTOS = ["P", "H", "O", "T", "O", "S"];

export default function IntroOverlay({ onDone }: { onDone: () => void }) {
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    const t = setTimeout(onDone, skip ? 400 : 4000);
    return () => clearTimeout(t);
  }, [skip, onDone]);

  return (
    <div
      className={`intro-overlay ${skip ? "intro-skip" : ""}`}
      onClick={() => setSkip(true)}
      aria-hidden="true"
    >
      <CosmoLogo
        className="w-[260px] md:w-[340px] text-ink"
        letterClass="intro-letters"
        swooshClass="intro-swoosh"
      />
      <div className="intro-photos flex gap-[1.45em] mt-4 ml-[0.7em] text-[15px] font-medium text-ink">
        {PHOTOS.map((ch, i) => (
          <span key={i} style={{ animationDelay: skip ? "0s" : `${1.7 + i * 0.08}s` }}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: HomeStage anlegen** (`src/components/home/HomeStage.tsx`)

```tsx
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export interface PanelProject {
  id: string;
  slug: string;
  titleDe: string;
  titleEn: string | null;
  category: string;
  year: number;
  coverId: string;
}

export default function HomeStage({
  projects,
  delayed,
}: {
  projects: PanelProject[];
  delayed: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("home");
  const tc = useTranslations("categories");
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);

  const title = (p: PanelProject) =>
    locale === "en" && p.titleEn ? p.titleEn : p.titleDe;

  const baseDelay = delayed ? 3.2 : 0.05;

  if (projects.length === 0) {
    return (
      <div className="h-dvh flex items-center justify-center">
        <p className="text-fog text-sm tracking-label uppercase">{t("empty")}</p>
      </div>
    );
  }

  return (
    <>
      {/* ---------- Desktop: Panel-Galerie ---------- */}
      <div className="hidden md:flex h-dvh flex-col pt-[72px] overflow-hidden">
        <div
          className={`flex-1 min-h-0 flex gap-3.5 px-10 pt-1 reveal ${hovering ? "panels-hovering" : ""}`}
          style={{ animationDelay: `${baseDelay}s` }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {projects.map((p, i) => {
            const isActive = hovering && active === i;
            const dimmed = hovering && active !== i;
            return (
              <Link
                key={p.id}
                href={{ pathname: "/projects/[slug]", params: { slug: p.slug } }}
                className="panel group relative overflow-hidden"
                style={{ flexGrow: isActive ? 1.75 : 1, flexBasis: 0 }}
                onMouseEnter={() => setActive(i)}
                onFocus={() => { setActive(i); setHovering(true); }}
                onBlur={() => setHovering(false)}
              >
                <div className="panel-drift">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/drive/image/${p.coverId}?w=1200`}
                    alt={title(p)}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      transform: isActive ? "scale(1.06)" : "scale(1.001)",
                      filter: isActive
                        ? "saturate(1)"
                        : dimmed
                          ? "saturate(.55) brightness(.94)"
                          : "saturate(.82)",
                    }}
                  />
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-500"
                  style={{ opacity: isActive ? 1 : 0 }}
                />
                <div
                  className="absolute inset-x-3.5 bottom-3 flex justify-between items-baseline text-white transition-all duration-500"
                  style={{
                    opacity: isActive ? 1 : 0,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  <span className="text-[15px] font-medium [text-shadow:0_1px_14px_rgba(0,0,0,.45)]">
                    {title(p)}
                  </span>
                  <span className="font-mono text-[11px] [text-shadow:0_1px_14px_rgba(0,0,0,.45)]">
                    {String(i + 1).padStart(2, "0")} / {tc(p.category as "sport" | "hochzeit" | "event")}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom-Bar */}
        <div
          className="relative flex items-end justify-between px-10 py-5 reveal"
          style={{ animationDelay: `${baseDelay + 0.2}s` }}
        >
          <div className="text-sm leading-snug">
            <span className="block font-semibold">{t("identity")}</span>
            <span className="italic text-fog">{t("role")}</span>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-7 flex gap-2.5">
            {projects.map((_, i) => (
              <span
                key={i}
                className="w-[52px] h-0.5 transition-colors duration-300"
                style={{ background: active === i ? "#111" : "#d4d4d0" }}
              />
            ))}
          </div>
          <span
            key={active}
            className="fade-swap text-[34px] font-semibold tracking-tight text-right min-w-[300px]"
          >
            {title(projects[active])}
          </span>
        </div>
      </div>

      {/* ---------- Mobile: gestapelte Cover ---------- */}
      <div className="md:hidden pt-[72px] px-4 pb-10 space-y-4">
        {projects.map((p, i) => (
          <Link
            key={p.id}
            href={{ pathname: "/projects/[slug]", params: { slug: p.slug } }}
            className="relative block aspect-[4/5] overflow-hidden reveal"
            style={{ animationDelay: `${baseDelay + i * 0.08}s` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/drive/image/${p.coverId}?w=800`}
              alt={title(p)}
              className="absolute inset-0 w-full h-full object-cover"
              loading={i < 2 ? "eager" : "lazy"}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 to-transparent" />
            <div className="absolute inset-x-4 bottom-3 flex justify-between items-baseline text-white">
              <span className="text-[15px] font-medium">{title(p)}</span>
              <span className="font-mono text-[11px]">
                {String(i + 1).padStart(2, "0")} / {p.year}
              </span>
            </div>
          </Link>
        ))}
        <div className="pt-6 text-sm leading-snug">
          <span className="block font-semibold">{t("identity")}</span>
          <span className="italic text-fog">{t("role")}</span>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: HomeClient anlegen** (`src/components/home/HomeClient.tsx`)

Entscheidet einmalig, ob die Intro läuft (Session + reduced motion):

```tsx
"use client";

import { useEffect, useState } from "react";
import IntroOverlay from "./IntroOverlay";
import HomeStage, { PanelProject } from "./HomeStage";

const KEY = "cosmo-intro-seen";

export default function HomeClient({ projects }: { projects: PanelProject[] }) {
  // introRan bleibt nach der Entscheidung stabil (steuert die Reveal-Delays),
  // overlay steuert nur das Mounten des Intro-Overlays.
  const [introRan, setIntroRan] = useState<boolean | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = sessionStorage.getItem(KEY);
    const run = !seen && !reduced;
    if (run) sessionStorage.setItem(KEY, "1");
    setIntroRan(run);
    setOverlay(run);
  }, []);

  if (introRan === null) return <div className="h-dvh" aria-hidden="true" />;

  return (
    <>
      {overlay && <IntroOverlay onDone={() => setOverlay(false)} />}
      <HomeStage projects={projects} delayed={introRan} />
    </>
  );
}
```

Wichtig: `delayed` darf sich nach dem ersten Render von HomeStage **nicht mehr ändern** — eine Änderung von `animation-delay` würde die bereits gelaufene `reveal`-Animation in den meisten Browsern neu starten (sichtbares Flackern am Intro-Ende). Deshalb der getrennte, stabile `introRan`-State.

- [ ] **Step 4: Homepage ersetzen** (`src/app/[locale]/page.tsx`)

```tsx
import HomeClient from "@/components/home/HomeClient";
import { getProjectsWithCovers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const projects = (await getProjectsWithCovers()).slice(0, 6);

  return (
    <HomeClient
      projects={projects.map((p) => ({
        id: p.id,
        slug: p.slug,
        titleDe: p.titleDe,
        titleEn: p.titleEn,
        category: p.category,
        year: p.year,
        coverId: p.coverId,
      }))}
    />
  );
}
```

- [ ] **Step 5: Verifizieren**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Dev-Server-Checks:
1. `/de` im frischen Inkognito-Tab: Intro läuft (Wipe → Swoosh → PHOTOS → Vorhang), danach Panels.
2. Reload: keine Intro (sessionStorage).
3. Klick während Intro: bricht schnell ab.
4. Panels: Hover weitet, dimmt Nachbarn, Titel erscheint, Bottom-Bar-Titel + Striche wechseln.
5. Panel-Klick → 404 ist OK (Projektseite kommt in Task 9) bzw. Seite existiert nach Task 9.
6. Schmales Fenster: gestapelte Cover.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(redesign): homepage panel gallery with cinematic logo intro"
```

---

### Task 9: Projektseite mit Galerie + Lightbox

**Files:**
- Create: `src/app/[locale]/projects/[slug]/page.tsx`
- Create: `src/components/project/ProjectGallery.tsx`
- Create: `src/components/project/Lightbox.tsx`

- [ ] **Step 1: Lightbox anlegen** (`src/components/project/Lightbox.tsx`)

Funktional wie die alte (`src/components/portfolio/Lightbox.tsx`), Optik neu (dunkler Grund, Mono-Zähler):

```tsx
"use client";

import { useEffect, useCallback } from "react";

interface LightboxProps {
  imageIds: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ imageIds, currentIndex, onClose, onNavigate }: LightboxProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < imageIds.length - 1) onNavigate(currentIndex + 1);
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
    },
    [currentIndex, imageIds.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const id = imageIds[currentIndex];
  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95"
      onClick={onClose}
    >
      <button
        className="absolute top-5 right-6 text-white/70 hover:text-white text-3xl font-light z-10"
        onClick={onClose}
        aria-label="Schließen"
      >
        &times;
      </button>

      <div className="absolute top-6 left-6 text-white/60 font-mono text-xs">
        {String(currentIndex + 1).padStart(2, "0")} / {String(imageIds.length).padStart(2, "0")}
      </div>

      {currentIndex > 0 && (
        <button
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-light z-10 p-4"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          aria-label="Vorheriges Bild"
        >
          &#8249;
        </button>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={id}
        src={`/api/drive/image/${id}?w=1920`}
        alt=""
        className="max-h-[88vh] max-w-[92vw] object-contain fade-swap"
        onClick={(e) => e.stopPropagation()}
      />

      {currentIndex < imageIds.length - 1 && (
        <button
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-4xl font-light z-10 p-4"
          onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          aria-label="Nächstes Bild"
        >
          &#8250;
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ProjectGallery anlegen** (`src/components/project/ProjectGallery.tsx`)

```tsx
"use client";

import { useState } from "react";
import Lightbox from "./Lightbox";

export default function ProjectGallery({ imageIds }: { imageIds: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {imageIds.map((id, i) => (
          <button
            key={id}
            onClick={() => setLightboxIndex(i)}
            className="group relative aspect-[3/2] overflow-hidden"
            aria-label={`Bild ${i + 1} öffnen`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/drive/image/${id}?w=800`}
              alt=""
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.04]"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          imageIds={imageIds}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Projektseite anlegen** (`src/app/[locale]/projects/[slug]/page.tsx`)

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import ProjectGallery from "@/components/project/ProjectGallery";
import { getProjectBySlug, getProjectImages, getVisibleProjects } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, locale } = await Promise.resolve(params);
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  const title = locale === "en" && project.titleEn ? project.titleEn : project.titleDe;
  return { title };
}

export default async function ProjectPage({ params }: Props) {
  const { slug, locale } = await Promise.resolve(params);
  const t = await getTranslations("project");
  const tc = await getTranslations("categories");

  const project = await getProjectBySlug(slug);
  if (!project) notFound();

  const imgs = await getProjectImages(project.id);
  const all = await getVisibleProjects();
  const index = all.findIndex((p) => p.id === project.id);
  const prev = all[(index - 1 + all.length) % all.length];
  const next = all[(index + 1) % all.length];

  const title = (p: { titleDe: string; titleEn: string | null }) =>
    locale === "en" && p.titleEn ? p.titleEn : p.titleDe;

  const coverId = project.coverImageId ?? imgs[0]?.id ?? null;
  const gridIds = imgs.map((img) => img.id).filter((id) => id !== coverId);

  return (
    <div className="pt-[100px] px-6 md:px-10 pb-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-fog mb-3">
            {String(index + 1).padStart(2, "0")} / {tc(project.category as "sport" | "hochzeit" | "event")}
          </p>
          <h1 className="text-4xl md:text-[54px] font-semibold tracking-tight leading-[.95]">
            {title(project)}
          </h1>
        </div>
        <div className="font-mono text-xs text-fog md:text-right leading-loose">
          {project.year}
          {project.location && (
            <>
              <br />
              {project.location}
            </>
          )}
          <br />
          {t("images", { count: imgs.length })}
        </div>
      </div>

      {coverId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/api/drive/image/${coverId}?w=1920`}
          alt={title(project)}
          className="w-full max-h-[70vh] object-cover mt-8"
        />
      )}

      {gridIds.length > 0 && (
        <div className="mt-3.5">
          <ProjectGallery imageIds={gridIds} />
        </div>
      )}

      {all.length > 1 && (
        <div className="flex justify-between items-center mt-12 pt-5 border-t border-hairline">
          <Link
            href={{ pathname: "/projects/[slug]", params: { slug: prev.slug } }}
            className="font-mono text-xs text-fog hover:text-ink transition-colors"
          >
            ← {t("prev")}
          </Link>
          <Link
            href={{ pathname: "/projects/[slug]", params: { slug: next.slug } }}
            className="text-[15px] font-medium hover:text-fog transition-colors"
          >
            {t("next")}: {title(next)} →
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verifizieren + Commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Dev: Panel-Klick öffnet `/de/projekte/<slug>` (DE) bzw. `/en/projects/<slug>` (EN); Lightbox mit Pfeiltasten/ESC; Prev/Next zyklisch.

```bash
git add -A && git commit -m "feat(redesign): project detail page with gallery, lightbox, prev/next"
```

---

### Task 10: Über mich + Kontakt

**Files:**
- Modify (komplett ersetzen): `src/app/[locale]/about/page.tsx`
- Modify (komplett ersetzen): `src/app/[locale]/contact/page.tsx`
- Modify (komplett ersetzen): `src/components/contact/ContactForm.tsx`

- [ ] **Step 1: About-Seite ersetzen**

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Über mich",
  description:
    "Cosmo Photos — Fotograf für Sport, Hochzeiten und Events. Nah dran, ohne aufzufallen.",
};

export default async function AboutPage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations("about");
  const suffix = locale === "en" ? "_en" : "_de";
  const headline = (await getSetting(`about_headline${suffix}`)) || t("headlineFallback");
  const bio = (await getSetting(`bio${suffix}`)) || "";
  const aboutImageId = await getSetting("about_image_id");
  const logos = await getClientLogos();

  return (
    <div className="pt-[100px] px-6 md:px-10 pb-20">
      <h1 className="text-3xl md:text-[38px] font-medium tracking-tight leading-tight max-w-3xl">
        {headline}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mt-12">
        <div className="md:col-span-7">
          {aboutImageId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/drive/image/${aboutImageId}?w=1200`}
              alt="Cosmo Photos"
              className="w-full max-h-[70vh] object-cover"
            />
          ) : (
            <div className="w-full aspect-[4/3] bg-hairline" />
          )}
        </div>

        <div className="md:col-span-5 md:pt-14">
          <p className="text-xs tracking-label uppercase text-fog mb-4">{t("label")}</p>
          <div className="text-sm leading-[1.85] text-ink/75 whitespace-pre-line">{bio}</div>

          {logos.length > 0 && (
            <>
              <p className="text-xs tracking-label uppercase text-fog mt-10 mb-4">
                {t("clients")}
              </p>
              <div className="flex flex-wrap items-center gap-8">
                {logos.map((logo) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={logo.id}
                    src={logo.imageUrl}
                    alt={logo.name}
                    className="h-9 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: ContactForm ersetzen** (Haarlinien-Stil, API unverändert)

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const field =
  "w-full bg-transparent border-0 border-b border-hairline focus:border-ink py-3.5 px-0.5 text-sm outline-none transition-colors placeholder:text-fog";

export default function ContactForm() {
  const t = useTranslations("contact");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/contact", { method: "POST", body: formData });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus("error");
        setErrorMsg(data.error || t("error"));
      }
    } catch {
      setStatus("error");
      setErrorMsg(t("error"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <input name="name" type="text" required placeholder={`${t("name")} *`} className={field} />
      <input name="email" type="email" required placeholder={`${t("email")} *`} className={field} />
      <input name="subject" type="text" required placeholder={`${t("subject")} *`} className={field} />
      <textarea name="message" required rows={4} placeholder={`${t("message")} *`} className={`${field} resize-none`} />

      <label className="mt-6 text-xs text-fog cursor-pointer">
        {t("file")}
        <input name="file" type="file" className="block mt-2 text-xs text-fog file:mr-3 file:py-1.5 file:px-3 file:border file:border-hairline file:bg-transparent file:text-ink file:text-xs file:cursor-pointer" />
      </label>

      {status === "success" && <p className="mt-5 text-sm text-ink">{t("success")}</p>}
      {status === "error" && <p className="mt-5 text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-8 self-start bg-ink text-paper text-xs tracking-[.1em] uppercase px-7 py-3.5 hover:opacity-80 transition-opacity disabled:opacity-50"
      >
        {status === "sending" ? "..." : `${t("send")} →`}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: Kontakt-Seite ersetzen**

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import ContactForm from "@/components/contact/ContactForm";
import { getSetting } from "@/lib/db/queries";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontaktiere Cosmo Photos für Buchungsanfragen und Kooperationen.",
};

export default async function ContactPage() {
  const t = await getTranslations("contact");
  const contactEmail = (await getSetting("contact_email")) || "info@cosmophotos.de";
  const instagramUrl = await getSetting("instagram_url");
  const linkedinUrl = await getSetting("linkedin_url");

  const socials = [
    instagramUrl ? { label: "Instagram", url: instagramUrl } : null,
    linkedinUrl ? { label: "LinkedIn", url: linkedinUrl } : null,
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <div className="pt-[100px] px-6 md:px-10 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-14 max-w-6xl">
        <div>
          <h1 className="text-4xl md:text-[44px] font-semibold tracking-tight leading-[1.05]">
            {t("headline")}
          </h1>
          <a
            href={`mailto:${contactEmail}`}
            className="inline-block font-mono text-sm border-b border-ink pb-0.5 mt-7 hover:text-fog hover:border-fog transition-colors"
          >
            {contactEmail}
          </a>
          {socials.length > 0 && (
            <div className="flex gap-6 mt-8">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-fog hover:text-ink transition-colors"
                >
                  {s.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>

        <ContactForm />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verifizieren + Commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Dev: `/de/about` (Headline, Bild/Fallback, Bio, Logos), `/de/contact` (Formular sendet — Testnachricht abschicken und Response prüfen).

```bash
git add -A && git commit -m "feat(redesign): about and contact pages in new design"
```

---

### Task 11: Kundenbereich

**Files:**
- Modify (komplett ersetzen): `src/app/[locale]/downloads/page.tsx`
- Modify (komplett ersetzen): `src/components/downloads/CodeInput.tsx`
- Modify (komplett ersetzen): `src/components/downloads/DownloadGallery.tsx`
- Modify: `src/app/[locale]/downloads/layout.tsx` (nur prüfen — wenn es lediglich Metadata enthält, unverändert lassen)

- [ ] **Step 1: CodeInput ersetzen**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
}

interface VerifiedData {
  label: string;
  images: DownloadImage[];
}

interface CodeInputProps {
  onVerified: (data: VerifiedData, code: string) => void;
}

export default function CodeInput({ onVerified }: CodeInputProps) {
  const t = useTranslations("downloads");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/downloads/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        setError(t("invalid"));
        setLoading(false);
        return;
      }

      const data = await res.json();
      onVerified(data, code.trim());
    } catch {
      setError(t("invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-5">
      <div className="flex items-center border-b border-ink">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("placeholder")}
          className="w-60 bg-transparent font-mono text-base tracking-[.35em] uppercase py-3 px-1 outline-none placeholder:text-fog placeholder:tracking-[.2em]"
          aria-label={t("placeholder")}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-2 py-3 text-lg hover:text-fog transition-colors disabled:opacity-50"
          aria-label={t("submit")}
        >
          {loading ? "…" : "→"}
        </button>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <p className="text-xs text-fog">{t("hint")}</p>
    </form>
  );
}
```

- [ ] **Step 2: DownloadGallery ersetzen**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
}

function thumbUrl(image: DownloadImage, size: number): string {
  if (image.thumbnailLink) {
    return image.thumbnailLink.replace(/=s\d+$/, `=s${size}`);
  }
  return `/api/drive/file/${image.id}`;
}

interface DownloadGalleryProps {
  label: string;
  images: DownloadImage[];
  code: string;
}

export default function DownloadGallery({ label, images, code }: DownloadGalleryProps) {
  const t = useTranslations("downloads");
  const [downloading, setDownloading] = useState(false);

  async function downloadAll() {
    setDownloading(true);
    try {
      const res = await fetch("/api/downloads/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cosmo-photos-${label}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <h2 className="text-3xl font-semibold tracking-tight">{label}</h2>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="bg-ink text-paper text-xs tracking-[.1em] uppercase px-6 py-3 hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {downloading ? "…" : `${t("downloadAll")} ↓`}
        </button>
      </div>

      {images.length === 0 ? (
        <p className="text-fog text-center py-12 text-sm">{t("emptyAlbum")}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-[3/2] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbUrl(image, 800)}
                alt={image.name}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <a
                href={`/api/drive/file/${image.id}`}
                download={image.name}
                className="absolute bottom-2.5 right-2.5 bg-ink text-paper font-mono text-[10px] tracking-[.1em] uppercase px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ↓
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Downloads-Seite ersetzen**

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CodeInput from "@/components/downloads/CodeInput";
import DownloadGallery from "@/components/downloads/DownloadGallery";

interface DownloadImage {
  id: string;
  name: string;
  thumbnailLink?: string;
}

interface VerifiedData {
  label: string;
  images: DownloadImage[];
}

export default function DownloadsPage() {
  const t = useTranslations("downloads");
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [code, setCode] = useState("");

  return (
    <div className="pt-[100px] px-6 md:px-10 pb-20">
      {!verified ? (
        <div className="min-h-[55vh] flex flex-col items-center justify-center text-center">
          <p className="text-xs tracking-label uppercase text-fog mb-4">{t("label")}</p>
          <h1 className="text-3xl md:text-[34px] font-semibold tracking-tight mb-9">
            {t("headline")}
          </h1>
          <CodeInput
            onVerified={(data, c) => {
              setVerified(data);
              setCode(c);
            }}
          />
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <DownloadGallery label={verified.label} images={verified.images} code={code} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verifizieren + Commit**

Run: `npx tsc --noEmit && npm run build`
Expected: OK. Dev: `/de/downloads` → Code-Eingabe zentriert; mit gültigem Album-Code: Galerie + ZIP-Download funktionieren.

```bash
git add -A && git commit -m "feat(redesign): client download area in new design"
```

---

### Task 12: Cleanup, Alt-Code löschen, Schluss-Verifikation

**Files:**
- Delete: `src/components/portfolio/HeroSection.tsx`, `src/components/portfolio/PortfolioGrid.tsx`, `src/components/portfolio/ImageCard.tsx`, `src/components/portfolio/Lightbox.tsx`
- Delete: `src/components/about/Bio.tsx`, `src/components/about/ClientLogos.tsx`
- Delete: `src/components/layout/Footer.tsx`
- Delete: `src/components/ui/AnimatedSection.tsx`
- Modify: `src/messages/de.json`, `src/messages/en.json` (Block `"hero"` entfernen)

- [ ] **Step 1: Alte Komponenten löschen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git rm -r src/components/portfolio src/components/about src/components/ui/AnimatedSection.tsx src/components/layout/Footer.tsx
```

Danach prüfen, dass nichts mehr darauf verweist:

Run: `grep -rn "components/portfolio\|components/about\|AnimatedSection\|layout/Footer" src/`
Expected: keine Treffer (About-Seite nutzt seit Task 10 keine `components/about/*` mehr).

- [ ] **Step 2: `hero`-Block aus beiden Message-Dateien entfernen**

In `src/messages/de.json` und `src/messages/en.json` jeweils den kompletten `"hero": { ... },`-Block löschen.

Run: `grep -rn '"hero"\|useTranslations("hero")\|getTranslations("hero")' src/`
Expected: keine Treffer

- [ ] **Step 3: Voll-Verifikation**

```bash
npx tsc --noEmit && npm run build
```
Expected: Build fehlerfrei.

Dev-Server-Durchlauf (Checkliste):
1. `/de` Inkognito: Intro → Panels → Hover-Verhalten → Klick aufs Panel → Projektseite → Lightbox → Prev/Next
2. `/en`: gleiche Tour, englische Texte, `/en/projects/<slug>`-URLs
3. `/de/about`, `/de/contact` (Testmail senden), `/de/downloads` (gültiger Code)
4. Sprachwechsel auf jeder Seite (auch auf einer Projektseite — Slug bleibt erhalten)
5. Mobile-Breite: Menü, gestapelte Cover, Projektseite
6. `/admin`: Dashboard-Stats, Projekte-CRUD/Sync/Cover, Settings inkl. About-Bild
7. macOS-Systemeinstellung „Bewegung reduzieren" aktivieren (oder DevTools-Emulation): keine Intro

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore(redesign): remove legacy frontend components and message keys"
```

---

## Hinweise für die Ausführung

- **Render/Produktion:** `npx drizzle-kit push` (Task 3) muss gegen die Produktions-DB wiederholt werden, bevor der Branch deployed wird (gleicher Befehl mit Produktions-`DATABASE_URL`/`DATABASE_AUTH_TOKEN`).
- **Inhalte nach Deploy:** Im Admin mindestens 1 Projekt mit Drive-Ordner anlegen + syncen, Cover wählen, `status_text_de/en`, `about_headline_de/en`, `about_image_id` setzen — sonst zeigt die Startseite den Empty-State.
- **next-intl typed pathnames:** Falls `Link href={{ pathname: "/projects/[slug]", … }}` Typ-Fehler wirft, prüfen dass `navigation.ts` aus `routing` (mit `pathnames`) erzeugt wird — die Typen kommen von dort.
