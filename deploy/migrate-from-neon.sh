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
# Strip Prisma-only query params (?schema, &connection_limit) — the libpq tools
# (pg_restore/psql) reject them with "invalid URI query parameter".
LOCAL_PG="${LOCAL_URL%%\?*}"

read -r -p "Neon DIRECT (non-pooler) prod URL to copy FROM: " NEON_URL
if [ -z "${NEON_URL:-}" ]; then echo "!! No Neon URL given." >&2; exit 1; fi

DUMP="/tmp/neon-migration-$(date +%Y%m%d-%H%M%S).dump"

echo ">> Dumping Neon prod (custom format, no owner/privileges)..."
pg_dump "$NEON_URL" --no-owner --no-privileges -Fc -f "$DUMP"

echo ">> Restoring into local Postgres..."
# The dump carries the full Neon schema + data, so we do NOT run `prisma db push`
# (it can't recreate some defaults from scratch and isn't needed here).
# --clean --if-exists makes this re-runnable. Errors on missing extensions are
# non-fatal (|| true); the row counts below are the real success check.
pg_restore --no-owner --no-privileges --clean --if-exists -d "$LOCAL_PG" "$DUMP" || true

echo ">> Row-count sanity check (local):"
psql "$LOCAL_PG" -c 'SELECT
  (SELECT count(*) FROM "Pattern")           AS patterns,
  (SELECT count(*) FROM "PYQ")               AS pyqs,
  (SELECT count(*) FROM "GeneratedQuestion") AS generated_q,
  (SELECT count(*) FROM "User")              AS users,
  (SELECT count(*) FROM "Attempt")           AS attempts;'

rm -f "$DUMP"
echo ">> Migration complete. Compare the counts above against Neon."
