# Cosmo Photos — Redesign „Index-Portfolio" (Design-Spec)

**Datum:** 2026-06-11
**Status:** Vom Nutzer abgenommenes Design (Brainstorming mit Visual Companion, Mockups in `.superpowers/brainstorm/27934-1781180851/content/`)
**Referenz:** https://carlosprado.dev

## Zusammenfassung

Das Frontend der Cosmo-Photos-Website wird komplett neu gebaut — als radikal minimalistisches, typografisches „Index-Portfolio" nach dem Vorbild von carlosprado.dev. Die Startseite zeigt Projekte/Shootings als vertikale Titelbild-Panels nebeneinander mit subtilen Hover-Animationen. Beim ersten Besuch läuft eine cineastische Logo-Intro mit dem neuen Cosmo-Logo (Wipe-Reveal + Vorhang-Effekt).

**Bleibt erhalten (funktional unverändert):** Admin-Panel, Google-Drive-Anbindung, Kundenbereich (Alben + Codes + ZIP-Download), Kontakt-API (Resend), Auth, i18n (DE/EN), Deployment auf Render.

**Neu:** `projects`-Datenmodell + Admin-Verwaltung, komplett neues Design-System, alle öffentlichen Seiten neu.

**Entfällt:** bisheriges Frontend (Hero mit Logo-Block, Masonry-Portfolio auf der Startseite, Bebas-Neue-Design), flache Bilderverwaltung ohne Projektbezug, „Liste/Galerie"-Umschalter (bewusst gegen Referenz entschieden — nur Galerie-Ansicht).

---

## Design-System

### Farben (Tailwind-Tokens)

| Token      | Wert      | Verwendung                              |
|------------|-----------|------------------------------------------|
| `bg`       | `#F4F4F2` | Seitenhintergrund (warmes Hellgrau)      |
| `ink`      | `#111111` | Text, aktive Nav, Buttons                |
| `gray`     | `#9A9A96` | Inaktive Nav, Labels, Metadaten          |
| `hairline` | `#E2E2DF` | Trennlinien, Input-Borders               |
| `white`    | `#FFFFFF` | Text auf Bildern                         |

Monochrom — Farbe kommt ausschließlich aus den Fotos.

### Typografie

| Rolle                  | Font              | Details                                        |
|------------------------|-------------------|------------------------------------------------|
| UI, Headlines, Text    | Instrument Sans   | 400/500/600 + Italic; Headlines mit `tracking -0.02…-0.045em` |
| Nummern, Jahre, Meta, Code | IBM Plex Mono | 400/500; 11–14px                               |

Laden über `next/font/google` (Subsetting + self-hosting automatisch). Die bisherigen woff2-Dateien und `@font-face`-Deklarationen entfallen.

### Logo

Neues Logo aus `logo neu.svg` (vom Nutzer geliefert). Umsetzung als React-Komponente `CosmoLogo`:

- Zwei SVG-Gruppen: `letters` (COSMO-Pfade) und `swoosh` (Swoosh-Pfad), viewBox auf `0 0 222.94 68` beschnitten (ohne Subline).
- Der „PHOTOS"-Schriftzug des Original-SVG nutzt die nicht verfügbare Font „Industry" → wird **nicht** als SVG-`<text>` übernommen, sondern als gesperrte HTML-Buchstaben (`P H O T O S`, Instrument Sans 500, hoher Letter-Spacing) unterhalb des SVG gerendert (nur in der Intro; im Header nur Wortmarke + Swoosh).
- Original-SVG wird unter `public/logo.svg` ins Repo gelegt (Referenz/Favicon-Quelle).

### Animationsprinzipien

- Easing: `cubic-bezier(.16,1,.3,1)` (expo-out) für Bewegungen, 0.3–1.1 s.
- Framer Motion (bereits installiert) für React-Animationen, CSS-Transitions für Hover.
- `prefers-reduced-motion`: Intro wird übersprungen, Hover-Effekte auf Opacity reduziert.
- Micro-Interactions subtil halten: nichts blockiert Klicks, nichts loopt auffällig.

---

## Seiten

### 1. Intro-Animation (Overlay über der Startseite)

Ablauf (~3,4 s, Zeiten relativ zum Mount):

1. `0.3s` — COSMO-Buchstaben: Clip-Path-Wipe von links (`inset(0 100% 0 0)` → `0`), 1,1 s
2. `1.15s` — Swoosh: gleicher Wipe, 0,9 s
3. `1.7s` — „PHOTOS": 6 Buchstaben gestaffelt (je +0,08 s) von unten einfaden
4. `2.9s` — Vorhang: gesamtes Overlay hebt sich nach oben (`translateY(-101%)`, 1 s), darunter faden Header/Panels/Bottom-Bar gestaffelt ein

