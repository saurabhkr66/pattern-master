#!/usr/bin/env bash
#
# Nightly database backup: pg_dump -> gzip -> Cloudflare R2.
# Runs from cron as the 'battle' user. Set up the R2 remote first (see
# deploy/r2-and-cron.md), then add the crontab line from that doc.
#
# A backup on the same disk as the database is worthless — this ships it OFF
# the box to R2. 30-day retention is handled by an R2 lifecycle rule (see doc),
# so this script just creates + uploads.
#
set -euo pipefail
cd "$(dirname "$0")/.."

# --- Config (override via env if needed) ---
# Backups share the app's R2 bucket (battle-exam) under a backups/ prefix, kept
# separate from the answers/ prefix the app writes. Distinct var name so it never
# clashes with the app's R2_BUCKET that may be exported from .env.
R2_REMOTE="${R2_REMOTE:-r2}"                          # rclone remote name
R2_BACKUP_BUCKET="${R2_BACKUP_BUCKET:-battle-exam}"   # shared R2 bucket
R2_BACKUP_PREFIX="${R2_BACKUP_PREFIX:-backups}"       # folder inside the bucket
LOG="/home/battle/backup.log"

LOCAL_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${LOCAL_URL:-}" ]; then
  echo "$(date -Is) ERROR: DATABASE_URL not found in .env" >>"$LOG"
  exit 1
fi
# Strip Prisma-only query params (?schema, &connection_limit) for pg_dump (libpq).
LOCAL_PG="${LOCAL_URL%%\?*}"

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/tmp/battleexam-${STAMP}.sql.gz"

echo "$(date -Is) starting backup -> ${FILE}" >>"$LOG"
pg_dump "$LOCAL_PG" | gzip -9 >"$FILE"

echo "$(date -Is) uploading to ${R2_REMOTE}:${R2_BACKUP_BUCKET}/${R2_BACKUP_PREFIX}/" >>"$LOG"
rclone copy "$FILE" "${R2_REMOTE}:${R2_BACKUP_BUCKET}/${R2_BACKUP_PREFIX}/" >>"$LOG" 2>&1

SIZE="$(du -h "$FILE" | cut -f1)"
rm -f "$FILE"
echo "$(date -Is) backup OK (${SIZE} uploaded)" >>"$LOG"
