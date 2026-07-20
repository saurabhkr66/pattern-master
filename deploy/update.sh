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
# `npm ci` below installs strictly from the committed lockfile and never
# rewrites it, so the server stays clean. But older deploys used `npm install`,
# which rewrote package-lock.json on Linux and then blocked the next pull
# ("local changes would be overwritten by merge"). Discard any such tracked
# drift before pulling so the merge is always clean. (.env etc. are gitignored
# and untouched.)
git checkout -- package-lock.json 2>/dev/null || true
git pull origin master

echo ">> Installing dependencies..."
npm ci

echo ">> Applying any schema changes (Prisma)..."
npx prisma db push

echo ">> Building..."
npm run build

echo ">> Reloading app (zero-downtime cluster reload)..."
pm2 reload battleexam

# `npm run build` above wiped .next/cache, so every sitemap is cold. Pre-warm
# them with a patient request now — otherwise Googlebot hits the cold, slow
# /sitemap/0.xml build, times out, and it stays stuck on "Couldn't fetch" in
# Search Console (see deploy/warm-sitemap.sh). Non-fatal: a failed warm must
# not fail the deploy.
echo ">> Warming sitemap ISR cache..."
sleep 5  # let the reloaded cluster workers start accepting connections
bash deploy/warm-sitemap.sh || echo "   (sitemap warm failed — non-fatal; cron will retry)"

echo ">> Done. Live."
