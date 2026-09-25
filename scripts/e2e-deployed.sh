#!/usr/bin/env bash
# E2E gegen ein Deployment. Die Vorschau nutzt ein zufälliges Test-Passwort aus .env.e2e.local (nicht im Git).
# Aufruf: bash scripts/e2e-deployed.sh <preview|prod> [playwright-Argumente …]
set -euo pipefail
TARGET="$1"; shift
case "$TARGET" in
  preview) export PLAYWRIGHT_BASE_URL="https://cosmo-web-preview.felix-vatterodt.workers.dev" ;;
  prod)    export PLAYWRIGHT_BASE_URL="https://cosmo-web.felix-vatterodt.workers.dev" ;;
  *) echo "Ziel muss preview oder prod sein." >&2; exit 1 ;;
esac
if [ -f .env.e2e.local ]; then set -a; . ./.env.e2e.local; set +a; fi
npx playwright test "$@"
