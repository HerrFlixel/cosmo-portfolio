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

Admin-Benutzername: `ADMIN_USERNAME` in `wrangler.jsonc` (`felix`).
