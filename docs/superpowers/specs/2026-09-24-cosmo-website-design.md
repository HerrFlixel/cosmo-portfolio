# Cosmo Photos: Neue Website (Design-Spec)

**Datum:** 2026-09-24
**Status:** Im Brainstorming abschnittsweise abgenommen. Die Spec wartet auf das finale Review des Nutzers.
**Mockups und Bewegungsstudien:** `.superpowers/brainstorm/56500-1790266637/content/`
- `design-richtung.html`: Richtung C „Licht aus“ gewählt
- `logo-intro.html`: Intro 1 „Orbit“ gewählt, inkl. Referenz-Implementierung der Timeline

**Marken-Assets:** `brand/logo-original.svg`, `brand/portrait-felix.jpg`

---

## 1. Ziel

Neue Website für **Cosmo Photos**: Felix Vatterodt, Sportfotograf aus Hamburg mit Schwerpunkt Floorball, dazu Fußball, Volleyball, Hochzeiten und Studio. Das Projekt beginnt komplett neu. Das Altprojekt `Cosmo Portfolio Website` dient nur als Steinbruch, etwa für Texte oder die Kontaktformular-Logik.

**Zweck:** vor allem Showcase der Marke plus Auslieferung von Kundengalerien. Die Seite ist kein Verkaufstrichter.

**Erfolgskriterien**
1. Die Seite fühlt sich an wie eine Awwwards-Seite: ruhig, hochwertig, durchanimiert. Die Bilder behalten dabei den Vortritt.
2. Eine Kundengalerie ist in wenigen Minuten angelegt, befüllt und geteilt.
3. Kunden laden auch mehrere GB große Galerien zuverlässig herunter.

## 2. Entscheidungen (abgenommen)

| Thema | Entscheidung |
|---|---|
| Projekt | Neu, im Ordner `Cosmo Website neu` |
| Stack | Next.js (App Router, TypeScript) auf **Cloudflare Workers** via OpenNext, **R2** (Dateien), **D1** (Datenbank) |
| Bildquelle | **Browser-Upload im Admin**. NAS bleibt Archiv. Kein NAS-, Google-Drive- oder OneDrive-Sync |
| Portfolio | 5 Kategorien: **Floorball, Volleyball, Fußball, Hochzeiten, Studio**. Jede Kategorie ist direkt eine kuratierte Bildstrecke |
| Sprachen | Deutsch (Standard) und Englisch |
| Seiten | Start, 5 Kategorieseiten, Über mich, Kontakt (Formular), Kundenbereich, Impressum, Datenschutz, Link zum pictrs-Shop |
| Designrichtung | **C „Licht aus“**: hell und clean im Passepartout, pro Kategorie ein dunkler „Einlauf“-Moment |
| Kamera-UI | **Keine**: kein Sucher-Cursor, kein Bildzähler, keine Belichtungsdaten |
| Logo-Intro | **1 „Orbit“** |
| Kundengalerie | Link und Passwort, Ablaufdatum, Favoriten (pro Besuchername), Download-Statistik, ZIP-Download |

## 3. Architektur

### 3.1 Bausteine

- **App:** Next.js (aktuelle stabile Version, bei Projektstart auf Kompatibilität mit `@opennextjs/cloudflare` prüfen), TypeScript, Tailwind CSS v4.
- **Laufzeit:** Cloudflare Workers mit Workers Paid (5 $/Monat).
- **R2:** ein Bucket `cosmo-media` mit zwei Bereichen.
  - `portfolio/…` ist öffentlich über die Custom Domain `img.cosmo-photos.de` erreichbar, mit langem CDN-Cache.
  - `galleries/…` ist privat. Der Zugriff läuft ausschließlich über App-Routen mit Zugangsprüfung.
- **D1 + Drizzle ORM** für alle Metadaten.
- **Sprachen:** next-intl. Deutsch ohne Präfix (`/floorball`), Englisch mit Präfix (`/en/floorball`) und lokalisierten Pfaden.
- **Animation:** GSAP (inkl. ScrollTrigger und SplitText, seit 2025 kostenlos) und Lenis (Smooth Scroll).
- **Mail:** Resend für das Kontaktformular. Spamschutz über Cloudflare Turnstile.
- **Rate Limiting:** Workers Rate Limiting Binding für Passwort-Versuche und das Kontaktformular.
- **Schriften:** via `next/font`, selbst gehostet. Keine Anfragen an Google zur Laufzeit.

