# Cosmo Photos Portfolio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a professional sports photography portfolio website for Cosmo Photos with Google Drive image management, client download area, admin panel, and DE/EN language support.

**Architecture:** Next.js 14 App Router with locale-based routing (`/[locale]/...`). Server-side API routes handle Google Drive sync, contact form emails, and download code verification. SQLite (Turso) stores image metadata, download codes, and settings. Admin panel is protected via NextAuth v5.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS v3, Drizzle ORM, Turso (SQLite), NextAuth v5, next-intl, Resend, Framer Motion, Google Drive API

---

## File Structure

```
cosmo-photos/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx              # Public layout (Header + Footer)
│   │   │   ├── page.tsx                # Homepage (Hero + Portfolio)
│   │   │   ├── about/page.tsx          # About page
│   │   │   ├── contact/page.tsx        # Contact form
│   │   │   └── downloads/page.tsx      # Client download area
│   │   ├── admin/
│   │   │   ├── layout.tsx              # Admin layout (sidebar nav)
│   │   │   ├── page.tsx                # Admin dashboard
│   │   │   ├── images/page.tsx         # Image management
│   │   │   ├── downloads/page.tsx      # Download code management
│   │   │   └── settings/page.tsx       # Site settings
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── contact/route.ts        # Contact form handler
│   │   │   ├── drive/
│   │   │   │   ├── sync/route.ts       # Sync from Google Drive
│   │   │   │   └── image/[id]/route.ts # Image proxy
│   │   │   ├── downloads/
│   │   │   │   ├── verify/route.ts     # Verify download code
│   │   │   │   └── zip/route.ts        # ZIP download
│   │   │   ├── images/route.ts         # CRUD images
│   │   │   └── settings/route.ts       # CRUD settings
│   │   ├── layout.tsx                  # Root layout
│   │   └── globals.css                 # Tailwind + custom styles
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── MobileMenu.tsx
│   │   │   └── LanguageToggle.tsx
│   │   ├── portfolio/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── PortfolioGrid.tsx
│   │   │   ├── ImageCard.tsx
│   │   │   └── Lightbox.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── AnimatedSection.tsx
│   │   ├── contact/
│   │   │   └── ContactForm.tsx
│   │   ├── about/
│   │   │   ├── Bio.tsx
│   │   │   └── ClientLogos.tsx
│   │   ├── downloads/
│   │   │   ├── CodeInput.tsx
│   │   │   └── DownloadGallery.tsx
│   │   └── admin/
│   │       ├── AdminSidebar.tsx
│   │       ├── ImageManager.tsx
│   │       ├── DownloadCodeManager.tsx
│   │       └── SettingsForm.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                # Drizzle client
│   │   │   ├── schema.ts              # All table schemas
│   │   │   └── queries.ts             # Reusable query functions
│   │   ├── auth.ts                     # NextAuth config
│   │   ├── drive.ts                    # Google Drive client
│   │   ├── email.ts                    # Resend client
│   │   └── utils.ts                    # Shared helpers
│   ├── middleware.ts                    # i18n + auth middleware
│   └── messages/
│       ├── de.json
│       └── en.json
├── drizzle/                            # Migration files (auto-generated)
├── public/
│   ├── logo.svg
│   └── fonts/                          # Self-hosted fonts
├── .env.local                          # Local env vars (gitignored)
├── .env.example                        # Template
├── drizzle.config.ts
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Foundation

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `.env.example`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Expected: Project scaffolded with Next.js 14, TypeScript, Tailwind, App Router, src directory.

- [ ] **Step 2: Install all dependencies**

```bash
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm @libsql/client next-intl resend framer-motion googleapis bcryptjs archiver
npm install -D drizzle-kit @types/bcryptjs @types/archiver
```

- [ ] **Step 3: Add self-hosted fonts**

Download Bebas Neue and IBM Plex Sans from Google Fonts. Place in `public/fonts/`:

```
public/fonts/
├── BebasNeue-Regular.woff2
├── IBMPlexSans-Regular.woff2
├── IBMPlexSans-Medium.woff2
├── IBMPlexSans-SemiBold.woff2
└── IBMPlexSans-Bold.woff2
```

- [ ] **Step 4: Configure Tailwind with custom theme**

Replace `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
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
        heading: ["Bebas Neue", "sans-serif"],
        body: ["IBM Plex Sans", "sans-serif"],
      },
      letterSpacing: {
        label: "0.2em",
        nav: "0.15em",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 5: Set up global CSS with font faces**

Replace `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@font-face {
  font-family: "Bebas Neue";
  src: url("/fonts/BebasNeue-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans";
  src: url("/fonts/IBMPlexSans-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans";
  src: url("/fonts/IBMPlexSans-Medium.woff2") format("woff2");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans";
  src: url("/fonts/IBMPlexSans-SemiBold.woff2") format("woff2");
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: "IBM Plex Sans";
  src: url("/fonts/IBMPlexSans-Bold.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

body {
  font-family: "IBM Plex Sans", sans-serif;
  color: #1d1d1b;
  background: #ffffff;
}
```

- [ ] **Step 6: Create .env.example and .env.local**

`.env.example`:
```
# Database (Turso)
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-token

# Google Drive
GOOGLE_DRIVE_FOLDER_ID=your-folder-id
GOOGLE_SERVICE_ACCOUNT_KEY=base64-encoded-json

# Auth
NEXTAUTH_SECRET=generate-a-secret
NEXTAUTH_URL=http://localhost:3000
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=bcrypt-hash

# Email (Resend)
RESEND_API_KEY=re_your_key
CONTACT_EMAIL=your@email.com
```

`.env.local` — copy from `.env.example` and fill in dummy values for local dev. Use `libsql://localhost` or file-based SQLite for development.

- [ ] **Step 7: Update .gitignore**

Append to `.gitignore`:
```
.env.local
.superpowers/
```

- [ ] **Step 8: Create placeholder root layout**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cosmo Photos — Sportfotografie",
  description: "Professionelle Sportfotografie für Vereine, Teams und Medien",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 9: Create placeholder locale layout and homepage**

`src/app/[locale]/layout.tsx`:
```tsx
export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return <div>{children}</div>;
}
```

`src/app/[locale]/page.tsx`:
```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="font-heading text-6xl tracking-wide">COSMO PHOTOS</h1>
    </main>
  );
}
```

- [ ] **Step 10: Verify dev server runs**

```bash
npm run dev
```

Open `http://localhost:3000/de` — should show "COSMO PHOTOS" in Bebas Neue.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 14 project with Tailwind and custom fonts"
```

---

### Task 2: Database Setup (Drizzle + Turso)

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `drizzle.config.ts`

- [ ] **Step 1: Create Drizzle schema**

`src/lib/db/schema.ts`:
```ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const images = sqliteTable("images", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  driveFileId: text("drive_file_id").unique(),
  titleDe: text("title_de"),
  titleEn: text("title_en"),
  tags: text("tags"),
  sortOrder: integer("sort_order").notNull().default(0),
  visible: integer("visible", { mode: "boolean" }).notNull().default(true),
  width: integer("width"),
  height: integer("height"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const downloadCodes = sqliteTable("download_codes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text("code").notNull().unique(),
  label: text("label").notNull(),
  expiresAt: text("expires_at"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  downloadCount: integer("download_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const downloadCodeImages = sqliteTable("download_code_images", {
  codeId: text("code_id").notNull().references(() => downloadCodes.id, { onDelete: "cascade" }),
  imageId: text("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
});

export const clientLogos = sqliteTable("client_logos", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

- [ ] **Step 2: Create Drizzle client**

`src/lib/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Create Drizzle config**

`drizzle.config.ts`:
```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

- [ ] **Step 4: Set up local dev database**

For local development, use a file-based SQLite DB. Set in `.env.local`:
```
DATABASE_URL=file:./local.db
```

Generate and run migration:
```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: `drizzle/` folder with migration SQL files. Database tables created.

- [ ] **Step 5: Verify database works**

Create a temporary test in `src/app/api/health/route.ts`:
```ts
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { NextResponse } from "next/server";

export async function GET() {
  await db.insert(settings).values({ key: "test", value: "works" }).onConflictDoUpdate({
    target: settings.key,
    set: { value: "works" },
  });
  const result = await db.select().from(settings);
  return NextResponse.json({ ok: true, settings: result });
}
```

```bash
curl http://localhost:3000/api/health
```

Expected: `{"ok":true,"settings":[{"key":"test","value":"works"}]}`

- [ ] **Step 6: Remove test endpoint and commit**

Delete `src/app/api/health/route.ts`.

```bash
git add -A
git commit -m "feat: add Drizzle ORM with Turso SQLite schema"
```

---

### Task 3: Authentication (NextAuth v5)

**Files:**
- Create: `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`

- [ ] **Step 1: Create auth configuration**

`src/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const isValidUser = credentials.username === process.env.ADMIN_USERNAME;
        if (!isValidUser) return null;

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          process.env.ADMIN_PASSWORD_HASH!
        );
        if (!isValidPassword) return null;

        return { id: "admin", name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
  },
});
```

- [ ] **Step 2: Create auth API route**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 3: Create admin login page**

`src/app/admin/login/page.tsx`:
```tsx
"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      setError("Ungültige Anmeldedaten");
      setLoading(false);
    } else {
      router.push("/admin");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8 bg-bg border border-border">
        <h1 className="font-heading text-3xl tracking-wide text-center">ADMIN</h1>
        <div className="h-1 w-12 bg-primary mx-auto" />

        {error && (
          <p className="text-red-600 text-sm text-center">{error}</p>
        )}

        <input
          name="username"
          type="text"
          placeholder="Benutzername"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm tracking-nav uppercase focus:outline-none focus:border-primary"
        />
        <input
          name="password"
          type="password"
          placeholder="Passwort"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Generate a password hash for testing**

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(h => console.log(h));"
```

Put the output hash in `.env.local` as `ADMIN_PASSWORD_HASH`. Set `ADMIN_USERNAME=admin`. Set `NEXTAUTH_SECRET` to any random string (e.g. `openssl rand -base64 32`).

- [ ] **Step 5: Verify login works**

```bash
npm run dev
```

Open `http://localhost:3000/admin/login`. Login with `admin` / `admin123`. Should redirect to `/admin`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth v5 with credentials provider for admin"
```

---

### Task 4: Internationalization (next-intl)

**Files:**
- Create: `src/messages/de.json`, `src/messages/en.json`, `src/i18n/request.ts`, `src/i18n/routing.ts`
- Modify: `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `next.config.mjs`

- [ ] **Step 1: Create i18n routing config**

`src/i18n/routing.ts`:
```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de", "en"],
  defaultLocale: "de",
});
```

- [ ] **Step 2: Create i18n request config**

`src/i18n/request.ts`:
```ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "de" | "en")) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create translation files**

`src/messages/de.json`:
```json
{
  "nav": {
    "portfolio": "Portfolio",
    "about": "Über mich",
    "contact": "Kontakt",
    "downloads": "Downloads"
  },
  "hero": {
    "tagline": "Sportfotografie auf höchstem Niveau",
    "cta": "Portfolio ansehen"
  },
  "about": {
    "title": "Über mich",
    "clients": "Kunden & Referenzen"
  },
  "contact": {
    "title": "Kontakt",
    "name": "Name",
    "email": "E-Mail",
    "subject": "Betreff",
    "message": "Nachricht",
    "file": "Datei anhängen (optional)",
    "send": "Nachricht senden",
    "success": "Nachricht wurde gesendet!",
    "error": "Fehler beim Senden. Bitte versuche es erneut."
  },
  "downloads": {
    "title": "Kundenbereich",
    "placeholder": "Download-Code eingeben",
    "submit": "Zugang",
    "invalid": "Ungültiger oder abgelaufener Code",
    "downloadAll": "Alle herunterladen"
  },
  "footer": {
    "rights": "Alle Rechte vorbehalten"
  }
}
```

`src/messages/en.json`:
```json
{
  "nav": {
    "portfolio": "Portfolio",
    "about": "About",
    "contact": "Contact",
    "downloads": "Downloads"
  },
  "hero": {
    "tagline": "Sports Photography at the Highest Level",
    "cta": "View Portfolio"
  },
  "about": {
    "title": "About",
    "clients": "Clients & References"
  },
  "contact": {
    "title": "Contact",
    "name": "Name",
    "email": "Email",
    "subject": "Subject",
    "message": "Message",
    "file": "Attach file (optional)",
    "send": "Send Message",
    "success": "Message sent successfully!",
    "error": "Error sending message. Please try again."
  },
  "downloads": {
    "title": "Client Area",
    "placeholder": "Enter download code",
    "submit": "Access",
    "invalid": "Invalid or expired code",
    "downloadAll": "Download All"
  },
  "footer": {
    "rights": "All rights reserved"
  }
}
```

- [ ] **Step 4: Update middleware for i18n + auth**

`src/middleware.ts`:
```ts
import createMiddleware from "next-intl/middleware";
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: check auth
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = await auth();
    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // API and admin/login routes: skip i18n
  if (pathname.startsWith("/api") || pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // Public routes: apply i18n
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next|fonts|logo\\.svg|favicon\\.ico).*)"],
};
```

- [ ] **Step 5: Update next.config.mjs**

`next.config.mjs`:
```js
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 6: Update locale layout with next-intl provider**

`src/app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as "de" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 7: Verify i18n works**

Update `src/app/[locale]/page.tsx`:
```tsx
import { useTranslations } from "next-intl";

export default function HomePage() {
  const t = useTranslations("hero");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="font-heading text-6xl tracking-wide">COSMO PHOTOS</h1>
      <p className="font-body text-secondary tracking-label uppercase text-sm">
        {t("tagline")}
      </p>
    </main>
  );
}
```

```bash
npm run dev
```

- Open `http://localhost:3000/de` → "Sportfotografie auf höchstem Niveau"
- Open `http://localhost:3000/en` → "Sports Photography at the Highest Level"
- Open `http://localhost:3000` → redirects to `/de`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add next-intl with DE/EN translations and locale routing"
```

---

## Phase 2: Layout & Public Pages

### Task 5: Header, Footer & Navigation

**Files:**
- Create: `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/layout/MobileMenu.tsx`, `src/components/layout/LanguageToggle.tsx`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Create LanguageToggle component**

`src/components/layout/LanguageToggle.tsx`:
```tsx
"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

