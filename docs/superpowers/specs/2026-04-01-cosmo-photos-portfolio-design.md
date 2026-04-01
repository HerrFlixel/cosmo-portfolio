# Cosmo Photos — Portfolio Website Design Spec

## Zusammenfassung

Portfolio-Website für **Cosmo Photos**, ein Sportfotografie-Unternehmen. Zielgruppe: Sportvereine/Teams und Agenturen/Medien (B2B). Die Website zeigt ~30 kuratierte Bilder in einem Portfolio, bietet Kontaktmöglichkeiten, einen passwortgeschützten Download-Bereich für Kunden und ein Admin-Panel zur Inhaltsverwaltung. Bilder werden über Google Drive verwaltet.

**Sprache:** Deutsch (Standard), Englisch (umschaltbar)
**Visueller Stil:** High Contrast Editorial — monochrom, Magazin-Ästhetik
**Deployment:** GitHub → Render.com (Web Service)

---

## Tech Stack

| Komponente       | Technologie                              |
|------------------|------------------------------------------|
| Framework        | Next.js 14 (App Router), TypeScript      |
| Styling          | Tailwind CSS + CSS Variables             |
| Datenbank        | SQLite via Turso (Edge DB) + Drizzle ORM |
| Auth             | NextAuth.js (Credentials Provider)       |
| Bilder           | Google Drive API + Next.js Image         |
| i18n             | next-intl                                |
| E-Mail           | Resend API                               |
| Deployment       | Render.com (Node.js Web Service)         |

---

## Projektstruktur

```
src/
├── app/
│   ├── [locale]/              # i18n Routing (de/en)
│   │   ├── page.tsx           # Homepage (Hero + Portfolio Grid)
│   │   ├── about/page.tsx     # Über mich + Referenzen
│   │   ├── contact/page.tsx   # Kontaktformular
│   │   └── downloads/page.tsx # Kundenbereich (passwortgeschützt)
│   ├── admin/                 # Admin-Panel (auth-geschützt)
│   │   ├── page.tsx           # Dashboard
│   │   ├── images/page.tsx    # Bilderverwaltung
│   │   ├── downloads/page.tsx # Download-Codes verwalten
│   │   └── settings/page.tsx  # Inhalte bearbeiten
│   └── api/
│       ├── drive/             # Google Drive Sync Endpoints
│       ├── contact/           # Kontaktformular Handler
│       ├── downloads/         # Download-Bereich API
│       └── auth/              # NextAuth Endpoints
├── components/
│   ├── ui/                    # Basis-Komponenten (Button, Input, etc.)
│   ├── layout/                # Header, Footer, Navigation
│   ├── portfolio/             # Grid, Lightbox, ImageCard
│   ├── admin/                 # Admin-spezifische Komponenten
│   └── shared/                # LanguageToggle, SocialLinks, etc.
├── lib/
│   ├── db/                    # Drizzle Schema + Queries
│   ├── drive.ts               # Google Drive Client
│   ├── email.ts               # Resend Client
│   └── auth.ts                # Auth Config
└── messages/
    ├── de.json                # Deutsche Übersetzungen
    └── en.json                # Englische Übersetzungen
```

---

## Seiten & Features

### 1. Homepage / Portfolio (`/[locale]`)

**Hero-Bereich:**
- Vollbild-Foto als Hintergrund (eines der besten Sportfotos)
- Logo-Overlay zentriert
- Tagline darunter (z.B. "Sportfotografie auf höchstem Niveau")
- CTA-Button "Portfolio ansehen" scrollt zum Grid
- Dezenter Scroll-Indikator (Pfeil/Linie nach unten)

**Portfolio-Grid:**
- Masonry/Column-Layout, ~30 Bilder
- Bilder faden beim Scrollen ein (staggered reveal, Intersection Observer)
- Hover-Effekt: leichter Zoom + dunkles Overlay mit Titel
- Klick öffnet Lightbox (Fullscreen, Navigation links/rechts, Schließen mit X/ESC)
- Bilder werden aus Google Drive geladen, über Next.js Image optimiert und gecached

**Social Media Teaser:**
- Am Ende der Seite: Instagram-Bereich mit Link zum Profil
- Optional: letzte Posts als Bild-Grid (via Instagram Basic Display API oder manuell gepflegt)

### 2. Über mich (`/[locale]/about`)

- Foto von Felix/Team (linke Seite) + Bio-Text (rechte Seite), asymmetrisches Layout
- Optional: Statistiken-Leiste ("500+ Events", "50+ Kunden", etc.)
- **Kunden-Referenzen:** Logo-Leiste mit Vereins-/Medien-Logos (horizontal scrollbar oder Grid)
- Logos werden über Admin-Panel verwaltet (Upload + Reihenfolge)

### 3. Kontakt (`/[locale]/contact`)

**Formular-Felder:**
- Name (Pflicht)
- E-Mail (Pflicht, validiert)
- Betreff (Pflicht)
- Nachricht (Pflicht, Textarea)
- Datei-Upload (optional, max. 5MB — wird als Attachment an die E-Mail angehängt)