### 3.2 Routen

| Route (DE) | Route (EN) | Inhalt |
|---|---|---|
| `/` | `/en` | Startseite |
| `/floorball`, `/volleyball`, `/fussball`, `/hochzeiten`, `/studio` | `/en/floorball`, `/en/volleyball`, `/en/football`, `/en/weddings`, `/en/studio` | Kategorieseiten |
| `/ueber-mich` | `/en/about` | Über mich |
| `/kontakt` | `/en/contact` | Kontakt |
| `/kunden` | `/en/clients` | Einstieg Kundenbereich (Feld „Galerie-Code“) |
| `/impressum`, `/datenschutz` | `/en/imprint`, `/en/privacy` | Pflichtseiten |
| `/g/[slug]` | (ohne Präfix) | Kundengalerie; Sprache per Cookie bzw. Accept-Language plus Umschalter |
| `/admin/…` | (nur DE) | Backoffice |

**Datei-Routen (Worker, geschützt):**
- `/g/[slug]/img/[imageId]/[thumb|preview]`: Vorschau- und Web-Größen
- `/g/[slug]/img/[imageId]/original`: Original als Download
- `/g/[slug]/zip?set=all|favorites&part=n`: gestreamtes ZIP

### 3.3 Upload-Pipeline (Admin, im Browser)

1. Du ziehst einen Ordner oder Dateien (JPG) in die Upload-Fläche.
2. Pro Datei in einem Web Worker:
   - Der Browser dekodiert das Bild mit `createImageBitmap` (EXIF-Ausrichtung beachten).
   - Er erzeugt WebP-Versionen per `OffscreenCanvas` (JPEG, falls der Browser kein WebP kodieren kann).
   - Er berechnet die **CRC32 des Originals** und den **Hauptfarbton** (Platzhalter).
3. Erzeugte Größen:
   - **Portfolio:** 800 / 1600 / 2400 px
   - **Galerie:** Vorschau 800 px, Web-Größe 2400 px, dazu das Original unverändert
4. Upload über App-Routen, die per R2-Binding streamen:
   - Dateien bis 90 MB gehen in einem Request.
   - Größere Dateien laufen als R2-Multipart in 50-MB-Teilen, weil Cloudflare Requests auf 100 MB begrenzt.
   - Es laufen maximal 3 Dateien parallel. Fehlgeschlagene Dateien werden automatisch 2× wiederholt, danach rot markiert mit „Erneut versuchen“.
5. Danach werden die Metadaten in D1 registriert: Dateiname, Maße, Bytes, CRC32, Farbton, Reihenfolge.
6. Reihenfolge in Galerien: nach Dateiname, also so, wie Lightroom exportiert.

### 3.4 Auslieferung

- **Portfolio:** direkt von `img.cosmo-photos.de`, `srcset` mit 800/1600/2400, `Cache-Control: public, max-age=31536000, immutable`. Die Schlüssel enthalten die Bild-ID, eine Invalidierung ist nie nötig.
- **Galerie:** Die Route prüft das Galerie-Cookie und streamt aus R2 mit `Cache-Control: private`. Originale kommen mit `Content-Disposition: attachment; filename="<Originalname>"`.
- **ZIP:** eigenes, kleines Modul `zip-stream`.
  - Format: STORE (ohne Kompression, JPGs sind schon komprimiert), Zip64-fähig.
  - CRC32 und Größen stammen aus der Datenbank. Dadurch kostet der Stream kaum CPU, und **`Content-Length` steht vorher fest**. Der Browser zeigt also einen echten Fortschritt.
  - Galerien über 2 GB werden automatisch in **Teile ≤ 2 GB** aufgeteilt (aufeinanderfolgende Dateien).
  - Dateiname: `Cosmo-Photos_<slug>_Teil-1-von-2.zip`.
  - Der Aufbau ist deterministisch (feste Reihenfolge, feste Zeitstempel). Das hält Range-Requests für eine spätere Fortsetzen-Funktion offen, sie ist aber nicht Teil von v1.

## 4. Designsystem „Licht aus“

### 4.1 Farben

