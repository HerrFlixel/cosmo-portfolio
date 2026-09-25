#!/usr/bin/env bash
# Setzt ADMIN_PASSWORD_HASH als Cloudflare-Secret. Weitere Argumente gehen an wrangler (z. B. --env=preview).
set -euo pipefail
read -r -s -p "Neues Admin-Passwort (mind. 12 Zeichen): " PW; echo
read -r -s -p "Wiederholen: " PW2; echo
[ "$PW" = "$PW2" ] || { echo "Die Passwörter stimmen nicht überein." >&2; exit 1; }
HASH=$(ADMIN_PASSWORD="$PW" node scripts/hash-password.mts)
printf '%s' "$HASH" | npx wrangler secret put ADMIN_PASSWORD_HASH "$@"
echo "ADMIN_PASSWORD_HASH gesetzt."
