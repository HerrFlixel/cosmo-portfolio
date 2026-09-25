#!/usr/bin/env bash
# Setzt die Secrets des Kontaktformulars. Werte werden verdeckt abgefragt und nie als Argument übergeben.
# Aufruf: bash scripts/set-contact-secrets.sh                (Produktion)
#         bash scripts/set-contact-secrets.sh --env=preview  (Vorschau)
set -euo pipefail
ARGS=("$@")

ask() {
  local name="$1" prompt="$2" value
  read -r -s -p "$prompt: " value
  echo
  if [ -z "$value" ]; then
    echo "  leer, $name bleibt unverändert"
    return
  fi
  printf '%s' "$value" | npx wrangler secret put "$name" ${ARGS[@]+"${ARGS[@]}"} >/dev/null
  echo "  $name gesetzt"
}

ask RESEND_API_KEY "Resend API-Key (beginnt mit re_)"
ask TURNSTILE_SITE_KEY "Turnstile Site-Key"
ask TURNSTILE_SECRET_KEY "Turnstile Secret-Key"
ask CONTACT_EMAIL "Empfänger (bis zur Domain-Prüfung: die E-Mail deines Resend-Kontos)"
