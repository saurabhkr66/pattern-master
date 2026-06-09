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
R2_REMOTE="${R2_REMOTE:-r2}"                       # rclone remote name
R2_BUCKET="${R2_BUCKET:-battleexam-backups}"       # R2 bucket
LOG="/home/battle/backup.log"

LOCAL_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')"
if [ -z "${LOCAL_URL:-}" ]; then
  echo "$(date -Is) ERROR: DATABASE_URL not found in .env" >>"$LOG"
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="/tmp/battleexam-${STAMP}.sql.gz"

echo "$(date -Is) starting backup -> ${FILE}" >>"$LOG"
pg_dump "$LOCAL_URL" | gzip -9 >"$FILE"

echo "$(date -Is) uploading to ${R2_REMOTE}:${R2_BUCKET}/" >>"$LOG"
rclone copy "$FILE" "${R2_REMOTE}:${R2_BUCKET}/" >>"$LOG" 2>&1

SIZE="$(du -h "$FILE" | cut -f1)"
rm -f "$FILE"
echo "$(date -Is) backup OK (${SIZE} uploaded)" >>"$LOG"