Regeln:

- Läuft nur beim ersten Besuch der Session (`sessionStorage`-Flag), sonst startet die Seite direkt.
- Klick aufs Overlay überspringt die Intro (Spring zur Endposition).
- Bei `prefers-reduced-motion` entfällt sie komplett.

### 2. Startseite `/[locale]`

**Header** (auf allen Seiten identisch):
- Links: `CosmoLogo` (klein, ~92px breit)
- Mitte-links: Status-Zeile aus Settings (`status_text_de` / `status_text_en`, z. B. „Verfügbar für Buchungen — Saison 2026")
- Rechts: Nav „Projekte · Über mich · Kontakt · Kundenbereich" (inaktiv `gray`, aktiv/hover `ink`) + `DE/EN` (Mono)
- Mobil: Hamburger → Fullscreen-Menü (große Typo, gestaffeltes Einfaden)

**Panel-Galerie** (Herzstück, Desktop):
- Sichtbare Projekte als vertikale Panels nebeneinander (flex, `gap 14px`), füllen die Höhe zwischen Header und Bottom-Bar (Seite scrollt nicht).
- Hover: Panel weitet sich (`flex 1 → 1.75`, 0,65 s expo-out); Bild zoomt auf 1.06 und von `saturate(.82)` auf voll; Nicht-gehoverte dimmen (`saturate(.55) brightness(.94)`); Titel + `Nr / Kategorie` (Mono) faden von unten ein, dunkler Verlauf unten fürs Kontrast.
- Zusätzlich (sehr subtil): Maus-Parallax im Bild (~1–2 %) und langsamer Idle-Drift wenn keine Maus bewegt wird.
- Klick → Projektseite.
- Die Startseite zeigt maximal 6 Panels (die ersten 6 sichtbaren Projekte nach `sortOrder`); weitere Projekte sind über die Projektseiten-Navigation (vorheriges/nächstes, zyklisch über alle sichtbaren) erreichbar.

**Bottom-Bar:**
- Links: „**Cosmo Photos**“ + darunter „Fotograf — Sport · Hochzeiten · Events"
- Mitte: Fortschritts-Striche (einer pro Panel), aktiver = `ink`, synchron zum Hover
- Rechts: Titel des aktiven Projekts groß (40px, Cross-Fade beim Wechsel)

**Mobil:** Panels als vertikal gestapelte Vollbreiten-Cover (4:5) mit permanent sichtbarem Titel/Nummer unten im Bild; Bottom-Bar entfällt, Identitätszeile steht unter der Liste.

### 3. Projektseite `/[locale]/projekte/[slug]` (EN: `/en/projects/[slug]`)

- Kopf: Mono-Zeile `Nr / Kategorie`, darunter Titel (54px, eng), rechts Mono-Metadaten (Jahr, Ort optional, Bildanzahl)
- Aufmacher: Cover-Bild volle Breite
- Galerie: Raster aus den Projektbildern (Desktop 3 Spalten, Tablet 2, Mobil 1; `gap 14px`), Lazy Loading, Einfaden beim Scrollen
- Klick auf Bild → Lightbox (bestehende Funktionalität: Pfeiltasten, ESC, Zähler; Optik neu: Hintergrund `#111`/95 %, Mono-Zähler, dezente Pfeile)
- Fußzeile: `← Vorheriges` / `Nächstes Projekt: … →` (zyklisch über sichtbare Projekte)

### 4. Über mich `/[locale]/about`

- Statement-Headline (38px, max. ~12 Wörter, aus Settings `about_headline_de/en`)
- Darunter: großes Foto links (Settings `about_image_id`, im Admin aus Drive-Bildern wählbar), rechts schmale Textspalte: Label „Über mich" + Bio (Settings, wie bisher) + Label „Kunden & Referenzen" + Logo-Reihe (bestehende `client_logos`, Grau-auf-Hover-Farbe entfällt → einheitlich ~50 % Opacity, Hover 100 %)

### 5. Kontakt `/[locale]/contact`

- Links: Headline „Lass uns über dein Projekt reden." (44px) + E-Mail-Link (Mono, unterstrichen) + Social-Links (Mono, „↗")
- Rechts: Formular mit Haarlinien-Inputs (Name, E-Mail, Betreff, Nachricht, optionaler Datei-Anhang wie bisher), Submit-Button `ink` auf `bg`
- API (`/api/contact`, Resend, Honeypot, Validierung) unverändert

