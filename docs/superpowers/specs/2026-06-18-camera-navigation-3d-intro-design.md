# Cosmo Photos — Kamera-Navigation + 3D-Intro (Design-Spec)

**Datum:** 2026-06-18
**Status:** Vom Nutzer abgenommen (Brainstorming mit Visual Companion; Mockups in `.superpowers/brainstorm/29418-1781764444/content/`)
**Referenz:** Nutzer-Mockup (Kamera-Oberseite als Menü, „dp."-Stil) + Variante A aus `camera-directions.html` + Bewegungsstudie `camera-3d-intro.html`

## Zusammenfassung

Die bisherige minimalistische Kopfzeile (`Header.tsx`) und das Logo-Wisch-Intro (`IntroOverlay.tsx`) werden ersetzt durch:

1. **Kamera-Navigation** — eine dunkle, fotografische Kamera-Leiste (CSS + SVG, illustrativ-edel, kein Bild) als „Gerät", das mittig oben auf der hellen Galerie-Seite aufliegt. Auf allen öffentlichen Seiten.
2. **3D-Intro** — beim ersten Startseiten-Besuch dreht sich die Kamera aus der Frontansicht (~2,5 s) und dockt passgenau als die Kamera-Navigation oben an, während die helle Seite darunter erscheint.

Bewusster, gewählter Stilbruch: dunkles Kamera-Objekt auf hellem Grund (`#F4F4F2`). Backend, Routing, i18n, Projekt-/Kundenbereich unverändert.

## Designprinzipien

- **Illustrativ-3D, nicht fotorealistisch.** Kamera aus CSS-Gradients/Schatten/SVG; CSS-3D-Transforms (`perspective`, `rotateX`) für die Drehung. Keine Three.js-Abhängigkeit, kein 3D-Modell, kein Video.
- **Eine Quelle der Wahrheit:** Die interaktive `CameraNav` liegt fest oben. Das Intro ist ein reines Overlay, das am Ende deckungsgleich auf die `CameraNav` überblendet — kein sichtbarer Element-Tausch.
- **Dezente Bewegung:** nichts blockiert Klicks, nichts loopt aufdringlich. `prefers-reduced-motion` schaltet Intro + Pulsieren ab.
- Tokens/Fonts wie bestehend: `paper #F4F4F2`, `ink #111`, `fog #9A9A96`, Instrument Sans + IBM Plex Mono. Kamera-eigene Dunkeltöne (`#2c2d2f → #0e0f10`), Amber-Rec `#e0a23a`, Auslöser-Rot `#e23b2e`.

## Komponente: CameraNav (`src/components/layout/CameraNav.tsx`)

Ersetzt `Header.tsx` in `src/app/[locale]/layout.tsx`. Client-Komponente (`usePathname`, Interaktion). Bekommt weiterhin `statusText` sowie neu die Social-URLs als Props vom Server-Layout.

**Desktop-Aufbau (fixiert, mittig, max-width ~1000px, weicher Schatten, „liegt auf der Seite"):**
- **Logo-Dial** links: runder, geriffelter Knopf mit `CosmoLogo`-Kürzel; `Link` → `/`. `aria-label` Startseite.
- **Hotshoe-Bump** mittig oben am Body (rein dekoratives Detail).
- **Nav** (`Link` aus `@/i18n/navigation`): Portfolio (→ `/`, die Startseite IST die Galerie), Über mich (`/about`), Kontakt (`/contact`), Kundenbereich (`/downloads`). Jeder Eintrag: Linien-Icon (SVG) + Label (uppercase, `tracking`), aktiver Eintrag erkannt via `usePathname`, markiert durch pulsierende Amber-Rec-Leuchte + `aria-current="page"`.
- **Rechte Steuerung:** zwei geriffelte Dials (dekorativ, drehen bei Hover minimal), Social-Icons (Instagram/LinkedIn, nur wenn URL in Settings gesetzt; externe Links), **Auslöser-Knopf** (Funktion: Scroll-to-top mit kurzem Weiß-Blitz; `<button>` mit `aria-label`), **DE/EN** (`LanguageToggle`, Mono).

**Navigations-Mapping:** Logo-Dial = `/` (Start). Da die Startseite die Projekt-Galerie IST, zeigt „Portfolio" ebenfalls auf `/` und gilt als aktiv, wenn `pathname === "/"`. (Kein separater „Start"-Eintrag — wie im abgenommenen Mockup.)

**Layout-Höhe:** Die Kamera ist höher als die alte 72px-Leiste (Hotshoe-Bump + Body). Header-Zone ~120px; Seiteninhalte erhalten entsprechendes Top-Padding. Die `HomeStage`-Panel-Höhe (`h-dvh` mit `pt-[72px]`) wird auf die neue Höhe angepasst.

**Mobil (< md):** Kompakte dunkle Leiste statt voller Kamera — Logo-Dial links + Auslöser-Knopf rechts, der das bestehende `MobileMenu` (Fullscreen) öffnet. Keine Dials/Hotshoe. DE/EN im MobileMenu.

## Komponente: CameraIntro (`src/components/home/CameraIntro.tsx`)

Ersetzt `IntroOverlay.tsx`. Wird von `HomeClient` gerendert (nur Startseite), gegated wie bisher: nur erster Besuch der Session (`sessionStorage`-Key `cosmo-intro-seen`), `prefers-reduced-motion` → übersprungen.

**Mechanik (~2,5 s, expo-out):**
- Fixed Overlay (`z-[100]`), dunkler Hintergrund (`#0c0c0d`).
- CSS-3D-Rig (`transform-style: preserve-3d`) als Quader mit detaillierter **Front** (Body, Objektiv aus konzentrischen Radial-Gradients + Reflex, Griff-Riffelung, „cosmo."-Gravur/Wortmarke), **Top** (= identisches Kamera-Menü-Layout) und schlanken dunklen Seitenflächen.
- Keyframes: Start `rotateX(0)` frontal, kurze Haltephase → Drehung zu `rotateX(-90deg)` (Oberseite zum Betrachter) + `translateY` nach oben + leichtes `scale` zur Andock-Größe. Gleichzeitig fadet die helle Seite (`HomeStage`) darunter ein.
- **Andocken & Übergabe:** Endframe deckungsgleich mit der Ruhelage der `CameraNav`. Am Ende fadet das Overlay aus (kurz), darunter liegt die echte `CameraNav` an exakt gleicher Position → nahtlos. Danach unmountet das Overlay; `HomeStage` ist interaktiv.
- **Skip:** Klick/Taste bricht ab (Delays kollabieren, schneller Andock-Frame), wie beim alten Intro. Cutoff-Guard gegen Mid-Animation-Neustart.

**Mobil:** vereinfachte, kürzere Kippung eines kompakten Kamera-Symbols (Performance), Endzustand = mobile `CameraNav`.

## HomeClient-Anpassung (`src/components/home/HomeClient.tsx`)

- Statt `IntroOverlay` nun `CameraIntro`.
- `introRan`/`overlay`-State-Muster bleibt (stabiles `delayed` für die `HomeStage`-Reveal-Delays; `delayed` ändert sich nach erstem Render nicht).
- Reveal-Delays der `HomeStage` an die neue ~2,5-s-Sequenz angepasst (Andock-Zeitpunkt).

## Styling

- Kamera-spezifisches CSS (Body-Gradients, Riffelung via `repeating-conic/linear-gradient`, Objektiv, Schatten, 3D-Faces, Keyframes für Rotation/Rec-Puls/Auslöser-Blitz) in `src/app/globals.css` (eigener, klar kommentierter Abschnitt „Camera Nav / Intro"). Layout/Spacing via Tailwind in den Komponenten.
- `prefers-reduced-motion`: Rotation, Rec-Puls, Dial-Hover-Spin, Auslöser-Blitz deaktiviert.

## Funktionen der Bedienelemente

| Element        | Funktion                                                |
|----------------|---------------------------------------------------------|
| Logo-Dial      | Link → Startseite `/`                                    |
| Nav-Einträge   | Links → `/`, `/about`, `/contact`, `/downloads`         |
| Social-Icons   | Externe Links aus Settings (instagram_url, linkedin_url)|
| Auslöser       | Scroll-to-top + kurzer Weiß-Blitz (visuell)             |
| DE/EN          | Sprachumschalter (bestehende Logik)                     |
| Dials (2×)     | Dekorativ, Hover-Mikrodrehung                            |

## Barrierefreiheit

- Nav als echte Links, aktiver Eintrag `aria-current="page"`.
- Auslöser/Hamburger als `<button>` mit `aria-label`, `aria-expanded` (mobil).
- Intro `aria-hidden`, per Klick/Taste überspringbar; entfällt bei `prefers-reduced-motion`.
- Tastatur-Fokuszustände auf allen interaktiven Kamera-Elementen sichtbar.

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/layout/CameraNav.tsx` | NEU — Kamera-Menü (ersetzt Header) |
| `src/components/home/CameraIntro.tsx` | NEU — 3D-Intro (ersetzt IntroOverlay) |
| `src/app/globals.css` | Kamera-CSS-Abschnitt + Keyframes; alte Intro-Keyframes ersetzt |
| `src/app/[locale]/layout.tsx` | `Header` → `CameraNav`, Social-URLs laden & übergeben |
| `src/components/home/HomeClient.tsx` | `IntroOverlay` → `CameraIntro`, Reveal-Timing |
| `src/components/home/HomeStage.tsx` | Top-Padding/Höhe an neue Header-Höhe |
| `src/components/layout/Header.tsx` | GELÖSCHT |
| `src/components/home/IntroOverlay.tsx` | GELÖSCHT |
| `src/components/layout/MobileMenu.tsx` | bleibt; vom Kamera-Auslöser (mobil) geöffnet |
| `src/components/layout/LanguageToggle.tsx` | bleibt; in CameraNav + MobileMenu eingebunden |

## Verifikation

- `npx tsc --noEmit` + `npm run build` grün.
- Dev-Checks: Startseite erster Besuch (Intro läuft, dockt sauber an), Reload (kein Intro), Skip per Klick/Taste, `prefers-reduced-motion` (kein Intro, statisches Menü).
- Menü auf allen Seiten (Start/Projekt/About/Kontakt/Downloads), aktiver Eintrag korrekt, Sprachwechsel, Social-Links, Auslöser-Scroll, mobiles Aufklappen.
- Kein sichtbarer Sprung zwischen Intro-Endframe und CameraNav.

## Bewusst ausgelassen (YAGNI)

- Kein echtes 3D (Three.js/WebGL), kein 3D-Modell, kein vorgerendertes Video.
- Kein Sound.
- Keine „Films"-Sektion (separat entschieden: nicht Teil dieser Seite).
- Intro nur auf der Startseite, nicht auf Unterseiten.