**Verhalten:**
- Client-seitige Validierung
- Server-seitige Validierung + Rate Limiting
- Honeypot-Feld gegen Spam (kein Captcha nötig für B2B)
- E-Mail wird via Resend an hinterlegte Adresse gesendet
- Erfolgs-/Fehlermeldung inline angezeigt

**Sidebar/Nebenbereich:**
- Social Media Links (Instagram, etc.)
- Direkter E-Mail-Link als Alternative
- Optional: Standort/Region

### 4. Download-Bereich (`/[locale]/downloads`)

**Flow:**
1. Kunde besucht `/downloads`
2. Eingabefeld für Download-Code
3. Code wird gegen DB geprüft (API Route)
4. Bei gültigem Code: Galerie der zugewiesenen Bilder wird angezeigt
5. "Alle herunterladen"-Button → ZIP-Download der Bilder
6. Einzelne Bilder auch einzeln downloadbar

**Admin-Seite erstellt Codes:**
- Code generieren (zufällig oder manuell)
- Bilder aus dem Portfolio dem Code zuweisen
- Ablaufdatum optional setzbar
- Code aktivieren/deaktivieren

**Sicherheit:**
- Rate Limiting auf Code-Eingabe (Brute-Force-Schutz)
- Codes sind ausreichend lang (8+ Zeichen)
- Abgelaufene Codes werden automatisch ungültig

### 5. Admin-Panel (`/admin`)

**Zugang:** Login mit Benutzername + Passwort (NextAuth.js, Credentials Provider). Nur ein Admin-User (konfigurierbar via Umgebungsvariablen).

**Bilderverwaltung (`/admin/images`):**
- "Google Drive syncen"-Button: lädt neue Bilder aus konfiguriertem Drive-Ordner
- Liste aller Bilder mit Thumbnail-Vorschau
- Pro Bild: Titel setzen, Tags setzen, Sichtbarkeit ein/aus, Reihenfolge per Drag & Drop
- Bilder aus dem Portfolio entfernen (nicht aus Drive)

**Downloads (`/admin/downloads`):**
- Neue Download-Codes erstellen
- Bilder per Checkbox einem Code zuweisen
- Code-Details: Code, Erstellt am, Ablaufdatum, Status (aktiv/inaktiv), Anzahl Downloads
- Codes bearbeiten/deaktivieren

**Einstellungen (`/admin/settings`):**
- Bio-Text bearbeiten (DE + EN)
- Kontakt-E-Mail ändern
- Social Media Links pflegen
- Hero-Bild auswählen
- Kunden-Logos verwalten (Upload, Reihenfolge, Löschen)

### 6. Sprachumschaltung

- Toggle-Button im Header: "DE | EN"
- URL-Pfad basiert: `/de/about` ↔ `/en/about`
- Default: Deutsch
- next-intl Middleware erkennt Browser-Sprache und redirected beim Erstbesuch
- Alle statischen Texte in `messages/de.json` und `messages/en.json`
- Bild-Titel: optional übersetzbar (Feld im Admin für DE + EN Titel)

### 7. Social Media Integration

- **Footer:** Icons + Links zu Instagram, Facebook, LinkedIn, etc.
- **Kontaktseite:** Social Links neben dem Formular
- **Homepage:** Instagram-Teaser am Seitenende (manuell gepflegt via Admin, kein API — Instagram Basic Display API ist eingestellt)
- Links werden über Admin-Panel gepflegt

---

## Visueller Stil: High Contrast Editorial

### Farbsystem

```css
:root {
  --color-bg:        #FFFFFF;
  --color-surface:   #F5F5F5;
  --color-primary:   #1D1D1B;
  --color-secondary: #555555;
  --color-muted:     #999999;
  --color-border:    #E0E0E0;
  --color-accent:    #1D1D1B;
  --color-accent-hover: #333333;
}
```

Monochrom — die Fotos liefern die Farbe. Website bleibt neutral.

### Typografie

| Rolle     | Font           | Stil                                    |
|-----------|----------------|-----------------------------------------|
| Headlines | Bebas Neue     | Condensed, uppercase, großer Schriftgrad |
| Body      | IBM Plex Sans  | Regular 16px, sauber, technisch          |
| Labels    | IBM Plex Sans  | Uppercase, letter-spacing: 0.2em         |
| Nav       | IBM Plex Sans  | Uppercase, letter-spacing: 0.15em, 14px  |

### Layout-Prinzipien

- **Großzügiger Weißraum** — Bilder atmen lassen, nichts beengt
- **Starke horizontale Linien** — dicke schwarze Trennlinien als grafisches Element (angelehnt an den Logo-Swoosh)
- **Asymmetrie** — Text/Bild nicht immer zentriert, Versatz erzeugt Spannung
- **Große Bilder** — Hero fullscreen, Portfolio-Kacheln großzügig
- **Editorial-Grid** — Abwechselnd große und kleine Bilder, wie ein Magazin-Spread

### Animationen