| Token | Wert | Verwendung |
|---|---|---|
| `paper` | `#F1EFEA` | Grundhintergrund (Tageslicht) |
| `ink` | `#141414` | Text, Logo |
| `stone` | `#8B877E` | Meta-Infos, Zähler |
| `mat` | `#FFFFFF` | Passepartout |
| `hall` | `#0B0B0C` | Hintergrund in „Hallenlicht“-Momenten |
| `hall-ink` | `#ECEAE4` | Text im Dunkeln |
| `signal` | `#FF3D2E` | Nur in Hallenlicht-Momenten, nur als winziger Akzent (Punkt, Zähler) |

### 4.2 Typografie (3 Familien)

| Rolle | Schrift | Einsatz |
|---|---|---|
| Editorial | **Bodoni Moda** (opsz 96, gern *italic*) | Headlines, Statements, Menü-Hover |
| Sport-Display | **Archivo** Italic, `wdth 62`, `wght 900`, Versalien | Kategorie-Titel („FLOORBALL“) |
| Text/UI | **Archivo** normal (`wdth 100`, `wght 400–500`) | Fließtext, Navigation, Formulare, Admin |
| Labels | **Martian Mono** (`wdth 87`) | Nummerierungen und Zähler wie „01“ oder „(41)“. **Keine** EXIF-Daten |

### 4.3 Passepartout (Kern-Komponente)

- Weißer Rahmen, dessen Breite etwa 6 % der Bildbreite beträgt, dazu ein weicher Schatten: `0 .3cqw 1.8cqw rgba(20,20,18,.10), 0 .05cqw .2cqw rgba(20,20,18,.08)`.
- Hover: Das Bild hebt sich an wie ein Abzug, den man aufnimmt. Der Schatten wird weicher und tiefer, das Bild skaliert innen auf 1.03.
- Solange das Bild lädt, füllt der Hauptfarbton die Fläche. Danach blendet das Bild weich ein und wird scharf.

### 4.4 Bewegung

- **Easing:** `expo.out` für Reveals, `expo.inOut` für Übergänge, `power1.inOut` für Bahnen (Ring).
- **Dauern:** Mikro-Interaktionen 0,3–0,6 s, Reveals 0,9–1,2 s.
- Lenis für Smooth Scroll auf allen öffentlichen Seiten **außer** Kundengalerie und Admin.
- **`prefers-reduced-motion`:** kein Intro. Parallaxe und „Licht aus“ werden durch kurze Überblendungen ersetzt, Lenis ist aus.

## 5. Logo und Intro „Orbit“

### 5.1 Logo-Aufbau

- Grundlage ist `brand/logo-original.svg`. Die Wortmarke COSMO besteht aus einzelnen Pfaden: Der Ring schneidet jeden Buchstaben in einen oberen und einen unteren Teil. Dazu kommt der Ring als eigener Pfad.
- **Lockup-Regel:** „PHOTOS“ beginnt bündig unter der linken Kante des **C** (x ≈ 18) und endet mit dem **S** bündig an der rechten Kante des letzten **O** (x ≈ 194,5). Es läuft nie darüber hinaus.
- **Erledigt:** `brand/logo-lockup.svg` (PHOTOS aus Industry Book in Pfade umgewandelt, exakte Illustrator-Positionen) und `brand/logo-wordmark.svg`. Die Schrift *Industry* wird nicht eingebunden.
- Varianten:
  - Header: nur COSMO mit Ring, ca. 10 % der Viewport-Breite auf dem Desktop
  - Intro und Footer: voller Lockup
  - Favicon: „C“ mit Ringausschnitt

### 5.2 Intro-Timeline

Referenz-Implementierung: `logo-intro.html`, Funktion `MAKERS.orbit`.

| Zeit | Ereignis |
|---|---|
| 0,10–1,30 s | Der Ring „zieht seine Bahn“. Eine Maske mit Strich entlang der Ring-Mittellinie läuft über `stroke-dashoffset` (Länge per `getTotalLength()`), Easing `power1.inOut` |
| 0,50 / 0,63 / 0,73 / 0,83 / 0,97 s | C, O, S, M, O wachsen jeweils 0,95 s mit `expo.out` aus dem Ring. Obere Teile starten bei y +44 und sind oberhalb der Ring-Mittellinie maskiert, untere starten bei y −34 und sind unterhalb maskiert |
| 1,25 s | „PHOTOS“: die Buchstaben gestaffelt (+0,055 s) mit Fade und einem kleinen Anstieg |
| 2,15 s | Übergabe: PHOTOS blendet aus. Das Logo fliegt in 1,05 s mit `expo.inOut` in seine Header-Position. Headline-Zeilen, Passepartouts, Navigation und Index bauen sich gestaffelt auf |
| ≈ 3,2 s | Startseite steht, Scrollen ist frei |