export default function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale() {
    const newLocale = locale === "de" ? "en" : "de";
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  }

  return (
    <button
      onClick={switchLocale}
      className="font-body text-xs tracking-nav uppercase text-muted hover:text-primary transition-colors"
    >
      <span className={locale === "de" ? "text-primary font-semibold" : ""}>DE</span>
      <span className="mx-1">|</span>
      <span className={locale === "en" ? "text-primary font-semibold" : ""}>EN</span>
    </button>
  );
}
```

- [ ] **Step 2: Create Header component**

`src/components/layout/Header.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import MobileMenu from "./MobileMenu";

export default function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: `/${locale}`, label: t("portfolio") },
    { href: `/${locale}/about`, label: t("about") },
    { href: `/${locale}/contact`, label: t("contact") },
    { href: `/${locale}/downloads`, label: t("downloads") },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b-2 border-primary">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex-shrink-0">
            <span className="font-heading text-2xl tracking-wider">COSMO PHOTOS</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm tracking-nav uppercase text-secondary hover:text-primary transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-primary hover:after:w-full after:transition-all"
              >
                {link.label}
              </Link>
            ))}
            <LanguageToggle />
          </nav>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            <span className={`w-6 h-0.5 bg-primary transition-transform ${mobileOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`w-6 h-0.5 bg-primary transition-opacity ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`w-6 h-0.5 bg-primary transition-transform ${mobileOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </header>

      <MobileMenu open={mobileOpen} links={links} onClose={() => setMobileOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Create MobileMenu component**

`src/components/layout/MobileMenu.tsx`:
```tsx
"use client";

import Link from "next/link";
import LanguageToggle from "./LanguageToggle";

interface MobileMenuProps {
  open: boolean;
  links: { href: string; label: string }[];
  onClose: () => void;
}

export default function MobileMenu({ open, links, onClose }: MobileMenuProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-white pt-20 md:hidden">
      <nav className="flex flex-col items-center gap-8 pt-12">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="font-heading text-3xl tracking-wider text-primary hover:text-secondary transition-colors"
          >
            {link.label.toUpperCase()}
          </Link>
        ))}
        <div className="mt-4">
          <LanguageToggle />
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Create Footer component**

