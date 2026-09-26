# Cosmo Photos – Website

Next.js 16 auf Cloudflare Workers (OpenNext), D1 (Datenbank), R2 (Bilder).
Spec und Pläne: `docs/superpowers/`.

## Voraussetzungen

- Das Projekt liegt im Disk-Image `SSD FELIX 3/CODING/CosmoDev.sparsebundle`.
  Nach jedem Neustart per Doppelklick einhängen, dann liegt es unter `/Volumes/CosmoDev/cosmo-website`.
- Node 24 (`.node-version`), npm 11 lokal. **Cloudflare baut mit npm 10.9.2.**
- Einmalig: `npx wrangler login`, `npx playwright install chromium`, `cp .dev.vars.example .dev.vars`.

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
| `ADMIN_PASSWORD_HASH` | Produktion, Vorschau | `npm run admin:password` (bzw. `npm run admin:password -- --env=preview`) |
| `SESSION_SECRET` | Produktion, Vorschau | `openssl rand -base64 48 \| tr -d '\n' \| npx wrangler secret put SESSION_SECRET` |
| `GALLERY_SECRET` | Produktion, Vorschau | `openssl rand -base64 48 \| tr -d '\n' \| npx wrangler secret put GALLERY_SECRET` (siehe unten: nicht rotieren) |
| `RESEND_API_KEY`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CONTACT_EMAIL` | Produktion, Vorschau | `bash scripts/set-contact-secrets.sh` (Vorschau: `… --env=preview`), siehe unten |

Admin-Benutzername: `ADMIN_USERNAME` in `wrangler.jsonc` (`felix`).

### Kundengalerien

- Dateien liegen im **privaten** Bucket `cosmo-galleries` (Vorschau: `cosmo-galleries-preview`) – nie eine Custom Domain oder r2.dev-URL daran hängen; ausgeliefert wird nur über den Worker mit Galerie-Cookie.
- Secret `GALLERY_SECRET` (≥ 32 Zeichen) signiert die Zugangs-Cookies und verschlüsselt die Galerie-Passwörter für die Anzeige im Admin.
  **Nicht rotieren**, außer im Notfall: Danach sind alle Kunden abgemeldet und jedes Galerie-Passwort muss im Admin neu gesetzt werden.
- Originale: nur JPEG, max. 95 MB pro Datei. ZIPs werden ab 2 GB in Teile gesplittet.

### Kontaktformular

- Es ist nur aktiv, wenn alle vier Kontakt-Secrets gesetzt sind; sonst zeigt `/kontakt` die Mail-Adresse aus „Texte & Links“.
- **Resend:** Bis `cosmo-photos.de` bei Resend geprüft ist (Plan 6, DNS), sendet Resend von `onboarding@resend.dev` und nur an die Adresse des Resend-Kontos. `CONTACT_EMAIL` muss bis dahin genau diese Adresse sein. Danach optional `CONTACT_FROM` (z. B. `Cosmo Photos <kontakt@cosmo-photos.de>`) setzen.
- **Turnstile:** Widget im Cloudflare-Dashboard (Turnstile → Widget hinzufügen). Hostnamen: `cosmo-web.felix-vatterodt.workers.dev`, `cosmo-photos.de`. Modus „Managed“.
- Lokal, in E2E-Tests und in der Vorschau: `RESEND_API_KEY=log` (verschickt nichts) und die öffentlichen Turnstile-Testschlüssel.
- Logo-Pfade: `npm run logo:generate` nach Änderungen an `brand/logo-*.svg` (der Lint prüft es).

### Bewegung

- Aktiv nur ohne „Bewegung reduzieren“ (Systemeinstellung). Ein Inline-Skript (`src/lib/motion/boot.ts`) setzt dann `html.has-motion`; alle Bewegungs-Stile hängen daran.
- Das Intro „Orbit“ läuft beim ersten Aufruf der Startseite pro Browser-Sitzung (`sessionStorage["cosmo-intro"]`). Zum erneuten Ansehen: neues privates Fenster, oder in den Entwicklertools `sessionStorage.removeItem("cosmo-intro")`.
- E2E-Tests laufen standardmäßig mit reduzierter Bewegung; Bewegungs-Tests stehen in `motion.spec.ts` und `motion-portfolio.spec.ts`.

### Performance

- Messen: `npm run lighthouse -- <URL> …` (mobil, simuliertes 4G, Median aus 3 Läufen nach einem Aufwärm-Aufruf; Berichte in `.lighthouse/`).
- Ziel (Spec §10/§11): Performance, Barrierefreiheit, Best Practices und SEO ≥ 90, LCP < 2,5 s. SEO erst auf `cosmo-photos.de` aussagekräftig (Vorschau und workers.dev sind `noindex`).
- Das Intro läuft als „Seite zuerst“: Die Startseite ist gezeichnet, bevor das Intro endet. Zeilen-Reveals gibt es nur unterhalb des ersten Bildschirms.
- CSS steht im HTML (`experimental.inlineCss`), Prioritätsbilder werden per `preload` im Kopf angekündigt.
- Worker-Kaltstarts (großes OpenNext-Bundle) kosten beim ersten Aufruf nach einer Pause bis zu ≈ 1,5 s Serverzeit.
- Stand Plan 6 (Vorschau, Median): Start 91, Floorball 99, Englisch 93, Über mich 84. Auf „Über mich“ teilen sich im simulierten 4G fünf vorab geladene Schriftdateien (≈ 325 KB) die Bandbreite mit dem Porträt; gemessen ist das Porträt nach 1–1,8 s da.

### Umzug auf cosmo-photos.de

**Vorher (👤 Felix):**
1. Fotos je Kategorie, Porträt, Texte, Impressum und Datenschutz im Admin; Instagram- und Shop-Link unter „Texte & Links“.
2. Kontakt-Secrets setzen: `bash scripts/set-contact-secrets.sh`.
3. Turnstile: im Widget den Hostnamen `cosmo-photos.de` ergänzen.
4. Resend: Domain `cosmo-photos.de` hinzufügen. Die angezeigten DNS-Einträge im Cloudflare-DNS anlegen („Auto configure“ bei Resend oder von Hand): MX und TXT auf `send`, DKIM `resend._domainkey`. Warten, bis Resend „Verified“ zeigt, und die Absenderadresse festlegen (z. B. `kontakt@cosmo-photos.de`).
5. `npm run test:launch` ist grün.

**Umzug (Plan 6, Task 13):**
1. 👤 Cloudflare → `cosmo-photos.de` → DNS: die Einträge für `cosmo-photos.de` (A/AAAA) und, falls vorhanden, `www` fotografieren, dann löschen.
   **Nicht anfassen:** MX, TXT (SPF, DMARC), den Platzhalter `*` und alle übrigen Einträge. Die Mail bei All-Inkl läuft unverändert weiter.
2. `routes` (Custom Domains `cosmo-photos.de` und `www.cosmo-photos.de`) und `CONTACT_FROM` in `wrangler.jsonc`, Push auf `main`. Workers Builds verbindet die Domains (≈ 2–3 Minuten).
3. Prüfen:
   - Neue Seite unter `https://cosmo-photos.de`; `www` leitet um.
   - Alte WordPress-Adressen leiten um.
   - MX und SPF unverändert.
   - `npm run test:e2e:prod` und `npm run test:launch` grün.
   - Lighthouse auf der Domain.

**Rückweg:**
1. Workers & Pages → `cosmo-web` → Einstellungen → Domains & Routes: `cosmo-photos.de` und `www.cosmo-photos.de` entfernen.
2. Die fotografierten A/AAAA-Einträge wieder anlegen (Proxy an). Die WordPress-Seite ist sofort zurück.
3. Danach `routes` aus `wrangler.jsonc` entfernen, sonst verbindet der nächste Push die Domains erneut.

**Nachher (👤, optional):**
- Google Search Console: Domain-Property per DNS-TXT, Sitemap `https://cosmo-photos.de/sitemap.xml` einreichen.
- Den WordPress-Webspace erst kündigen, wenn alles läuft. Die Mail liegt im selben All-Inkl-Paket.
