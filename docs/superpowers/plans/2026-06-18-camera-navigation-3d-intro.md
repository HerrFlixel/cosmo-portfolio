# Kamera-Navigation + 3D-Intro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Die minimalistische Kopfzeile und das COSMO-Wisch-Intro durch eine dunkle Kamera-Navigation (Variante A) plus ein 3D-Intro ersetzen, bei dem sich die Kamera aus der Frontansicht ins Top-Menü dreht.

**Architecture:** Eine geteilte Präsentations-Komponente `CameraBar` rendert den Kamera-Oberseiten-Inhalt (Logo-Dial, Nav, Steuerung). `CameraNav` (fixierte Kopfzeile im Locale-Layout) wickelt sie interaktiv ein; `CameraIntro` (Overlay nur auf der Startseite) rendert sie dekorativ auf der Oberseite eines CSS-3D-Quaders und animiert die Drehung. Das echte Menü ist die einzige interaktive Quelle; das Intro überblendet am Ende deckungsgleich darauf, koordiniert über die CSS-Klasse `html.intro-active`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, next-intl (`@/i18n/navigation`), reine CSS-3D-Transforms (keine Three.js, kein Modell, kein Video).

## Global Constraints

- Arbeitsverzeichnis: `/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website` (Leerzeichen im Pfad — in Shell immer quoten).
- Kein Test-Runner im Repo. Verifikation = `npx tsc --noEmit` + `npm run build` + Dev-Smoke (`PORT=3100 npm run dev`, curl/visuell).
- Commit-Message-Footer: jede Commit-Message endet mit `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Niemals `._*` AppleDouble-Dateien committen (`git status` vor jedem Commit prüfen).
- Branch: vor Task 1 einen Feature-Branch anlegen (siehe Task 1, Step 0).
- Design-Tokens unverändert: `paper #F4F4F2`, `ink #111`, `fog #9A9A96`, Fonts Instrument Sans (`font-sans`) + IBM Plex Mono (`font-mono`). Kamera-Töne: Body `#2c2d2f → #0e0f10`, Amber-Rec `#e0a23a`, Auslöser-Rot `#e23b2e`.
- `prefers-reduced-motion`: Intro entfällt komplett (statisches Menü), Rec-Puls/Dial-Hover/Auslöser-Blitz aus.

---

### Task 1: Kamera-Navigation (CameraBar + CameraNav) ersetzt Header