| Element         | Animation                                          |
|-----------------|---------------------------------------------------|
| Page Load       | Staggered fade-in top→bottom (animation-delay)     |
| Scroll          | Bilder faden/sliden ins Viewport (IntersectionObserver) |
| Bild-Hover      | Scale 1.03 + dunkles Overlay mit Titel              |
| Lightbox        | Smooth open/close mit backdrop-blur                 |
| Seitenwechsel   | CSS transitions zwischen Routen                     |
| Navigation      | Underline-Animation bei Hover                       |

Umsetzung: Framer Motion für React-Animationen, CSS Transitions wo möglich.

### Responsive Breakpoints

| Breakpoint | Layout                                    |
|------------|-------------------------------------------|
| Desktop    | Multi-Column Grid (3-4 Spalten), volle Navigation |
| Tablet     | 2 Spalten, kompaktere Abstände             |
| Mobile     | Single Column, Hamburger-Menü, Touch-Lightbox |

---

## Google Drive Integration

### Setup
- Google Cloud Project mit Drive API aktiviert
- Service Account mit Lese-Zugriff auf einen geteilten Ordner
- Ordner-ID wird als Umgebungsvariable konfiguriert

### Sync-Flow
1. Admin klickt "Sync" im Admin-Panel
2. API Route `/api/drive/sync` wird aufgerufen
3. Drive API listet alle Bilder im konfigurierten Ordner
4. Neue Bilder werden in die DB eingetragen (Metadaten: Drive-ID, Dateiname, Thumbnail-URL)
5. Bilder werden über eine Proxy-Route (`/api/drive/image/[id]`) ausgeliefert und gecached
6. Next.js Image optimiert automatisch (Formate, Größen)

### Caching
- Bilder werden beim ersten Abruf lokal gecached (auf Render: im Dateisystem oder via CDN-Header)
- Cache-Invalidierung bei neuem Sync
- Thumbnail-Varianten werden beim ersten Zugriff generiert

---

## Datenbank-Schema (Drizzle ORM)

```
images
├── id            (TEXT, PK)
├── driveFileId   (TEXT, unique)
├── title_de      (TEXT, nullable)
├── title_en      (TEXT, nullable)
├── tags          (TEXT, nullable — comma-separated)
├── sortOrder     (INTEGER)
├── visible       (BOOLEAN, default true)
├── width         (INTEGER)
├── height        (INTEGER)
├── createdAt     (TIMESTAMP)
├── updatedAt     (TIMESTAMP)

download_codes
├── id            (TEXT, PK)
├── code          (TEXT, unique)
├── label         (TEXT — z.B. "DFB Pokal 2025")
├── expiresAt     (TIMESTAMP, nullable)
├── active        (BOOLEAN, default true)
├── downloadCount (INTEGER, default 0)
├── createdAt     (TIMESTAMP)

download_code_images
├── codeId        (TEXT, FK → download_codes.id)
├── imageId       (TEXT, FK → images.id)

client_logos
├── id            (TEXT, PK)
├── name          (TEXT)
├── imageUrl      (TEXT)
├── sortOrder     (INTEGER)
├── createdAt     (TIMESTAMP)

settings
├── key           (TEXT, PK)
├── value         (TEXT)
```

---

## Deployment auf Render.com

### Konfiguration
- **Service-Typ:** Web Service (Node.js)
- **Build Command:** `npm run build`
- **Start Command:** `npm start`
- **Node Version:** 20
- **Auto-Deploy:** Bei Push auf `main` Branch

### Umgebungsvariablen
```
DATABASE_URL          — Turso DB URL
DATABASE_AUTH_TOKEN   — Turso Auth Token
GOOGLE_DRIVE_FOLDER_ID — Google Drive Ordner ID
GOOGLE_SERVICE_ACCOUNT_KEY — Service Account JSON (base64)
NEXTAUTH_SECRET       — Session-Secret
NEXTAUTH_URL          — https://cosmophotos.de (oder Render-URL)
ADMIN_USERNAME        — Admin Login
ADMIN_PASSWORD_HASH   — bcrypt Hash des Passworts
RESEND_API_KEY        — Resend API Key
CONTACT_EMAIL         — Ziel-E-Mail für Kontaktformular
```

### Render.com Projekt-Setup
- Git Repository verbinden (GitHub)
- Web Service erstellen
- Umgebungsvariablen setzen
- Custom Domain optional konfigurieren

---

## Sicherheit

- **Admin:** Passwort-Hash (bcrypt), Session-basierte Auth via NextAuth
- **Download-Codes:** Rate Limiting (max. 5 Versuche/Minute), ausreichende Länge
- **Kontaktformular:** Rate Limiting, Honeypot, Server-seitige Validierung
- **Google Drive:** Service Account hat nur Lese-Zugriff
- **CSRF:** Next.js built-in Protection
- **Headers:** Strict CSP, X-Frame-Options, etc. via next.config.js

---

## Out of Scope (bewusst ausgelassen)

- Blog/News-Bereich
- Preise/Pakete-Seite
- Multi-User Admin (nur ein Admin)
- Zahlungssystem
- CMS-Integration (Contentful, Strapi etc.)
- E-Commerce / Print-on-Demand
