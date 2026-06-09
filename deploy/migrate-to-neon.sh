#!/usr/bin/env bash
#
# REVERSE migration: local Postgres on this VPS -> Neon. Use this when switching
# back to Neon + Vercel. Run as the 'battle' user on the VPS:
#
#     bash deploy/migrate-to-neon.sh
#
# Mirror of migrate-from-neon.sh (source/target swapped). After this, set
# DB_DRIVER=neon-http and repoint DATABASE_URL/DIRECT_URL at Neon, then move
# traffic (DNS) back to Vercel. No code changes required.
#
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${LOCAL_URL:-}" ]; then
  echo "!! DATABASE_URL (local source) not found in .env." >&2
  exit 1
fi

read -r -p "Neon DIRECT (non-pooler) URL to copy TO: " NEON_URL
if [ -z "${NEON_URL:-}" ]; then echo "!! No Neon URL given." >&2; exit 1; fi

DUMP="/tmp/vps-to-neon-$(date +%Y%m%d-%H%M%S).dump"

echo ">> Dumping local Postgres..."
pg_dump "$LOCAL_URL" --no-owner --no-privileges -Fc -f "$DUMP"

echo ">> Restoring into Neon..."
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NEON_URL" "$DUMP" || true

echo ">> Row-count sanity check (Neon):"
psql "$NEON_URL" -c 'SELECT
  (SELECT count(*) FROM "Question") AS questions,
  (SELECT count(*) FROM "Pattern")  AS patterns,
  (SELECT count(*) FROM "User")     AS users;'

rm -f "$DUMP"
echo ">> Reverse migration complete. Now set DB_DRIVER=neon-http + Neon URLs and repoint DNS."
