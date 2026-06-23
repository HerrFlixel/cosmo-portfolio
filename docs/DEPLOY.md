# Deployment — Vercel (App) + Cloudflare (Domain)

The app runs as a normal Next.js project on **Vercel**. The **domain stays on
Cloudflare** (DNS only); Cloudflare points to Vercel. No code changes are
needed per deploy.

## 1. Import the repo into Vercel

1. Go to https://vercel.com → **Add New… → Project** → import `HerrFlixel/cosmo-portfolio`.
2. Framework preset: **Next.js** (auto-detected). Build command, output, install: leave defaults.
3. Do **not** deploy yet — add the environment variables first (next step).

## 2. Environment variables (Project → Settings → Environment Variables)

Set these for **Production** (and Preview if you want previews to work):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Turso URL (`libsql://…turso.io`) |
| `DATABASE_AUTH_TOKEN` | Turso auth token |
| `GOOGLE_DRIVE_FOLDER_ID` | Drive folder id (legacy portfolio sync; per-project folders are set in admin) |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | base64-encoded service-account JSON |
| `AUTH_SECRET` | random secret (`openssl rand -base64 32`) — `NEXTAUTH_SECRET` also still works |
| `ADMIN_USERNAME` | admin login |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of the admin password |
| `RESEND_API_KEY` | Resend API key |
| `CONTACT_EMAIL` | destination address for the contact form |

Notes:
- `NEXTAUTH_URL` is **not required** — `auth.ts` has `trustHost: true`, so Auth.js
  uses the request host automatically.
- The DB is external (Turso) and already migrated, so there is nothing to run on deploy.
- Copy the exact values from the current Render service (Environment tab) so nothing changes.

Deploy. You should get a working `*.vercel.app` URL.

## 3. Point the Cloudflare domain at Vercel

1. In Vercel: **Project → Settings → Domains → Add** your domain (e.g. `cosmophotos.de`
   and `www.cosmophotos.de`). Vercel shows the DNS records it wants.
2. In Cloudflare: **DNS → Records** for the domain, add what Vercel asked for:
   - Apex (`cosmophotos.de`): an **A** record to Vercel's IP `76.76.21.21`
     (or a CNAME to `cname.vercel-dns.com` if you use CNAME flattening), **or**
     follow the exact record Vercel displays.
   - `www`: **CNAME** → `cname.vercel-dns.com`.
   - Set these records to **DNS only** (grey cloud) first so Vercel can verify and
     issue the TLS certificate. After it's verified and live, you may turn the
     orange proxy back on if desired.
3. Wait for Vercel to show the domain as **Valid / certificate issued**.

## 4. After it's live

- Test: home (incl. first-visit intro), a project page + lightbox, contact form
  (send a test mail), client area with a real album code, ZIP download, `/werbung`,
  and the admin (`/admin`).
- Once Vercel serves the domain correctly, you can **delete the Render service**.
- Long routes (ZIP download, Drive sync, about-image upload) are capped at
  `maxDuration = 60` so they don't hit the default serverless timeout.