**Regeln**
- Das Intro läuft nur beim ersten Besuch pro Sitzung (`sessionStorage`).
- Klick oder Taste überspringt es: Die Timeline springt ans Ende der Übergabe.
- Während das Intro läuft, sind die Hero-Bilder schon vorgeladen, und das Scrollen ist gesperrt.
- Bei `prefers-reduced-motion` gibt es kein Intro.
- **Nahtloser Übergang:** Das Intro-Logo und das Header-Logo sind dasselbe DOM-Element, das per FLIP an seinen Platz fliegt. Es gibt keinen sichtbaren Wechsel zwischen zwei Elementen.

## 6. Öffentliche Seiten

### 6.1 Startseite

1. **Hero:** Bodoni-Headline (Platzhalter „Hallen, Rauch, *Gänsehaut.*“, pflegbar im Admin) mit Reveal Zeile für Zeile. Dazu eine lose Collage aus 3 Passepartouts mit leichter Parallaxe und eine Kategorie-Indexleiste „01 Floorball (41) …“.
2. **Fünf Kategorie-Kapitel „Einlauf“:** Jedes Kapitel ist eine per ScrollTrigger fixierte Sektion.
   - **0–40 %:** Das Kapitel-Bild wächst aus seinem Passepartout, bis es den Bildschirm füllt. Parallel dunkelt der Hintergrund von `paper` nach `hall` ab: „Licht aus“.
   - **40–70 %:** Der Kategorie-Titel erscheint (Archivo, schmal, kursiv) samt Zähler `(41)`, der Signal-Punkt glimmt auf.
   - **70–100 %:** Das Licht geht wieder an. 4–5 Vorschaubilder im Passepartout ziehen in unterschiedlichem Tempo vorbei, darunter der Link „Alle Floorball-Bilder →“.
3. **Über-mich-Teaser:** Porträt im Passepartout, ein Satz, Link.
4. **Abschluss:** große Kontaktzeile (Mail), Instagram, pictrs-Shop.
5. **Footer:** großer Logo-Lockup, dessen Ring beim Scrollen langsam kreist. Dazu Impressum, Datenschutz und DE/EN.

### 6.2 Kategorieseite

- Nach dem Ottografie-Muster: Der riesige Titel „FLOORBALL (41)“ bleibt mittig stehen. Die Bilder ziehen im Passepartout in 3 lockeren, versetzten Spalten mit unterschiedlichem Scrolltempo vorbei (2 auf dem Tablet, 1 auf dem Handy).
- Unten schwebt eine Kategorie-Pille (Mini-Vorschaubild und Name, klappt die 5 Kategorien auf).
- **Lightbox „Licht aus“:** Hintergrund `hall`, Bild zentriert, Pfeiltasten, Wischen, ESC, ein dezenter Positionszähler „12 / 41“ in Mono. Das ist die übliche Lightbox-Orientierung, kein Kamera-Bildzähler. Die Übergänge kommen aus der Passepartout-Position (FLIP).
- **Übergang von der Startseite:** Das Kapitel-Bild fliegt an seinen Platz als Titelbild der Kategorieseite. Alle anderen Seitenwechsel laufen über einen kurzen Papier-Vorhang.

### 6.3 Über mich, Kontakt, Kunden, Pflichtseiten

