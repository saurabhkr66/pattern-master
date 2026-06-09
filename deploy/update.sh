#!/usr/bin/env bash
#
# Deploy a new version. Run on the server (as the 'battle' user) whenever
# you push changes to GitHub:
#
#     cd ~/pattern-master && bash deploy/update.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

echo ">> Pulling latest from GitHub..."
git pull origin master

echo ">> Installing dependencies..."
npm install

echo ">> Applying any schema changes (Prisma)..."
npx prisma db push

echo ">> Building..."
npm run build

echo ">> Reloading app (zero-downtime cluster reload)..."
pm2 reload battleexam

echo ">> Done. Live."
