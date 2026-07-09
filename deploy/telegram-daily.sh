#!/usr/bin/env bash
#
# Daily Telegram PYQ poster — posts one question into each exam Topic.
#
# Run by hand to test:
#   cd ~/pattern-master && bash deploy/telegram-daily.sh
#
# Cron (as the 'battle' user). Use a login shell (-l) so node/npx (nvm) are on
# PATH, which a bare cron environment lacks. Posts daily at 09:00 IST (03:30 UTC):
#   30 3 * * * /bin/bash -lc '/home/battle/pattern-master/deploy/telegram-daily.sh'
#
set -euo pipefail
cd "$(dirname "$0")/.."

# DB_DRIVER=standard → use the VPS's local Postgres (long-lived TCP), same as
# the app. .env supplies DATABASE_URL + the Telegram token/chat id.
DB_DRIVER=standard npx tsx --env-file=.env scripts/telegram/postDaily.ts \
  >> "$HOME/telegram-post.log" 2>&1

echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') telegram-daily.sh finished" >> "$HOME/telegram-post.log"