### 6. Kundenbereich `/[locale]/downloads`

- Zentriert: Label „Privater Bereich", Headline „Dein Album. Dein Code.", Code-Input (Mono, gesperrt, Unterstrich-Stil) mit `→`-Submit, Hinweiszeile
- Nach Code-Eingabe: Album-Galerie im gleichen Raster wie Projektseite + „Alle herunterladen" (`ink`-Button)
- APIs (`/api/downloads/verify`, `/api/downloads/zip`, `/api/albums`) unverändert

### 7. Admin `/admin`

Funktional erhalten, plus:

- **Neue Seite „Projekte"** (`/admin/projects`): Projekt anlegen/bearbeiten (Titel DE/EN, Slug auto, Kategorie `sport|hochzeit|event`, Jahr, Ort optional, Drive-Ordner-ID, Sichtbarkeit, Reihenfolge), Button „Sync" (lädt Bilder des Drive-Ordners in `images` mit `projectId`), Cover-Auswahl aus den gesyncten Bildern, Löschen (entfernt Projekt + zugehörige `images`-Zeilen, nicht die Drive-Dateien)
- **Settings erweitert:** `status_text_de/en`, `about_headline_de/en`, `about_image_id`; `hero_image_id` entfällt
- **Bilderverwaltung (`/admin/images`) entfällt** aus der Navigation — Bilder werden ausschließlich über Projekte verwaltet. (Flache Alt-Bilder ohne `projectId` bleiben in der DB, werden aber nirgends mehr angezeigt.)
- Optik des Admin bleibt wie sie ist (kein Redesign-Aufwand im Backoffice).

---

## Datenmodell

Neu in `schema.ts`:

```
projects
├── id            TEXT PK (uuid)
├── slug          TEXT unique          — aus Titel DE generiert
├── titleDe       TEXT notNull
├── titleEn       TEXT
├── category      TEXT notNull         — 'sport' | 'hochzeit' | 'event'
├── year          INTEGER notNull
├── location      TEXT                 — optional, Anzeige in Metadaten
├── driveFolderId TEXT notNull
├── coverImageId  TEXT                 — FK → images.id
├── sortOrder     INTEGER default 0
├── visible       BOOLEAN default true
├── createdAt     TEXT
```

Erweiterung `images`: `projectId TEXT` (FK → projects.id, nullable; bestehende Zeilen bleiben null). Sync-Logik analog zum bestehenden Drive-Sync, aber pro Projekt-Ordner.

Migration per Drizzle (`drizzle-kit generate` + Ausführung beim Deploy wie bisher).

## Routing & i18n

- Routen: `/{de|en}` (Start), `/projekte/[slug]` bzw. `/projects/[slug]` (lokalisierte Pathnames via next-intl `pathnames`), `/about`, `/contact`, `/downloads`; Admin unverändert ohne Locale.
- Alle statischen Texte in `messages/de.json` / `en.json` (werden neu geschrieben).

## Technik

- Next.js 14 App Router, bestehende Struktur bleibt; öffentliche Komponenten unter `src/components/` werden ersetzt (alte Hero/Portfolio/Layout-Komponenten gelöscht).
- Bilder weiter über Proxy `/api/drive/image/[id]?w=…` (CDN-Cache-Header wie bisher); Panels laden `w=1200`, Grids `w=800`, Lightbox `w=1920`.
- Framer Motion für Intro/Seitenübergänge/Reveals; reine CSS-Transitions für Hover.
- Keine neuen Dependencies nötig.

## Fehlerfälle

- Keine sichtbaren Projekte → Startseite zeigt Status-Zeile + Bottom-Bar, Panel-Bereich mit dezentem Hinweis („Projekte folgen in Kürze").
- Projekt ohne Cover → erstes Bild des Projekts als Fallback; Projekt ohne Bilder wird auf der Startseite ausgeblendet.
- Ungültiger Slug → `notFound()`.

## Testing / Verifikation

- Build (`npm run build`) ohne Fehler; alle Routen DE+EN manuell geprüft (Skill `verify`).
- Intro: erster Besuch vs. Reload (sessionStorage), Klick-Skip, `prefers-reduced-motion`.
- Panels: Hover-Verhalten, Tastatur-Fokus (Panels sind Links), Mobil-Fallback.
- Admin: Projekt anlegen → Sync → Cover wählen → erscheint auf Startseite; Kundenbereich-Flow mit echtem Code.

## Out of Scope

- Admin-Redesign, Blog, Preisseite, CMS, Zahlungen, Mehrsprachigkeit über DE/EN hinaus, Migration der Alt-Bilder in Projekte.