**Files:**
- Create: `src/components/layout/CameraBar.tsx`
- Create: `src/components/layout/CameraNav.tsx`
- Modify: `src/app/globals.css` (Abschnitt „Camera Navigation" anfügen)
- Modify: `src/app/[locale]/layout.tsx` (`Header` → `CameraNav`, Social-URLs laden)
- Modify: `src/components/home/HomeStage.tsx` (Top-Padding desktop/mobil)
- Modify: `src/app/[locale]/about/page.tsx`, `src/app/[locale]/contact/page.tsx`, `src/app/[locale]/downloads/page.tsx`, `src/app/[locale]/projects/[slug]/page.tsx` (Top-Padding)
- Delete: `src/components/layout/Header.tsx`

**Interfaces:**
- Produces:
  - `CameraBar` default export, Props `{ activePath: string; statusText?: string; instagramUrl?: string | null; linkedinUrl?: string | null; decorative?: boolean }` — rendert NUR den Inhalt der Oberseite (Dial, Readout, Nav, Steuerung); der `.cam`-Körper wird vom Consumer drumherum gelegt.
  - `CameraNav` default export, Props `{ statusText: string; instagramUrl?: string | null; linkedinUrl?: string | null }`.
  - CSS-Klassen: `.camera-nav`, `.cam`, `.cam-shadow`, `.cam-dial`, `.cam-readout`, `.cam-nav`, `.cam-item`, `.cam-item.active`, `.cam-rec`, `.cam-ctrl`, `.cam-knob`, `.cam-social`, `.cam-shutter`, `.cam-lang`, `.cam-flash`.
- Consumes: bestehende `Link`/`usePathname` aus `@/i18n/navigation`, `LanguageToggle`, `MobileMenu`, `CosmoLogo`, Übersetzungen `nav.*` (`projects/about/contact/downloads`).

- [ ] **Step 0: Feature-Branch anlegen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git checkout -b feat/camera-navigation
```

- [ ] **Step 1: CameraBar anlegen** (`src/components/layout/CameraBar.tsx`)

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageToggle from "./LanguageToggle";

type NavKey = "projects" | "about" | "contact" | "downloads";
type NavHref = "/" | "/about" | "/contact" | "/downloads";

const NAV: { href: NavHref; key: NavKey }[] = [
  { href: "/", key: "projects" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
  { href: "/downloads", key: "downloads" },
];

function NavIcon({ k }: { k: NavKey }) {
  switch (k) {
    case "projects":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <circle cx="12" cy="12.5" r="3.4" />
          <path d="M8 6l1.5-2h5L16 6" />
        </svg>
      );
    case "about":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    case "contact":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "downloads":
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      );
  }
}

const InstagramIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const LinkedInIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="8" cy="9" r="1" fill="currentColor" stroke="none" />
    <rect x="7" y="11" width="2" height="6" fill="currentColor" stroke="none" />
    <path d="M12 17v-3a2 2 0 0 1 4 0v3" />
  </svg>
);

export default function CameraBar({
  activePath,
  statusText,
  instagramUrl,
  linkedinUrl,
  decorative = false,
}: {
  activePath: string;
  statusText?: string;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
  decorative?: boolean;
}) {
  const t = useTranslations("nav");
  const [flash, setFlash] = useState(false);

  function shutter() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 320);
  }

  return (
    <>
      {decorative ? (
        <span className="cam-dial">
          co<span style={{ fontSize: "8px" }}>.</span>
        </span>
      ) : (
        <Link href="/" aria-label="Startseite" className="cam-dial">
          co<span style={{ fontSize: "8px" }}>.</span>
        </Link>
      )}

      {statusText && <span className="cam-readout hidden lg:block">{statusText}</span>}

      <nav className="cam-nav">
        {NAV.map((item) => {
          const active = activePath === item.href;
          const inner = (
            <>
              <NavIcon k={item.key} />
              {t(item.key)}
              {active && <span className="cam-rec" />}
            </>
          );
          return decorative ? (
            <span key={item.key} className={`cam-item ${active ? "active" : ""}`}>
              {inner}
            </span>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`cam-item ${active ? "active" : ""}`}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="cam-ctrl">
        <span className="cam-knob" />
        <span className="cam-social">
          {decorative ? (
            <span className="cam-social-deco">{InstagramIcon}</span>
          ) : (
            <>
              {instagramUrl && (
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  {InstagramIcon}
                </a>
              )}
              {linkedinUrl && (
                <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  {LinkedInIcon}
                </a>
              )}
            </>
          )}
        </span>
        <span className="cam-knob" />
        {decorative ? (
          <span className="cam-shutter" />
        ) : (
          <button type="button" className="cam-shutter" aria-label="Nach oben scrollen" onClick={shutter} />
        )}
        {decorative ? (
          <span className="cam-lang font-mono text-[11px]">DE</span>
        ) : (
          <span className="cam-lang">
            <LanguageToggle />
          </span>
        )}
      </div>

      {!decorative && <span className={`cam-flash ${flash ? "on" : ""}`} aria-hidden="true" />}
    </>
  );
}
```

- [ ] **Step 2: CameraNav anlegen** (`src/components/layout/CameraNav.tsx`)

```tsx
"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import CameraBar from "./CameraBar";
import MobileMenu from "./MobileMenu";
import CosmoLogo from "./CosmoLogo";

export default function CameraNav({
  statusText,
  instagramUrl,
  linkedinUrl,
}: {
  statusText: string;
  instagramUrl?: string | null;
  linkedinUrl?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop: volle Kamera, mittig schwebend */}
      <div className="camera-nav hidden md:flex fixed top-0 inset-x-0 z-40 justify-center pt-2 pointer-events-none">
        <div className="cam pointer-events-auto">
          <span className="cam-shadow" />
          <CameraBar
            activePath={pathname}
            statusText={statusText}
            instagramUrl={instagramUrl}
            linkedinUrl={linkedinUrl}
          />
        </div>
      </div>

      {/* Mobil: kompakte Leiste + Auslöser öffnet Fullscreen-Menü */}
      <div className="camera-nav md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-[#141416]">
        <Link
          href="/"
          aria-label="Startseite"
          className="cam-dial !w-9 !h-9 text-[13px]"
        >
          co<span style={{ fontSize: "7px" }}>.</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
          aria-expanded={open}
          className="cam-shutter"
        />
      </div>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
```

- [ ] **Step 3: Kamera-CSS anfügen** (ans Ende von `src/app/globals.css`)

```css
/* ============ Camera Navigation ============ */
.camera-nav { transition: opacity 0.4s ease; }
html.intro-active .camera-nav { opacity: 0; pointer-events: none; }

.cam {
  position: relative;
  width: min(92vw, 1000px);
  height: 88px;
  border-radius: 26px 26px 22px 22px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px 0 12px;
  background: linear-gradient(#2c2d2f, #1a1b1d 55%, #0e0f10);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -3px 8px rgba(0, 0, 0, 0.6), 0 18px 40px -12px rgba(0, 0, 0, 0.45);
}
.cam::before {
  content: "";
  position: absolute;
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  width: 116px;
  height: 20px;
  border-radius: 7px 7px 4px 4px;
  background: linear-gradient(#34353a, #1a1b1d);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
.cam-shadow {
  position: absolute;
  inset: auto 5% -14px 5%;
  height: 26px;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.22), transparent 70%);
  filter: blur(3px);
  z-index: -1;
}

.cam-dial {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f0ede8;
  font-style: italic;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  background: radial-gradient(circle at 38% 32%, #353638, #131415 78%);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.14), 0 2px 5px rgba(0, 0, 0, 0.5);
}
.cam-dial::after {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, rgba(255, 255, 255, 0.1) 0 3deg, rgba(0, 0, 0, 0.18) 3deg 6deg);
  -webkit-mask: radial-gradient(circle, transparent 60%, #000 61%);
  mask: radial-gradient(circle, transparent 60%, #000 61%);
  z-index: -1;
}

.cam-readout {
  font-family: var(--font-mono), monospace;
  font-size: 10px;
  letter-spacing: 0.04em;
  color: #8a8884;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cam-nav { display: flex; align-items: center; gap: 26px; padding: 0 14px; flex: 1; justify-content: center; }
.cam-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: #cfcdc8;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;
  text-decoration: none;
  transition: color 0.25s;
  position: relative;
}
.cam-item:hover { color: #fff; }
.cam-item.active { color: #fff; }
.cam-item svg { width: 19px; height: 19px; }
.cam-rec {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e0a23a;
  box-shadow: 0 0 7px #e0a23a;
  animation: cam-rec-pulse 2s ease-in-out infinite;
}

.cam-ctrl { display: flex; align-items: center; gap: 13px; flex: 0 0 auto; padding-left: 4px; }
.cam-knob {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: repeating-conic-gradient(from 0deg, #2a2a2a 0 5deg, #4a4a4a 5deg 10deg);
  border: 2px solid #1c1c1c;
  transition: transform 0.4s ease;
}
.cam-knob:hover { transform: rotate(28deg); }
.cam-social { display: flex; gap: 9px; align-items: center; }
.cam-social a, .cam-social-deco { color: #cfcdc8; transition: color 0.2s; display: inline-flex; }
.cam-social a:hover { color: #fff; }
.cam-social svg { width: 16px; height: 16px; display: block; }
.cam-shutter {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  position: relative;
  flex: 0 0 auto;
  padding: 0;
  cursor: pointer;
  background: radial-gradient(circle at 35% 30%, #6b6b6b, #1a1a1a 75%);
  border: 2px solid #d4a24a;
  transition: transform 0.1s ease;
}
.cam-shutter:hover { transform: scale(1.06); }
.cam-shutter:active { transform: scale(0.92); }
.cam-shutter::after {
  content: "";
  position: absolute;
  top: -3px;
  right: -3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #e23b2e;
  box-shadow: 0 0 7px #e23b2e;
}
.cam-lang { color: #8a8884; display: inline-flex; align-items: center; }

.cam-flash {
  position: fixed;
  inset: 0;
  background: #fff;
  opacity: 0;
  pointer-events: none;
  z-index: 60;
}
.cam-flash.on { animation: cam-flash 0.32s ease; }

@keyframes cam-rec-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes cam-flash { 0% { opacity: 0; } 18% { opacity: 0.6; } 100% { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .cam-rec { animation: none; }
  .cam-knob { transition: none; }
  .cam-flash.on { animation: none; }
}
```

- [ ] **Step 4: Locale-Layout umstellen** (`src/app/[locale]/layout.tsx`) — Datei komplett ersetzen:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import CameraNav from "@/components/layout/CameraNav";
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
  const [statusSetting, instagramUrl, linkedinUrl] = await Promise.all([
    getSetting(locale === "en" ? "status_text_en" : "status_text_de"),
    getSetting("instagram_url"),
    getSetting("linkedin_url"),
  ]);
  const statusText = statusSetting || t("statusFallback");

  return (
    <NextIntlClientProvider messages={messages}>
      <CameraNav statusText={statusText} instagramUrl={instagramUrl} linkedinUrl={linkedinUrl} />
      <main>{children}</main>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 5: HomeStage Top-Padding anpassen** (`src/components/home/HomeStage.tsx`)

Desktop-Block: `hidden md:flex h-dvh flex-col pt-[72px]` → `hidden md:flex h-dvh flex-col pt-[112px]`.
Mobil-Block: `md:hidden pt-[72px] px-4 pb-10 space-y-4` → `md:hidden pt-20 px-4 pb-10 space-y-4`.

Konkret die beiden betroffenen Zeilen ersetzen:

```tsx
      <div className="hidden md:flex h-dvh flex-col pt-[112px] overflow-hidden">
```

```tsx
      <div className="md:hidden pt-20 px-4 pb-10 space-y-4">
```

- [ ] **Step 6: Top-Padding der Unterseiten anpassen**

In jeder dieser Dateien das einleitende `pt-[100px]` durch `pt-20 md:pt-[112px]` ersetzen:
- `src/app/[locale]/about/page.tsx` (`<div className="pt-[100px] px-6 md:px-10 pb-20">` → `<div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-20">`)
- `src/app/[locale]/contact/page.tsx` (`<div className="pt-[100px] px-6 md:px-10 pb-20">` → `<div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-20">`)
- `src/app/[locale]/downloads/page.tsx` (`<div className="pt-[100px] px-6 md:px-10 pb-20">` → `<div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-20">`)
- `src/app/[locale]/projects/[slug]/page.tsx` (`<div className="pt-[100px] px-6 md:px-10 pb-16">` → `<div className="pt-20 md:pt-[112px] px-6 md:px-10 pb-16">`)

- [ ] **Step 7: Alten Header löschen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git rm src/components/layout/Header.tsx
```

Prüfen, dass nichts mehr darauf verweist:

Run: `grep -rn "layout/Header\|from \"./Header\"\|components/layout/Header" src/`
Expected: keine Treffer.

- [ ] **Step 8: Verifizieren**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
rm -rf .next && npx tsc --noEmit && npm run build
```
Expected: Build grün.

Dev-Smoke (`PORT=3100 npm run dev` im Hintergrund, danach beenden):
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/de` → 200
- `curl -s http://localhost:3100/de | grep -o "cam-dial\|cam-nav" | head -2` → enthält `cam-dial`/`cam-nav`
- Visuell (Browser): Kamera-Menü auf `/de`, `/de/about`, `/de/contact`, `/de/downloads` sichtbar; aktiver Eintrag trägt Amber-Punkt; Sprachumschalter DE/EN funktioniert; Auslöser scrollt nach oben + Weiß-Blitz; schmales Fenster → kompakte Leiste + Auslöser öffnet Fullscreen-Menü.

- [ ] **Step 9: Commit**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git status --short
git add -A
git commit -m "feat(nav): camera-shaped navigation bar replaces minimal header

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 3D-Intro (CameraIntro) ersetzt IntroOverlay

**Files:**
- Create: `src/components/home/CameraIntro.tsx`
- Modify: `src/app/globals.css` (Abschnitt „Camera Intro" anfügen; alte `.intro-*`-Regeln + Keyframes `intro-wipe`/`intro-char`/`intro-lift` entfernen)
- Modify: `src/components/home/HomeClient.tsx` (`IntroOverlay` → `CameraIntro`, `intro-active`-Klasse, statusText-Prop)
- Modify: `src/components/home/HomeStage.tsx` (`baseDelay`-Konstante)
- Modify: `src/app/[locale]/page.tsx` (statusText laden & an HomeClient geben)
- Delete: `src/components/home/IntroOverlay.tsx`

**Interfaces:**
- Consumes: `CameraBar` (aus Task 1, `decorative`-Modus), CSS-Klasse `html.intro-active .camera-nav` (aus Task 1).
- Produces:
  - `CameraIntro` default export, Props `{ statusText: string; onReveal: () => void; onDone: () => void }`. `onReveal` feuert beim Andocken (Menü darunter einblenden); `onDone` feuert nach dem Crossfade (Overlay unmounten).
  - CSS-Klassen: `.cam-scene`, `.cam-exit`, `.cam-backdrop`, `.cam-rig`, `.cam-face`, `.cam-front`, `.cam-back`, `.cam-top`, `.cam-bottom`, `.cam-left`, `.cam-right`, `.cam-lens`, `.cam-grip`, `.cam-vf`, `.cam-brand`, `.cam-skip`; Keyframes `cam-spin`, `cam-backdrop-out`.
  - `HomeClient` Props erweitert auf `{ projects: PanelProject[]; statusText: string }`.

- [ ] **Step 1: CameraIntro anlegen** (`src/components/home/CameraIntro.tsx`)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import CameraBar from "@/components/layout/CameraBar";

// Nach diesem Zeitpunkt läuft die Andock-Phase bereits — ein Skip würde rucklern.
const SKIP_CUTOFF_MS = 1500;

export default function CameraIntro({
  statusText,
  onReveal,
  onDone,
}: {
  statusText: string;
  onReveal: () => void;
  onDone: () => void;
}) {
  const [skip, setSkip] = useState(false);
  const [exiting, setExiting] = useState(false);
  const mountedAt = useRef(Date.now());

  const requestSkip = () => {
    if (Date.now() - mountedAt.current < SKIP_CUTOFF_MS) setSkip(true);
  };

  useEffect(() => {
    const revealMs = skip ? 400 : 1900; // Andock erreicht → Menü darunter einblenden
    const doneMs = skip ? 600 : 2350; // nach Crossfade → Overlay weg
    const r = setTimeout(() => {
      setExiting(true);
      onReveal();
    }, revealMs);
    const d = setTimeout(onDone, doneMs);
    const onKey = () => requestSkip();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(r);
      clearTimeout(d);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, onReveal, onDone]);

  return (
    <div
      className={`cam-scene ${skip ? "cam-skip" : ""} ${exiting ? "cam-exit" : ""}`}
      onClick={requestSkip}
      aria-hidden="true"
    >
      <div className="cam-backdrop" />
      <div className="cam-rig">
        <div className="cam-face cam-front">
          <div className="cam-vf" />
          <div className="cam-lens" />
          <div className="cam-grip" />
          <span className="cam-brand">
            cosmo<span style={{ fontSize: "10px" }}>.</span>
          </span>
        </div>
        <div className="cam-face cam-back" />
        <div className="cam-face cam-left" />
        <div className="cam-face cam-right" />
        <div className="cam-face cam-bottom" />
        <div className="cam-face cam-top">
          <div className="cam">
            <span className="cam-shadow" />
            <CameraBar activePath="/" statusText={statusText} decorative />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Intro-CSS anfügen** (ans Ende von `src/app/globals.css`)

```css
/* ============ Camera Intro (3D) ============ */
.cam-scene {
  position: fixed;
  inset: 0;
  z-index: 100;
  perspective: 1500px;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.45s ease;
}
.cam-scene.cam-exit { opacity: 0; }
.cam-backdrop {
  position: absolute;
  inset: 0;
  background: #0c0c0d;
  animation: cam-backdrop-out 0.7s ease 1s forwards;
}
.cam-rig {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1000px;
  height: 150px;
  transform-style: preserve-3d;
  transform: translate(-50%, -50%) rotateX(0deg);
  animation: cam-spin 1.9s cubic-bezier(0.6, 0.02, 0.2, 1) forwards;
  /* Andock-Versatz: an die Ruhelage der CameraNav anpassen (pt-2 + halbe Barhöhe). */
  --dock-y: calc(-50vh + 52px);
}
/* Auf schmalen Desktop-Breiten herunterskalieren, damit die 1000px passen. */
@media (max-width: 1040px) {
  .cam-rig { transform: translate(-50%, -50%) scale(calc((100vw - 32px) / 1000)) rotateX(0deg); }
}

.cam-face { position: absolute; }
.cam-front {
  width: 1000px;
  height: 150px;
  transform: translateZ(44px);
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(#2c2d2f, #161719 60%, #0e0f10);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -4px 10px rgba(0, 0, 0, 0.6);
}
.cam-back {
  width: 1000px;
  height: 150px;
  transform: rotateY(180deg) translateZ(44px);
  background: #0c0d0e;
  border-radius: 16px;
}
.cam-top { width: 1000px; height: 88px; transform: rotateX(90deg) translateZ(75px); }
.cam-bottom {
  width: 1000px;
  height: 88px;
  transform: rotateX(-90deg) translateZ(75px);
  background: #0a0a0b;
  border-radius: 16px;
}
.cam-left {
  width: 88px;
  height: 150px;
  transform: rotateY(-90deg) translateZ(500px);
  background: linear-gradient(#1c1d1f, #0c0d0e);
}
.cam-right {
  width: 88px;
  height: 150px;
  transform: rotateY(90deg) translateZ(500px);
  background: linear-gradient(#1c1d1f, #0c0d0e);
}

/* Frontdetails */
.cam-vf {
  position: absolute;
  left: 50%;
  top: 8px;
  transform: translateX(-50%);
  width: 130px;
  height: 18px;
  border-radius: 5px;
  background: #0c0d0e;
}
.cam-lens {
  position: absolute;
  left: 120px;
  top: 26px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #3a3b3d 0 38%, #18191b 39% 60%, #2a2b2d 61% 74%, #0d0e0f 75%);
  box-shadow: 0 0 0 3px #0a0a0b, inset 0 2px 6px rgba(0, 0, 0, 0.7);
}
.cam-lens::before {
  content: "";
  position: absolute;
  inset: 24px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 32%, #5b6b78, #10131a 70%);
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.9);
}
.cam-lens::after {
  content: "";
  position: absolute;
  left: 30px;
  top: 28px;
  width: 20px;
  height: 12px;
  border-radius: 50%;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.55), transparent);
  filter: blur(1px);
}
.cam-grip {
  position: absolute;
  right: 0;
  top: 0;
  width: 70px;
  height: 150px;
  border-radius: 0 16px 16px 0;
  background: repeating-linear-gradient(90deg, #202123 0 3px, #161719 3px 6px);
}
.cam-brand {
  position: absolute;
  left: 120px;
  top: 132px;
  color: #cfcdc8;
  font-style: italic;
  font-weight: 600;
  font-size: 15px;
}

.cam-skip .cam-rig,
.cam-skip .cam-backdrop {
  animation-delay: 0s !important;
  animation-duration: 0.4s !important;
}

@keyframes cam-spin {
  0% { transform: translate(-50%, -50%) rotateX(0deg); }
  25% { transform: translate(-50%, -50%) rotateX(0deg); }
  100% { transform: translate(-50%, var(--dock-y)) rotateX(-90deg); }
}
@keyframes cam-backdrop-out { to { opacity: 0; } }
```

Hinweis Skip auf schmalen Breiten: Die `@media (max-width:1040px)`-Regel überschreibt `transform` ohne Rotation/Dock. Das ist akzeptabel — auf diesen Breiten ist die Drehung statisch verkleinert; der Hauptfall (≥1041px) spielt voll. (Mobil < md läuft kein `cam-scene`, siehe HomeClient-`narrow`-Check in Step 3.)

- [ ] **Step 3: HomeClient umstellen** (`src/components/home/HomeClient.tsx`) — Datei komplett ersetzen:

```tsx
"use client";

import { useEffect, useState } from "react";
import CameraIntro from "./CameraIntro";
import HomeStage, { PanelProject } from "./HomeStage";

const KEY = "cosmo-intro-seen";

export default function HomeClient({
  projects,
  statusText,
}: {
  projects: PanelProject[];
  statusText: string;
}) {
  // introRan bleibt stabil (steuert HomeStage-Reveal-Delays); overlay steuert nur das Mounten.
  const [introRan, setIntroRan] = useState<boolean | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const seen = sessionStorage.getItem(KEY);
    const run = !seen && !reduced && !narrow;
    if (!seen) sessionStorage.setItem(KEY, "1");
    setIntroRan(run);
    setOverlay(run);
    if (run) document.documentElement.classList.add("intro-active");
    return () => document.documentElement.classList.remove("intro-active");
  }, []);

  function revealNav() {
    document.documentElement.classList.remove("intro-active");
  }

  function finishIntro() {
    document.documentElement.classList.remove("intro-active");
    setOverlay(false);
  }

  if (introRan === null) return <div className="h-dvh" aria-hidden="true" />;

  return (
    <>
      {overlay && (
        <CameraIntro statusText={statusText} onReveal={revealNav} onDone={finishIntro} />
      )}
      <HomeStage projects={projects} delayed={introRan} />
    </>
  );
}
```

- [ ] **Step 4: HomeStage Reveal-Timing anpassen** (`src/components/home/HomeStage.tsx`)

Die Zeile `const baseDelay = delayed ? 3.2 : 0.05;` ersetzen durch:

```tsx
  const baseDelay = delayed ? 1.9 : 0.05;
```

- [ ] **Step 5: Homepage statusText durchreichen** (`src/app/[locale]/page.tsx`) — Datei komplett ersetzen:

```tsx
import HomeClient from "@/components/home/HomeClient";
import { getProjectsWithCovers, getSetting } from "@/lib/db/queries";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function HomePage({
  params,
}: {
  params: { locale: string };
}) {
  const { locale } = await Promise.resolve(params);
  const t = await getTranslations("home");
  const [projectsRaw, statusSetting] = await Promise.all([
    getProjectsWithCovers(),
    getSetting(locale === "en" ? "status_text_en" : "status_text_de"),
  ]);
  const projects = projectsRaw.slice(0, 6).map((p) => ({
    id: p.id,
    slug: p.slug,
    titleDe: p.titleDe,
    titleEn: p.titleEn,
    category: p.category,
    year: p.year,
    coverId: p.coverId,
  }));
  const statusText = statusSetting || t("statusFallback");

  return <HomeClient projects={projects} statusText={statusText} />;
}
```

- [ ] **Step 6: Alte Intro-CSS entfernen** (`src/app/globals.css`)

Den kompletten Block von `/* ---------- Intro-Overlay ---------- */` bis einschließlich `@keyframes intro-lift { ... }` löschen (Zeilen mit `.intro-overlay`, `.intro-letters`, `.intro-swoosh`, `.intro-photos span`, `.intro-skip`, `@keyframes intro-wipe`, `@keyframes intro-char`, `@keyframes intro-lift`). Die Abschnitte `Homepage-Panels`, `Camera Navigation` und `Camera Intro` bleiben erhalten.

- [ ] **Step 7: IntroOverlay löschen**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git rm src/components/home/IntroOverlay.tsx
```

Prüfen:

Run: `grep -rn "IntroOverlay\|intro-overlay\|intro-letters\|intro-swoosh\|intro-photos" src/`
Expected: keine Treffer.

- [ ] **Step 8: Verifizieren**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
rm -rf .next && npx tsc --noEmit && npm run build
```
Expected: Build grün.

Dev-Visuell (`PORT=3100 npm run dev`, Desktop-Breite ≥ 1041px, frischer Tab / Inkognito):
1. `/de` erster Besuch: dunkler Screen → Kamera frontal (Objektiv) → dreht sich → Oberseite dockt oben an, helle Galerie erscheint → echtes Kamera-Menü übernimmt. **Kein sichtbarer Doppel-Kamera-Moment, kein harter Sprung.**
2. Reload: kein Intro, Menü sofort da.
3. Klick/Taste während Drehung (< 1,7 s): bricht zügig ab.
4. `prefers-reduced-motion` aktiv (DevTools-Emulation): kein Intro, Menü sofort.
5. Schmales Fenster (< 768px): kein 3D-Intro, kompakte Leiste sofort.

**Andock-Kalibrierung:** Falls der Endframe der Drehung vertikal nicht exakt auf der Ruhelage des Menüs sitzt, ausschließlich den Wert `--dock-y` in `.cam-rig` justieren (Richtwert `calc(-50vh + 52px)`; pro 1px Versatz um 1px ändern). Der 0,45-s-Crossfade (`cam-scene-out` + `.camera-nav`-Opacity) verzeiht kleine Abweichungen.

- [ ] **Step 9: Commit**

```bash
cd "/Volumes/SSD FELIX 3/CODING/Cosmo Portfolio Website"
git status --short
git add -A
git commit -m "feat(intro): 3D camera intro rotates into the navigation bar

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Hinweise für die Ausführung

- **Reihenfolge zwingend:** Task 1 vor Task 2 (CameraIntro importiert `CameraBar` und nutzt `html.intro-active .camera-nav` aus Task 1).
- **Kein Datenmodell/keine Migration** — rein Frontend. Backend/Routing/i18n unverändert.
- **Bewusste Abweichung von der Spec (mobil):** Die Spec skizzierte mobil eine „vereinfachte kürzere Kippung". Aus Performance-/Risikogründen läuft auf < 768px **gar kein** 3D-Intro — das Kamera-Menü erscheint direkt (HomeClient-`narrow`-Check). Desktop bekommt den vollen Effekt; das war die priorisierte Wirkung.
- **Abschluss:** Nach Task 2 `superpowers:finishing-a-development-branch` für Merge-Entscheidung. Vor Push kein DB-Schritt nötig.
