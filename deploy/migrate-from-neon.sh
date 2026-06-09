#!/usr/bin/env bash
#
# ONE-TIME data migration: Neon (prod) -> local Postgres on this VPS.
# Run as the 'battle' user on the VPS, AFTER setup.sh and AFTER `npm ci`:
#
#     bash deploy/migrate-from-neon.sh
#
# You'll be prompted for the Neon DIRECT (non-pooler) connection string — use
# the prod branch's direct URL (the host WITHOUT "-pooler"). The local target
# is read from DATABASE_URL in your .env.
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Load DATABASE_URL (local target) from .env without exporting secrets to logs.
LOCAL_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${LOCAL_URL:-}" ]; then
  echo "!! DATABASE_URL not found in .env — fill it in first." >&2
  exit 1
fi

read -r -p "Neon DIRECT (non-pooler) prod URL to copy FROM: " NEON_URL
if [ -z "${NEON_URL:-}" ]; then echo "!! No Neon URL given." >&2; exit 1; fi

DUMP="/tmp/neon-migration-$(date +%Y%m%d-%H%M%S).dump"

echo ">> Dumping Neon prod (custom format, no owner/privileges)..."
pg_dump "$NEON_URL" --no-owner --no-privileges -Fc -f "$DUMP"

echo ">> Restoring into local Postgres..."
# --clean --if-exists makes this re-runnable; remove if restoring into an empty db.
pg_restore --no-owner --no-privileges --clean --if-exists -d "$LOCAL_URL" "$DUMP" || true

echo ">> Confirming schema matches Prisma..."
npx prisma db push

echo ">> Row-count sanity check (local):"
psql "$LOCAL_URL" -c 'SELECT
  (SELECT count(*) FROM "Question") AS questions,
  (SELECT count(*) FROM "Pattern")  AS patterns,
  (SELECT count(*) FROM "User")     AS users;'

rm -f "$DUMP"
echo ">> Migration complete. Compare the counts above against Neon."