`src/components/layout/Footer.tsx`:
```tsx
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-primary bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <span className="font-heading text-xl tracking-wider">COSMO PHOTOS</span>

          {/* Social Links — placeholders, managed via admin */}
          <div className="flex gap-6">
            <a href="#" className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase">
              Instagram
            </a>
            <a href="#" className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase">
              LinkedIn
            </a>
          </div>

          {/* Copyright */}
          <p className="text-muted text-xs tracking-label uppercase">
            &copy; {year} Cosmo Photos. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Wire layout together**

Update `src/app/[locale]/layout.tsx`:
```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!routing.locales.includes(locale as "de" | "en")) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Header />
      <main className="pt-20">{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 6: Verify header, footer, nav, language toggle**

```bash
npm run dev
```

- Open `http://localhost:3000/de` — header with nav links, footer, DE/EN toggle
- Click EN → URL changes to `/en`, translations switch
- Resize to mobile → hamburger menu appears
- Click hamburger → full screen nav overlay

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Header, Footer, MobileMenu, and LanguageToggle components"
```

---

### Task 6: Homepage — Hero Section

**Files:**
- Create: `src/components/portfolio/HeroSection.tsx`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Create HeroSection component**

`src/components/portfolio/HeroSection.tsx`:
```tsx
"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export default function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden bg-primary">
      {/* Background image — will be dynamic later (from admin settings) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: "url('/hero-placeholder.jpg')" }}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <motion.h1
          className="font-heading text-7xl md:text-9xl tracking-wider text-white"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          COSMO
        </motion.h1>

        <motion.div
          className="h-1 w-24 bg-white mx-auto my-6"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        />

        <motion.p
          className="font-body text-sm md:text-base tracking-label uppercase text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {t("tagline")}
        </motion.p>

        <motion.a
          href="#portfolio"
          className="inline-block mt-10 px-8 py-3 border-2 border-white text-white font-body text-sm tracking-nav uppercase hover:bg-white hover:text-primary transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {t("cta")}
        </motion.a>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <div className="w-px h-12 bg-white/50" />
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Update homepage**

`src/app/[locale]/page.tsx`:
```tsx
import HeroSection from "@/components/portfolio/HeroSection";

export default function HomePage() {
  return (
    <main className="-mt-20">
      <HeroSection />
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-24">
        <h2 className="font-heading text-5xl tracking-wide mb-16">PORTFOLIO</h2>
        <p className="text-muted">Portfolio grid coming next...</p>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Add a placeholder hero image**

Place any large landscape photo at `public/hero-placeholder.jpg` for development. This will later be replaced by the admin-selected hero image from Google Drive.

- [ ] **Step 4: Verify hero section**

```bash
npm run dev
```

Open `http://localhost:3000/de` — fullscreen hero with animated text, tagline, CTA button, scroll indicator.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add animated hero section to homepage"
```

---

### Task 7: Homepage — Portfolio Grid & Lightbox

**Files:**
- Create: `src/components/portfolio/PortfolioGrid.tsx`, `src/components/portfolio/ImageCard.tsx`, `src/components/portfolio/Lightbox.tsx`
- Create: `src/lib/db/queries.ts`
- Modify: `src/app/[locale]/page.tsx`

- [ ] **Step 1: Create database query helpers**

`src/lib/db/queries.ts`:
```ts
import { db } from "./index";
import { images, downloadCodes, downloadCodeImages, clientLogos, settings } from "./schema";
import { eq, and, asc, desc } from "drizzle-orm";

export async function getVisibleImages() {
  return db.select().from(images).where(eq(images.visible, true)).orderBy(asc(images.sortOrder));
}

export async function getAllImages() {
  return db.select().from(images).orderBy(asc(images.sortOrder));
}

export async function getSetting(key: string) {
  const result = await db.select().from(settings).where(eq(settings.key, key));
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getClientLogos() {
  return db.select().from(clientLogos).orderBy(asc(clientLogos.sortOrder));
}

export async function verifyDownloadCode(code: string) {
  const result = await db
    .select()
    .from(downloadCodes)
    .where(and(eq(downloadCodes.code, code), eq(downloadCodes.active, true)));

  const downloadCode = result[0];
  if (!downloadCode) return null;

  if (downloadCode.expiresAt && new Date(downloadCode.expiresAt) < new Date()) {
    return null;
  }

  const codeImages = await db
    .select({ image: images })
    .from(downloadCodeImages)
    .innerJoin(images, eq(downloadCodeImages.imageId, images.id))
    .where(eq(downloadCodeImages.codeId, downloadCode.id));

  return {
    ...downloadCode,
    images: codeImages.map((row) => row.image),
  };
}
```

- [ ] **Step 2: Create ImageCard component**

`src/components/portfolio/ImageCard.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { useLocale } from "next-intl";

interface ImageCardProps {
  image: {
    id: string;
    titleDe: string | null;
    titleEn: string | null;
    width: number | null;
    height: number | null;
  };
  index: number;
  onClick: () => void;
}

export default function ImageCard({ image, index, onClick }: ImageCardProps) {
  const locale = useLocale();
  const title = locale === "de" ? image.titleDe : image.titleEn;

  return (
    <motion.div
      className="relative cursor-pointer overflow-hidden group"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (index % 3) * 0.1 }}
      onClick={onClick}
    >
      <img
        src={`/api/drive/image/${image.id}`}
        alt={title || "Sports photo"}
        className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/60 transition-colors duration-300 flex items-end">
        {title && (
          <p className="p-4 text-white font-body text-sm tracking-nav uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {title}
          </p>
        )}
      </div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Create Lightbox component**

`src/components/portfolio/Lightbox.tsx`:
```tsx
"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "next-intl";

interface LightboxProps {
  images: {
    id: string;
    titleDe: string | null;
    titleEn: string | null;
  }[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({ images, currentIndex, onClose, onNavigate }: LightboxProps) {
  const locale = useLocale();
  const current = images[currentIndex];
  const title = locale === "de" ? current?.titleDe : current?.titleEn;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
      if (e.key === "ArrowLeft" && currentIndex > 0) onNavigate(currentIndex - 1);
    },
    [currentIndex, images.length, onClose, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Close button */}
        <button
          className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light z-10"
          onClick={onClose}
        >
          &times;
        </button>

        {/* Counter */}
        <div className="absolute top-6 left-6 text-white/60 font-body text-sm tracking-nav">
          {currentIndex + 1} / {images.length}
        </div>

        {/* Previous */}
        {currentIndex > 0 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl font-light z-10 p-4"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          >
            &#8249;
          </button>
        )}

        {/* Image */}
        <motion.img
          key={current.id}
          src={`/api/drive/image/${current.id}?size=large`}
          alt={title || "Sports photo"}
          className="max-h-[85vh] max-w-[90vw] object-contain"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next */}
        {currentIndex < images.length - 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl font-light z-10 p-4"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            &#8250;
          </button>
        )}

        {/* Title */}
        {title && (
          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 font-body text-sm tracking-nav uppercase">
            {title}
          </p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Create PortfolioGrid component**

`src/components/portfolio/PortfolioGrid.tsx`:
```tsx
"use client";

import { useState } from "react";
import ImageCard from "./ImageCard";
import Lightbox from "./Lightbox";

interface PortfolioImage {
  id: string;
  titleDe: string | null;
  titleEn: string | null;
  width: number | null;
  height: number | null;
}

export default function PortfolioGrid({ images }: { images: PortfolioImage[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            index={index}
            onClick={() => setLightboxIndex(index)}
          />
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Update homepage to fetch and display images**

`src/app/[locale]/page.tsx`:
```tsx
import HeroSection from "@/components/portfolio/HeroSection";
import PortfolioGrid from "@/components/portfolio/PortfolioGrid";
import { getVisibleImages } from "@/lib/db/queries";

export default async function HomePage() {
  const images = await getVisibleImages();

  return (
    <main className="-mt-20">
      <HeroSection />
      <section id="portfolio" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-center gap-6 mb-16">
          <h2 className="font-heading text-5xl tracking-wide">PORTFOLIO</h2>
          <div className="flex-1 h-0.5 bg-primary" />
        </div>
        {images.length > 0 ? (
          <PortfolioGrid images={images} />
        ) : (
          <p className="text-muted text-center py-24 text-sm tracking-label uppercase">
            Noch keine Bilder vorhanden
          </p>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Verify portfolio grid renders (empty state)**

```bash
npm run dev
```

Open `http://localhost:3000/de` — should show hero, then portfolio section with "Noch keine Bilder vorhanden" message.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add portfolio grid with masonry layout and lightbox"
```

---

### Task 8: About Page

**Files:**
- Create: `src/components/about/Bio.tsx`, `src/components/about/ClientLogos.tsx`, `src/app/[locale]/about/page.tsx`

- [ ] **Step 1: Create Bio component**

`src/components/about/Bio.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";

interface BioProps {
  text: string;
}

export default function Bio({ text }: BioProps) {
  return (
    <motion.section
      className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Photo */}
      <div className="relative">
        <div className="aspect-[3/4] bg-surface border border-border flex items-center justify-center">
          <span className="text-muted text-xs tracking-label uppercase">Foto</span>
        </div>
        {/* Decorative line */}
        <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-primary -z-10" />
      </div>

      {/* Text */}
      <div>
        <div className="h-1 w-16 bg-primary mb-8" />
        <div className="font-body text-secondary leading-relaxed whitespace-pre-line">
          {text}
        </div>
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Create ClientLogos component**

`src/components/about/ClientLogos.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

interface Logo {
  id: string;
  name: string;
  imageUrl: string;
}

export default function ClientLogos({ logos }: { logos: Logo[] }) {
  const t = useTranslations("about");

  if (logos.length === 0) return null;

  return (
    <section className="mt-24">
      <div className="flex items-center gap-6 mb-12">
        <h3 className="font-heading text-3xl tracking-wide">{t("clients").toUpperCase()}</h3>
        <div className="flex-1 h-0.5 bg-border" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-12">
        {logos.map((logo, index) => (
          <motion.div
            key={logo.id}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
          >
            <img
              src={logo.imageUrl}
              alt={logo.name}
              className="h-12 w-auto object-contain"
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create About page**

`src/app/[locale]/about/page.tsx`:
```tsx
import { useTranslations } from "next-intl";
import Bio from "@/components/about/Bio";
import ClientLogos from "@/components/about/ClientLogos";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export default async function AboutPage() {
  const t = useTranslations("about");
  const bioText = (await getSetting("bio_de")) || "Bio-Text wird im Admin-Panel gepflegt.";
  const logos = await getClientLogos();

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <Bio text={bioText} />
      <ClientLogos logos={logos} />
    </div>
  );
}
```

- [ ] **Step 4: Verify about page**

```bash
npm run dev
```

Open `http://localhost:3000/de/about` — should show the about page layout with placeholder photo, bio text, and empty client logos section.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add About page with Bio and ClientLogos components"
```

---

### Task 9: Contact Page

**Files:**
- Create: `src/components/contact/ContactForm.tsx`, `src/app/[locale]/contact/page.tsx`, `src/lib/email.ts`, `src/app/api/contact/route.ts`

- [ ] **Step 1: Create Resend email client**

`src/lib/email.ts`:
```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface ContactEmailData {
  name: string;
  email: string;
  subject: string;
  message: string;
  attachment?: {
    filename: string;
    content: Buffer;
  };
}

export async function sendContactEmail(data: ContactEmailData) {
  const { name, email, subject, message, attachment } = data;

  return resend.emails.send({
    from: "Cosmo Photos <noreply@cosmophotos.de>",
    to: process.env.CONTACT_EMAIL!,
    replyTo: email,
    subject: `[Kontakt] ${subject}`,
    text: `Name: ${name}\nE-Mail: ${email}\n\n${message}`,
    attachments: attachment
      ? [{ filename: attachment.filename, content: attachment.content }]
      : undefined,
  });
}
```

- [ ] **Step 2: Create contact API route**

`src/app/api/contact/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/email";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.lastReset > RATE_WINDOW) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Zu viele Anfragen. Bitte warte kurz." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const subject = formData.get("subject") as string;
  const message = formData.get("message") as string;
  const honeypot = formData.get("website") as string;
  const file = formData.get("file") as File | null;

  // Honeypot check
  if (honeypot) {
    return NextResponse.json({ success: true }); // Silently ignore
  }

  // Validation
  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Alle Pflichtfelder ausfüllen." }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
  }

  let attachment: { filename: string; content: Buffer } | undefined;
  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Datei zu groß (max. 5MB)." }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    attachment = { filename: file.name, content: Buffer.from(arrayBuffer) };
  }

  try {
    await sendContactEmail({ name, email, subject, message, attachment });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Fehler beim Senden." }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create ContactForm component**

`src/components/contact/ContactForm.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Honeypot */}
      <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("name")} *
        </label>
        <input
          name="name"
          type="text"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("email")} *
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("subject")} *
        </label>
        <input
          name="subject"
          type="text"
          required
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("message")} *
        </label>
        <textarea
          name="message"
          required
          rows={6}
          className="w-full px-4 py-3 border border-border font-body text-sm focus:outline-none focus:border-primary transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-xs tracking-label uppercase text-muted mb-2">
          {t("file")}
        </label>
        <input
          name="file"
          type="file"
          className="w-full font-body text-sm text-muted file:mr-4 file:py-2 file:px-4 file:border file:border-border file:bg-surface file:text-primary file:text-xs file:tracking-label file:uppercase file:cursor-pointer"
        />
      </div>

      {status === "success" && (
        <p className="text-green-700 text-sm font-body">{t("success")}</p>
      )}
      {status === "error" && (
        <p className="text-red-600 text-sm font-body">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="px-8 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {status === "sending" ? "..." : t("send")}
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Create Contact page**

`src/app/[locale]/contact/page.tsx`:
```tsx
import { useTranslations } from "next-intl";
import ContactForm from "@/components/contact/ContactForm";

export default function ContactPage() {
  const t = useTranslations("contact");

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <ContactForm />

        {/* Sidebar */}
        <div className="space-y-8">
          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">E-Mail</h3>
            <a href="mailto:info@cosmophotos.de" className="font-body text-primary hover:text-secondary transition-colors">
              info@cosmophotos.de
            </a>
          </div>

          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">Social Media</h3>
            <div className="flex gap-4">
              <a href="#" className="font-body text-sm text-secondary hover:text-primary transition-colors">
                Instagram
              </a>
              <a href="#" className="font-body text-sm text-secondary hover:text-primary transition-colors">
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify contact page and form submission**

```bash
npm run dev
```

Open `http://localhost:3000/de/contact` — form should render. Submit will return an error since Resend isn't configured, but the UI flow should work (validation, loading state, error message).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Contact page with form, email sending, and spam protection"
```

---

## Phase 3: Google Drive Integration

### Task 10: Google Drive Client & Sync

**Files:**
- Create: `src/lib/drive.ts`, `src/app/api/drive/sync/route.ts`, `src/app/api/drive/image/[id]/route.ts`

- [ ] **Step 1: Create Google Drive client**

`src/lib/drive.ts`:
```ts
import { google } from "googleapis";

function getDriveClient() {
  const keyJson = JSON.parse(
    Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, "base64").toString()
  );

  const auth = new google.auth.GoogleAuth({
    credentials: keyJson,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  imageMediaMetadata?: {
    width: number;
    height: number;
  };
}

export async function listDriveImages(): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: "files(id, name, mimeType, imageMediaMetadata)",
    orderBy: "name",
    pageSize: 100,
  });

  return (response.data.files || []) as DriveFile[];
}

export async function getDriveImageStream(fileId: string) {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  return response.data;
}

export async function getDriveImageBuffer(fileId: string): Promise<Buffer> {
  const drive = getDriveClient();

  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(response.data as ArrayBuffer);
}
```

- [ ] **Step 2: Create sync API route**

`src/app/api/drive/sync/route.ts`:
```ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listDriveImages } from "@/lib/drive";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const driveFiles = await listDriveImages();
    const existingImages = await db.select().from(images);
    const existingDriveIds = new Set(existingImages.map((img) => img.driveFileId));

    let added = 0;
    const maxOrder = existingImages.reduce((max, img) => Math.max(max, img.sortOrder), 0);

    for (const file of driveFiles) {
      if (!existingDriveIds.has(file.id)) {
        await db.insert(images).values({
          driveFileId: file.id,
          titleDe: file.name.replace(/\.[^.]+$/, ""),
          titleEn: file.name.replace(/\.[^.]+$/, ""),
          width: file.imageMediaMetadata?.width || null,
          height: file.imageMediaMetadata?.height || null,
          sortOrder: maxOrder + added + 1,
        });
        added++;
      }
    }

    return NextResponse.json({ synced: added, total: driveFiles.length });
  } catch (error) {
    console.error("Drive sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create image proxy route**

`src/app/api/drive/image/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDriveImageBuffer } from "@/lib/drive";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const image = await db
    .select()
    .from(images)
    .where(eq(images.id, params.id));

  if (!image[0] || !image[0].driveFileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await getDriveImageBuffer(image[0].driveFileId);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Image fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify (requires Google Drive setup)**

This requires a configured Google Cloud service account and shared Drive folder. For now, verify the routes exist and the code compiles:

```bash
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Google Drive integration with sync and image proxy"
```

---

## Phase 4: Download Area

### Task 11: Download Code Verification & ZIP

**Files:**
- Create: `src/app/api/downloads/verify/route.ts`, `src/app/api/downloads/zip/route.ts`

- [ ] **Step 1: Create download code verification API**

`src/app/api/downloads/verify/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyDownloadCode } from "@/lib/db/queries";

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.lastReset > 60_000) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  }

  const { code } = await request.json();
  if (!code || typeof code !== "string") {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const result = await verifyDownloadCode(code.trim());
  if (!result) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 404 });
  }

  return NextResponse.json({
    label: result.label,
    images: result.images.map((img) => ({
      id: img.id,
      titleDe: img.titleDe,
      titleEn: img.titleEn,
    })),
  });
}
```

- [ ] **Step 2: Create ZIP download API**

`src/app/api/downloads/zip/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { verifyDownloadCode } from "@/lib/db/queries";
import { getDriveImageBuffer } from "@/lib/drive";
import { db } from "@/lib/db";
import { downloadCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import archiver from "archiver";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  const { code } = await request.json();

  const result = await verifyDownloadCode(code);
  if (!result) {
    return NextResponse.json({ error: "Invalid code" }, { status: 404 });
  }

  // Increment download count
  await db
    .update(downloadCodes)
    .set({ downloadCount: sql`${downloadCodes.downloadCount} + 1` })
    .where(eq(downloadCodes.id, result.id));

  // Create ZIP
  const archive = archiver("zip", { zlib: { level: 5 } });
  const chunks: Buffer[] = [];

  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  for (const image of result.images) {
    if (image.driveFileId) {
      try {
        const buffer = await getDriveImageBuffer(image.driveFileId);
        const filename = (image.titleDe || image.id) + ".jpg";
        archive.append(buffer, { name: filename });
      } catch (error) {
        console.error(`Failed to fetch image ${image.id}:`, error);
      }
    }
  }

  await archive.finalize();

  const zipBuffer = Buffer.concat(chunks);
  const safeName = result.label.replace(/[^a-zA-Z0-9-_]/g, "_");

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="cosmo-photos-${safeName}.zip"`,
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add download code verification and ZIP download API"
```

---

### Task 12: Download Page UI

**Files:**
- Create: `src/components/downloads/CodeInput.tsx`, `src/components/downloads/DownloadGallery.tsx`, `src/app/[locale]/downloads/page.tsx`

- [ ] **Step 1: Create CodeInput component**

`src/components/downloads/CodeInput.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface CodeInputProps {
  onVerified: (data: { label: string; images: { id: string; titleDe: string | null; titleEn: string | null }[] }) => void;
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
      onVerified(data);
    } catch {
      setError(t("invalid"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full max-w-md px-6 py-4 border-2 border-border font-body text-center text-lg tracking-wider uppercase focus:outline-none focus:border-primary transition-colors"
      />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="px-8 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
      >
        {loading ? "..." : t("submit")}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create DownloadGallery component**

`src/components/downloads/DownloadGallery.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";

interface DownloadImage {
  id: string;
  titleDe: string | null;
  titleEn: string | null;
}

interface DownloadGalleryProps {
  label: string;
  images: DownloadImage[];
  code: string;
}

export default function DownloadGallery({ label, images, code }: DownloadGalleryProps) {
  const t = useTranslations("downloads");
  const locale = useLocale();
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
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-heading text-3xl tracking-wide">{label.toUpperCase()}</h2>
        <button
          onClick={downloadAll}
          disabled={downloading}
          className="px-6 py-3 bg-primary text-white font-body text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {downloading ? "..." : t("downloadAll")}
        </button>
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((image) => {
          const title = locale === "de" ? image.titleDe : image.titleEn;
          return (
            <div key={image.id} className="relative group">
              <img
                src={`/api/drive/image/${image.id}`}
                alt={title || "Photo"}
                className="w-full h-auto"
                loading="lazy"
              />
              <a
                href={`/api/drive/image/${image.id}?download=true`}
                download
                className="absolute bottom-3 right-3 px-3 py-1.5 bg-primary text-white text-xs tracking-nav uppercase opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Download
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create Downloads page**

`src/app/[locale]/downloads/page.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import CodeInput from "@/components/downloads/CodeInput";
import DownloadGallery from "@/components/downloads/DownloadGallery";

interface VerifiedData {
  label: string;
  images: { id: string; titleDe: string | null; titleEn: string | null }[];
}

export default function DownloadsPage() {
  const t = useTranslations("downloads");
  const [verified, setVerified] = useState<VerifiedData | null>(null);
  const [code, setCode] = useState("");

  function handleVerified(data: VerifiedData) {
    setVerified(data);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      {!verified ? (
        <div className="py-24">
          <CodeInput
            onVerified={(data) => {
              handleVerified(data);
            }}
          />
        </div>
      ) : (
        <DownloadGallery label={verified.label} images={verified.images} code={code} />
      )}
    </div>
  );
}
```

Note: The `code` state needs to be passed from CodeInput. Update CodeInput's onVerified to also return the code, or lift state. Simplest fix — update the downloads page to track code:

Replace the `handleVerified` + CodeInput section:
```tsx
// In DownloadsPage, update CodeInput usage:
<CodeInput
  onVerified={(data) => {
    setVerified(data);
  }}
  onCodeSubmit={(c: string) => setCode(c)}
/>
```

And update CodeInput to accept and call `onCodeSubmit`:
```tsx
// Add to CodeInputProps:
onCodeSubmit?: (code: string) => void;

// In handleSubmit, before onVerified(data):
onCodeSubmit?.(code.trim());
```

- [ ] **Step 4: Verify downloads page**

```bash
npm run dev
```

Open `http://localhost:3000/de/downloads` — code input should render. Submitting any code should show "Ungültiger Code" since no codes exist yet.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add client download area with code verification and ZIP download"
```

---

## Phase 5: Admin Panel

### Task 13: Admin Layout & Dashboard

**Files:**
- Create: `src/components/admin/AdminSidebar.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`

- [ ] **Step 1: Create AdminSidebar component**

`src/components/admin/AdminSidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/images", label: "Bilder" },
  { href: "/admin/downloads", label: "Downloads" },
  { href: "/admin/settings", label: "Einstellungen" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-primary text-white p-6 flex flex-col">
      <Link href="/admin" className="font-heading text-xl tracking-wider mb-8">
        COSMO ADMIN
      </Link>

      <nav className="flex flex-col gap-2 flex-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 text-sm tracking-nav uppercase transition-colors ${
                active ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/admin/login" })}
        className="px-4 py-2 text-sm tracking-nav uppercase text-white/40 hover:text-white transition-colors"
      >
        Abmelden
      </button>
    </aside>
  );
}
```

- [ ] **Step 2: Create Admin layout**

`src/app/admin/layout.tsx`:
```tsx
import { SessionProvider } from "next-auth/react";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className="flex-1 p-8 bg-surface">{children}</main>
      </div>
    </SessionProvider>
  );
}
```

- [ ] **Step 3: Create Admin dashboard page**

`src/app/admin/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { images, downloadCodes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminDashboard() {
  const allImages = await db.select().from(images);
  const visibleCount = allImages.filter((img) => img.visible).length;
  const codes = await db.select().from(downloadCodes);
  const activeCodes = codes.filter((c) => c.active).length;

  const stats = [
    { label: "Bilder gesamt", value: allImages.length },
    { label: "Bilder sichtbar", value: visibleCount },
    { label: "Download-Codes", value: codes.length },
    { label: "Codes aktiv", value: activeCodes },
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

- [ ] **Step 4: Verify admin panel**

```bash
npm run dev
```

Login at `/admin/login`, then see dashboard with stats. Sidebar navigation should work.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin layout with sidebar and dashboard"
```

---

### Task 14: Admin — Image Management

**Files:**
- Create: `src/components/admin/ImageManager.tsx`, `src/app/admin/images/page.tsx`, `src/app/api/images/route.ts`

- [ ] **Step 1: Create images CRUD API route**

`src/app/api/images/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allImages = await db.select().from(images).orderBy(images.sortOrder);
  return NextResponse.json(allImages);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db
    .update(images)
    .set({ ...updates, updatedAt: new Date().toISOString() })
    .where(eq(images.id, id));

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await db.delete(images).where(eq(images.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create ImageManager component**

`src/components/admin/ImageManager.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";

interface ImageData {
  id: string;
  driveFileId: string | null;
  titleDe: string | null;
  titleEn: string | null;
  tags: string | null;
  sortOrder: number;
  visible: boolean;
}

export default function ImageManager() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchImages() {
    const res = await fetch("/api/images");
    const data = await res.json();
    setImages(data);
    setLoading(false);
  }

  useEffect(() => { fetchImages(); }, []);

  async function handleSync() {
    setSyncing(true);
    const res = await fetch("/api/drive/sync", { method: "POST" });
    const data = await res.json();
    alert(`Sync abgeschlossen: ${data.synced} neue Bilder`);
    fetchImages();
    setSyncing(false);
  }

  async function toggleVisibility(id: string, visible: boolean) {
    await fetch("/api/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, visible: !visible }),
    });
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, visible: !visible } : img))
    );
  }

  async function updateTitle(id: string, titleDe: string, titleEn: string) {
    await fetch("/api/images", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, titleDe, titleEn }),
    });
  }

  async function deleteImage(id: string) {
    if (!confirm("Bild wirklich aus dem Portfolio entfernen?")) return;
    await fetch("/api/images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div>
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          {syncing ? "Synchronisiert..." : "Google Drive Sync"}
        </button>
        <span className="text-muted text-sm">{images.length} Bilder</span>
      </div>

      <div className="space-y-3">
        {images.map((image) => (
          <div
            key={image.id}
            className={`flex items-center gap-4 p-4 bg-white border border-border ${
              !image.visible ? "opacity-50" : ""
            }`}
          >
            {/* Thumbnail */}
            <img
              src={`/api/drive/image/${image.id}`}
              alt=""
              className="w-20 h-14 object-cover flex-shrink-0"
            />

            {/* Titles */}
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input
                defaultValue={image.titleDe || ""}
                placeholder="Titel (DE)"
                onBlur={(e) => updateTitle(image.id, e.target.value, image.titleEn || "")}
                className="px-3 py-1.5 border border-border text-sm focus:outline-none focus:border-primary"
              />
              <input
                defaultValue={image.titleEn || ""}
                placeholder="Title (EN)"
                onBlur={(e) => updateTitle(image.id, image.titleDe || "", e.target.value)}
                className="px-3 py-1.5 border border-border text-sm focus:outline-none focus:border-primary"
              />
            </div>

            {/* Actions */}
            <button
              onClick={() => toggleVisibility(image.id, image.visible)}
              className={`px-3 py-1.5 text-xs tracking-nav uppercase border ${
                image.visible
                  ? "border-primary text-primary"
                  : "border-muted text-muted"
              }`}
            >
              {image.visible ? "Sichtbar" : "Versteckt"}
            </button>

            <button
              onClick={() => deleteImage(image.id)}
              className="px-3 py-1.5 text-xs tracking-nav uppercase text-red-600 border border-red-200 hover:border-red-600"
            >
              Entfernen
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin images page**

`src/app/admin/images/page.tsx`:
```tsx
import ImageManager from "@/components/admin/ImageManager";

export default function AdminImagesPage() {
  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">BILDER</h1>
      <ImageManager />
    </div>
  );
}
```

- [ ] **Step 4: Verify image management page**

```bash
npm run dev
```

Open `/admin/images` — should show empty state with Sync button.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin image management with Drive sync"
```

---

### Task 15: Admin — Download Code Management

**Files:**
- Create: `src/components/admin/DownloadCodeManager.tsx`, `src/app/admin/downloads/page.tsx`, `src/app/api/downloads/codes/route.ts`

- [ ] **Step 1: Create download codes CRUD API**

`src/app/api/downloads/codes/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { downloadCodes, downloadCodeImages, images } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const codes = await db.select().from(downloadCodes).orderBy(downloadCodes.createdAt);

  const codesWithImages = await Promise.all(
    codes.map(async (code) => {
      const codeImgs = await db
        .select({ imageId: downloadCodeImages.imageId })
        .from(downloadCodeImages)
        .where(eq(downloadCodeImages.codeId, code.id));
      return { ...code, imageIds: codeImgs.map((ci) => ci.imageId) };
    })
  );

  return NextResponse.json(codesWithImages);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label, expiresAt, imageIds } = await request.json();
  if (!label) return NextResponse.json({ error: "Label required" }, { status: 400 });

  const code = generateCode();
  const id = crypto.randomUUID();

  await db.insert(downloadCodes).values({
    id,
    code,
    label,
    expiresAt: expiresAt || null,
  });

  if (imageIds && imageIds.length > 0) {
    for (const imageId of imageIds) {
      await db.insert(downloadCodeImages).values({ codeId: id, imageId });
    }
  }

  return NextResponse.json({ id, code });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, active } = await request.json();
  await db.update(downloadCodes).set({ active }).where(eq(downloadCodes.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  await db.delete(downloadCodes).where(eq(downloadCodes.id, id));
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create DownloadCodeManager component**

`src/components/admin/DownloadCodeManager.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";

interface DownloadCode {
  id: string;
  code: string;
  label: string;
  expiresAt: string | null;
  active: boolean;
  downloadCount: number;
  imageIds: string[];
}

interface AvailableImage {
  id: string;
  titleDe: string | null;
}

export default function DownloadCodeManager() {
  const [codes, setCodes] = useState<DownloadCode[]>([]);
  const [allImages, setAllImages] = useState<AvailableImage[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newExpiry, setNewExpiry] = useState("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    const [codesRes, imagesRes] = await Promise.all([
      fetch("/api/downloads/codes"),
      fetch("/api/images"),
    ]);
    setCodes(await codesRes.json());
    setAllImages(await imagesRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  async function createCode() {
    if (!newLabel) return;
    const res = await fetch("/api/downloads/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel,
        expiresAt: newExpiry || null,
        imageIds: selectedImages,
      }),
    });
    const data = await res.json();
    alert(`Code erstellt: ${data.code}`);
    setShowCreate(false);
    setNewLabel("");
    setNewExpiry("");
    setSelectedImages([]);
    fetchData();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/downloads/codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    setCodes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !active } : c))
    );
  }

  async function deleteCode(id: string) {
    if (!confirm("Code wirklich löschen?")) return;
    await fetch("/api/downloads/codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCodes((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  return (
    <div>
      <button
        onClick={() => setShowCreate(!showCreate)}
        className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase hover:bg-accent-hover transition-colors mb-8"
      >
        Neuer Download-Code
      </button>

      {showCreate && (
        <div className="bg-white border border-border p-6 mb-8 space-y-4">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (z.B. DFB Pokal 2025)"
            className="w-full px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="date"
            value={newExpiry}
            onChange={(e) => setNewExpiry(e.target.value)}
            className="px-4 py-2 border border-border text-sm focus:outline-none focus:border-primary"
          />
          <div>
            <p className="text-xs tracking-label uppercase text-muted mb-2">Bilder zuweisen:</p>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {allImages.map((img) => (
                <label
                  key={img.id}
                  className={`cursor-pointer border-2 p-1 ${
                    selectedImages.includes(img.id) ? "border-primary" : "border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={selectedImages.includes(img.id)}
                    onChange={() =>
                      setSelectedImages((prev) =>
                        prev.includes(img.id)
                          ? prev.filter((id) => id !== img.id)
                          : [...prev, img.id]
                      )
                    }
                  />
                  <img
                    src={`/api/drive/image/${img.id}`}
                    alt=""
                    className="w-full h-16 object-cover"
                  />
                </label>
              ))}
            </div>
          </div>
          <button
            onClick={createCode}
            className="px-6 py-2 bg-primary text-white text-sm tracking-nav uppercase"
          >
            Erstellen
          </button>
        </div>
      )}

      <div className="space-y-3">
        {codes.map((code) => (
          <div key={code.id} className="flex items-center gap-4 p-4 bg-white border border-border">
            <div className="flex-1">
              <p className="font-body font-semibold">{code.label}</p>
              <p className="font-mono text-sm text-secondary">{code.code}</p>
              <p className="text-xs text-muted mt-1">
                {code.imageIds.length} Bilder &middot; {code.downloadCount} Downloads
                {code.expiresAt && ` · Läuft ab: ${code.expiresAt}`}
              </p>
            </div>
            <button
              onClick={() => toggleActive(code.id, code.active)}
              className={`px-3 py-1.5 text-xs tracking-nav uppercase border ${
                code.active ? "border-green-600 text-green-600" : "border-muted text-muted"
              }`}
            >
              {code.active ? "Aktiv" : "Inaktiv"}
            </button>
            <button
              onClick={() => deleteCode(code.id)}
              className="px-3 py-1.5 text-xs tracking-nav uppercase text-red-600 border border-red-200 hover:border-red-600"
            >
              Löschen
            </button>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="text-muted text-sm py-8 text-center">Keine Download-Codes vorhanden</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create admin downloads page**

`src/app/admin/downloads/page.tsx`:
```tsx
import DownloadCodeManager from "@/components/admin/DownloadCodeManager";

export default function AdminDownloadsPage() {
  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">DOWNLOAD-CODES</h1>
      <DownloadCodeManager />
    </div>
  );
}
```

- [ ] **Step 4: Verify download code management**

```bash
npm run dev
```

Open `/admin/downloads` — should show empty state with "Neuer Download-Code" button.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin download code management"
```

---

### Task 16: Admin — Settings

**Files:**
- Create: `src/components/admin/SettingsForm.tsx`, `src/app/admin/settings/page.tsx`, `src/app/api/settings/route.ts`

- [ ] **Step 1: Create settings API route**

`src/app/api/settings/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allSettings = await db.select().from(settings);
  const settingsMap: Record<string, string> = {};
  allSettings.forEach((s) => { settingsMap[s.key] = s.value; });
  return NextResponse.json(settingsMap);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates: Record<string, string> = await request.json();

  for (const [key, value] of Object.entries(updates)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create SettingsForm component**

`src/components/admin/SettingsForm.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";

export default function SettingsForm() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => { setValues(data); setLoading(false); });
  }, []);

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
    alert("Gespeichert!");
  }

  if (loading) return <p className="text-muted">Laden...</p>;

  const fields = [
    { key: "bio_de", label: "Bio (Deutsch)", type: "textarea" },
    { key: "bio_en", label: "Bio (English)", type: "textarea" },
    { key: "contact_email", label: "Kontakt E-Mail", type: "input" },
    { key: "instagram_url", label: "Instagram URL", type: "input" },
    { key: "linkedin_url", label: "LinkedIn URL", type: "input" },
    { key: "facebook_url", label: "Facebook URL", type: "input" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
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
        {saving ? "Speichert..." : "Speichern"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create admin settings page**

`src/app/admin/settings/page.tsx`:
```tsx
import SettingsForm from "@/components/admin/SettingsForm";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="font-heading text-4xl tracking-wide mb-8">EINSTELLUNGEN</h1>
      <SettingsForm />
    </div>
  );
}
```

- [ ] **Step 4: Verify settings page**

```bash
npm run dev
```

Open `/admin/settings` — form should render with empty fields. Fill in values, save, refresh — values should persist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add admin settings management"
```

---

## Phase 6: Dynamic Content & Social Links

### Task 17: Wire Dynamic Settings to Public Pages

**Files:**
- Modify: `src/components/layout/Footer.tsx`, `src/app/[locale]/about/page.tsx`, `src/app/[locale]/contact/page.tsx`

- [ ] **Step 1: Update Footer to use settings from DB**

`src/components/layout/Footer.tsx` — make it a server component that reads social links from the DB:
```tsx
import { useTranslations } from "next-intl";
import { getSetting } from "@/lib/db/queries";

export default async function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  const instagramUrl = await getSetting("instagram_url");
  const linkedinUrl = await getSetting("linkedin_url");

  const socialLinks = [
    instagramUrl && { label: "Instagram", url: instagramUrl },
    linkedinUrl && { label: "LinkedIn", url: linkedinUrl },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <footer className="border-t-2 border-primary bg-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-heading text-xl tracking-wider">COSMO PHOTOS</span>

          {socialLinks.length > 0 && (
            <div className="flex gap-6">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted hover:text-primary transition-colors text-sm tracking-nav uppercase"
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <p className="text-muted text-xs tracking-label uppercase">
            &copy; {year} Cosmo Photos. {t("rights")}.
          </p>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Update About page to use locale-aware bio**

Update `src/app/[locale]/about/page.tsx` to use the correct locale for bio text:
```tsx
import { useTranslations, useLocale } from "next-intl";
import Bio from "@/components/about/Bio";
import ClientLogos from "@/components/about/ClientLogos";
import { getSetting, getClientLogos } from "@/lib/db/queries";

export default async function AboutPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = useTranslations("about");
  const bioKey = locale === "en" ? "bio_en" : "bio_de";
  const bioText = (await getSetting(bioKey)) || "Bio-Text wird im Admin-Panel gepflegt.";
  const logos = await getClientLogos();

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <Bio text={bioText} />
      <ClientLogos logos={logos} />
    </div>
  );
}
```

- [ ] **Step 3: Update Contact page to use settings for social links**

Update the sidebar in `src/app/[locale]/contact/page.tsx` to read from DB:
```tsx
import { useTranslations } from "next-intl";
import ContactForm from "@/components/contact/ContactForm";
import { getSetting } from "@/lib/db/queries";

export default async function ContactPage() {
  const t = useTranslations("contact");
  const contactEmail = (await getSetting("contact_email")) || "info@cosmophotos.de";
  const instagramUrl = await getSetting("instagram_url");
  const linkedinUrl = await getSetting("linkedin_url");

  return (
    <div className="max-w-6xl mx-auto px-6 py-24">
      <div className="flex items-center gap-6 mb-16">
        <h1 className="font-heading text-5xl tracking-wide">{t("title").toUpperCase()}</h1>
        <div className="flex-1 h-0.5 bg-primary" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <ContactForm />

        <div className="space-y-8">
          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">E-Mail</h3>
            <a href={`mailto:${contactEmail}`} className="font-body text-primary hover:text-secondary transition-colors">
              {contactEmail}
            </a>
          </div>

          <div>
            <h3 className="text-xs tracking-label uppercase text-muted mb-3">Social Media</h3>
            <div className="flex gap-4">
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-secondary hover:text-primary transition-colors">
                  Instagram
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-secondary hover:text-primary transition-colors">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify dynamic content**

Set bio text and social links in `/admin/settings`, then verify they appear on the public pages (`/de/about`, `/de/contact`, footer).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire dynamic settings to public pages (bio, social links)"
```

---

## Phase 7: Polish & Deployment

### Task 18: Animations & Visual Polish

**Files:**
- Create: `src/components/ui/AnimatedSection.tsx`
- Modify: Various page components

- [ ] **Step 1: Create AnimatedSection wrapper**

`src/components/ui/AnimatedSection.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedSection({ children, className, delay = 0 }: AnimatedSectionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Add page transition animations**

Wrap page content in AnimatedSection components on About and Contact pages. Add the component around major sections for staggered reveal.

Example for contact page — wrap the form and sidebar in AnimatedSection:
```tsx
<AnimatedSection>
  <ContactForm />
</AnimatedSection>
<AnimatedSection delay={0.2}>
  {/* sidebar content */}
</AnimatedSection>
```

Apply the same pattern to About page sections.

- [ ] **Step 3: Add smooth scroll behavior**

Add to `src/app/globals.css`:
```css
html {
  scroll-behavior: smooth;
}

/* Selection color matching brand */
::selection {
  background: #1d1d1b;
  color: #ffffff;
}
```

- [ ] **Step 4: Verify animations work smoothly**

```bash
npm run dev
```

Scroll through all pages — sections should fade in smoothly. Hero animations should play on load.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add scroll animations and visual polish"
```

---

### Task 19: SEO & Meta Tags

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/about/page.tsx`, `src/app/[locale]/contact/page.tsx`

- [ ] **Step 1: Update root layout with comprehensive meta**

`src/app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Cosmo Photos — Sportfotografie",
    template: "%s | Cosmo Photos",
  },
  description: "Professionelle Sportfotografie für Vereine, Teams und Medien. Cosmo Photos liefert hochwertige Sportbilder für Ihre Kommunikation.",
  keywords: ["Sportfotografie", "Sports Photography", "Cosmo Photos", "Fotograf", "Sportfotograf"],
  authors: [{ name: "Cosmo Photos" }],
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Cosmo Photos",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Add per-page metadata**

Add `generateMetadata` to each locale page. Example for About:
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Über mich",
  description: "Erfahren Sie mehr über Cosmo Photos — professionelle Sportfotografie.",
};
```

Apply similar metadata to Contact and Downloads pages.

- [ ] **Step 3: Add logo.svg to public folder**

Copy the provided logo.svg to `public/logo.svg`.

- [ ] **Step 4: Verify meta tags**

```bash
npm run build && npm start
```

View page source — meta tags should be present. Check `<title>`, `<meta name="description">`, Open Graph tags.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add SEO meta tags and Open Graph data"
```

---

### Task 20: Render.com Deployment Config

**Files:**
- Create: `render.yaml`

- [ ] **Step 1: Create Render blueprint**

`render.yaml`:
```yaml
services:
  - type: web
    name: cosmo-photos
    runtime: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: DATABASE_AUTH_TOKEN
        sync: false
      - key: GOOGLE_DRIVE_FOLDER_ID
        sync: false
      - key: GOOGLE_SERVICE_ACCOUNT_KEY
        sync: false
      - key: NEXTAUTH_SECRET
        sync: false
      - key: NEXTAUTH_URL
        sync: false
      - key: ADMIN_USERNAME
        sync: false
      - key: ADMIN_PASSWORD_HASH
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: CONTACT_EMAIL
        sync: false
      - key: NODE_VERSION
        value: 20
```

- [ ] **Step 2: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes without errors. Check for any warnings about missing env vars and fix if needed.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Render.com deployment configuration"
```

- [ ] **Step 4: Final verification**

```bash
npm run build && npm start
```

Walk through all pages:
- `http://localhost:3000/de` — Hero + Portfolio
- `http://localhost:3000/de/about` — Bio + Logos
- `http://localhost:3000/de/contact` — Form
- `http://localhost:3000/de/downloads` — Code input
- `http://localhost:3000/en` — English versions
- `http://localhost:3000/admin/login` — Login
- `http://localhost:3000/admin` — Dashboard
- `http://localhost:3000/admin/images` — Image manager
- `http://localhost:3000/admin/downloads` — Code manager
- `http://localhost:3000/admin/settings` — Settings

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 — Foundation | 1-4 | Scaffolding, DB, Auth, i18n |
| 2 — Public Pages | 5-9 | Layout, Hero, Portfolio, About, Contact |
| 3 — Google Drive | 10 | Drive client, sync, image proxy |
| 4 — Downloads | 11-12 | Code verification, ZIP, download UI |
| 5 — Admin | 13-16 | Dashboard, Images, Codes, Settings |
| 6 — Dynamic | 17 | Wire settings to public pages |
| 7 — Polish | 18-20 | Animations, SEO, Render deploy |