- **Über mich:** Porträt im Passepartout (`brand/portrait-felix.jpg`), ein Bodoni-Statement, Text (DE/EN) und die Referenzliste der Vereine und Partner als Text, etwa ETV Hamburg, FZ17, Unihoc, Floorball Deutschland.
- **Kontakt:** Bodoni-Headline, schlichtes Formular (Name, E-Mail, Worum geht's?, Nachricht), Turnstile, Honeypot. Versand per Resend an die Kontaktadresse, mit Erfolgs- und Fehlermeldung inline.
- **`/kunden`:** kurzer Text und das Feld „Galerie-Code“ (Slug). Danach folgt die Passwortseite der Galerie.
- **Impressum und Datenschutz:** einfache Textseiten, Inhalt pflegbar im Admin.
- **404:** eigene Seite, z. B. mit einem großen, leicht verschobenen Ring.

### 6.4 Mikro-Interaktionen

- **Cursor** (nur Desktop): ein kleiner Punkt, der über Bildern zu einem **Orbit-Ring** wird.
- **Scroll-Fortschritt:** ein winziger Ring unten rechts, der sich schließt.
- **Menüpunkte:** Beim Hover rollt das Wort in die kursive Bodoni. Unterstreichungen zeichnen sich von links.
- **Headlines:** Reveal Zeile für Zeile hinter einer Maske.
- **Passepartout-Hover:** siehe 4.3.

### 6.5 Handy

- Gleiche Dramaturgie, aber gestapelt und mit weniger Parallaxe. Die Kapitel sind kürzer fixiert.
- Kein eigener Cursor. Das Menü ist ein Vollbild-Menü mit gestaffeltem Reveal.

## 7. Kundenbereich

### 7.1 Ablauf für den Kunden

1. Er öffnet `cosmo-photos.de/g/<slug>` und sieht die Passwortseite (Galerietitel, ein Feld).
2. Ist das Passwort korrekt, setzt die Seite ein HttpOnly-Cookie, das nur für `/g/<slug>` gilt und 30 Tage hält.
3. Galerieseite:
   - **Kopf:** Titel, Datum, Bildanzahl, „Online bis 24.10.2026“.
   - **Buttons:** **„Alle herunterladen (3,2 GB)“** und **„Favoriten herunterladen (12)“**, bei Bedarf in ZIP-Teile gesplittet.
   - **Raster:** lädt nur, was sichtbar ist (virtualisiert), mit Vorschau 800 px.
   - **Lightbox:** Web-Größe 2400 px, mit Herz- und Download-Button (Original).
4. **Favoriten:** Beim ersten Herz fragt die Seite einmal „Wie heißt du?“ und speichert den Namen im Cookie. Die Favoriten liegen serverseitig pro Name. Jeder sieht nur seine eigene Auswahl, dazu gibt es den Filter „Nur Favoriten“.
5. Die Galerie bleibt **bewusst ruhig:** kein Lenis, keine Parallaxe, nur dezente Einblendungen.

### 7.2 Zustände

| Zustand | Verhalten |
|---|---|
| Entwurf | Öffentlich nicht erreichbar (404) |
| Online | Normal |
| Abgelaufen | Freundliche Seite „Schreib mir, wenn du sie nochmal brauchst“ mit Kontakt-Link. Die Dateien bleiben liegen |
| Unbekannter Slug | 404 |
| Falsches Passwort | Klare Meldung. Nach 5 Fehlversuchen in 10 Minuten (pro IP und Galerie) folgt eine Sperrzeit |

### 7.3 Statistik

Die Tabelle `gallery_events` speichert Ereignistyp (`view`, `download_image`, `download_zip`, `favorite_add`, `favorite_remove`), Zeitpunkt, optional den Besuchernamen und optional die Bild-ID bzw. den ZIP-Teil. **Keine IP-Adressen.**

### 7.4 Sicherheit

- Passwörter werden mit PBKDF2 (WebCrypto, Salt pro Galerie) gespeichert. Standard-Passwort: zwei Wörter plus Zahl, z. B. `rauch-hallen-47`, im Admin änderbar.
- Die Cookies sind signiert (HMAC mit Secret), HttpOnly, Secure und SameSite=Lax.
- Jede Datei-Route prüft das Cookie. Es gibt keine öffentlichen oder erratbaren R2-URLs für Galerien.
- `noindex` auf allen `/g/*`-Seiten, `/g/` ist in `robots.txt` ausgeschlossen.

## 8. Admin (`/admin`)

- **Login:** ein Admin. Der Benutzername steht in der Konfiguration, der Passwort-Hash als Secret. Die Sitzung hält 7 Tage (signiertes Cookie).
- **Galerien – Liste:** Status, Ablaufdatum, Aufrufe, Downloads und Favoriten.
- **Galerien – Detail:**
  - Titel, Datum, Slug, Passwort, Ablaufdatum (Standard +30 Tage oder „unbegrenzt“), Titelbild
  - Upload-Fläche nach 3.3, Bilder entfernen
  - „Veröffentlichen“ / „Zurück auf Entwurf“
  - **„Nachricht kopieren“:** fertiger Text (DE oder EN) mit Link, Passwort und Ablaufdatum
  - **Reiter Favoriten:** pro Person mit Vorschaubildern, dazu der Knopf **„Dateinamen kopieren“**, der eine kommagetrennte Liste für Lightrooms Textfilter liefert
  - **Reiter Statistik:** Zeitleiste der Ereignisse
  - „Verlängern“ und „Löschen“. Löschen entfernt auch die R2-Dateien und fragt vorher nach
- **Portfolio:**
  - Pro Kategorie hochladen, sortieren (Drag & Drop) und ausblenden.
  - Du wählst ein **Kapitel-Bild** und **4–5 Kapitel-Vorschaubilder** für die Startseite, dazu 3 **Hero-Bilder**.
  - Alt-Texte DE/EN sind optional. Standard: „<Kategorie> – Foto von Cosmo Photos“.
- **Texte und Links:** Hero-Headline, Über-mich (Statement, Text, Porträt), Referenzliste, Kontakt-E-Mail, Instagram-URL, pictrs-URL, Impressum, Datenschutz. Alles DE/EN, wo sinnvoll.
- **Optik:** gleiches Designsystem, aber funktional und ohne Show-Animationen.

## 9. Datenmodell (D1)

```
portfolio_images
  id TEXT PK · category TEXT (floorball|volleyball|fussball|hochzeiten|studio)
  width INT · height INT · color TEXT (#rrggbb) · alt_de TEXT? · alt_en TEXT?
  sort INT · visible BOOL · role TEXT? (hero|chapter|chapter_preview) · created_at

galleries
  id TEXT PK · slug TEXT UNIQUE · title TEXT · shoot_date TEXT?
  password_hash TEXT · password_salt TEXT · expires_at TEXT? (null = unbegrenzt)
  status TEXT (draft|online) · cover_image_id TEXT? · created_at · updated_at

gallery_images
  id TEXT PK · gallery_id FK · filename TEXT · bytes INT · crc32 INT
  width INT · height INT · color TEXT · sort INT · created_at

favorites
  gallery_id FK · image_id FK · visitor_name TEXT · created_at
  PK (gallery_id, image_id, visitor_name)

gallery_events
  id INT PK · gallery_id FK · type TEXT · visitor_name TEXT? · image_id TEXT? · zip_part INT? · created_at

settings
  key TEXT PK · value TEXT   (Texte, Links, Rechtstexte; DE/EN als getrennte Keys)
```

R2-Schlüssel:
- `portfolio/<id>/{800,1600,2400}` und `site/<id>/{800,1600,2400}` (Content-Type in den R2-Metadaten: WebP, sonst JPEG)
- `galleries/<galleryId>/<imageId>/{original,thumb,preview}`

## 10. Qualität

- **Performance:** Auf dem Handy (Mittelklasse, 4G) ist der LCP der Startseite unter 2,5 s. Animationen laufen mit 60 fps und bewegen nur `transform` und `opacity`, keine Layout-Animationen außerhalb des Intros. Bilder laden lazy, nur Hero-Bilder werden vorgeladen.
- **Barrierefreiheit:** Tastaturbedienung überall inkl. Lightbox und Favoriten, sichtbare Fokuszustände, Alt-Texte, Kontraste nach WCAG AA, Reduced Motion (siehe 4.4).
- **SEO:** Metadaten und Open-Graph-Bilder pro Kategorie, Sitemap DE/EN mit `hreflang`, strukturierte Daten (Person/Photographer). Galerien bekommen `noindex`.
- **Datenschutz:**
  - Kein Tracking, keine externen Fonts oder Skripte außer Turnstile auf der Kontaktseite.
  - Nur technisch notwendige Cookies.
  - Turnstile und Resend werden in der Datenschutzerklärung genannt.
  - Einschätzung (keine Rechtsberatung): Ein Cookie-Banner sollte nicht nötig sein.
- **Fehlerbehandlung:**
  - Upload-Retries (3.3).
  - ZIP-Abbruch: Der Teil lässt sich einzeln neu laden.
  - Formular: Validierung auf Client und Server, Meldungen inline.
  - Alle Fehlerseiten sind gestaltet.

## 11. Tests und Verifikation

- **Unit-Tests (Vitest):**
  - `zip-stream`: Die erzeugten ZIPs (inkl. Zip64 und Split) werden mit echtem `unzip -t` geprüft, die CRCs gegen die Originaldateien.
  - Passwort-Hashing und -Prüfung, Cookie-Signatur, Ablauflogik, Slug- und Passwort-Generator, ZIP-Aufteilung in Teile ≤ 2 GB.
- **E2E-Tests (Playwright):**
  - Kundenstrecke: falsches Passwort, dann richtiges; Favorit mit Namensabfrage; Einzel-Download; ZIP-Download; abgelaufene Galerie.
  - Admin: Login, Galerie anlegen, Upload mit Testbildern, veröffentlichen, „Nachricht kopieren“.
- **Visuell und manuell:** Intro (erster Besuch, Reload, Skip, Reduced Motion), Kapitel „Licht aus“, Kategorieseite und Lightbox auf Desktop, Tablet und Handy. Lighthouse Performance und Barrierefreiheit ≥ 90.

## 12. Betrieb

- **Repo und Deploy:** GitHub-Repo mit Cloudflare Workers Builds. Jeder Push auf `main` wird live veröffentlicht, Pull Requests bekommen Vorschau-URLs.
- **Umgebungen:** `production` und `preview`, jeweils mit eigener D1-Datenbank und eigenem R2-Bucket.
- **Secrets:** `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL`.
- **Domain:** `cosmo-photos.de` liegt bereits bei Cloudflare (Nameserver `igor`/`heidi`). Am Tag des Umzugs wird die Worker-Custom-Domain gesetzt, und die neue Seite ersetzt die aktuelle WordPress-Seite. Außerdem kommen `img.cosmo-photos.de` für das Portfolio-R2 und die Resend-DNS-Einträge (SPF/DKIM) für den Mailversand dazu.
- **Kosten (Richtwert):** Workers Paid 5 $/Monat plus R2 0,015 $/GB-Monat. Download-Traffic kostet nichts. Beispiel 500 GB ≈ 12,50 $/Monat gesamt.

## 13. Zulieferungen vom Nutzer (vor bzw. während der Umsetzung)

1. Logo-SVG mit „PHOTOS“ **in Pfaden** (✓ `brand/logo-lockup.svg`)
2. Impressum- und Datenschutztext, per Generator (später)
3. Porträt für „Über mich“ (✓ `brand/portrait-felix.jpg`)
4. Startbilder pro Kategorie (Upload später über den Admin)
5. Kontakt-E-Mail, Instagram-URL, pictrs-Shop-URL, Referenzliste (Admin)

## 14. Umsetzungsreihenfolge

Die Phasen bauen aufeinander auf. Jede endet mit einem lauffähigen, auf einer Vorschau-URL deployten Stand.

1. **Fundament:** Projekt-Setup (Next.js, OpenNext, D1, R2, Drizzle), Designsystem-Tokens und Fonts, i18n-Routing, Deploy-Pipeline mit Vorschau-URLs.
2. **Admin-Kern:** Login, Upload-Pipeline (3.3), Portfolio-Verwaltung, Texte und Links.
3. **Kundengalerien:** Admin-Galerien, Passwort und Cookies, Galerieseite, Favoriten, Statistik, `zip-stream`. Danach ist der Kundenbereich funktional nutzbar.
4. **Öffentliche Seiten, zunächst statisch:** Start, Kategorien, Lightbox, Über mich, Kontakt, Pflichtseiten, 404.
5. **Bewegung:** Intro „Orbit“, Lenis, Kapitel „Licht aus“, Kategorie-Parallaxe, Seitenübergänge, Mikro-Interaktionen, Reduced Motion.
6. **Launch:** SEO, Performance- und Barrierefreiheits-Durchgang, Domain-Umzug.

## 15. Nicht im Umfang (bewusst)

NAS-, Google-Drive- oder OneDrive-Sync · Kamera-UI und EXIF-Anzeige · Wasserzeichen · Shop oder Zahlungen (nur Link zu pictrs) · Blog · Videos und Reels · mehrere Admin-Nutzer · externes CMS · Fortsetzen abgebrochener ZIP-Downloads per Range-Request (Architektur hält es offen) · Kundenkonten über mehrere Galerien hinweg.
