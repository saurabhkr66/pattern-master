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
# Purge the Cloudflare edge cache.
#
# MUST run on every deploy, and it is a correctness fix, not an optimisation.
# The Cache Rule for the public content paths uses "Ignore cache-control header
# and use this TTL", so Cloudflare holds HTML for the full edge TTL no matter
# what the origin says — revalidateTag() and ISR regeneration are invisible to
# it. Nothing else in this repo talks to the Cloudflare API, so without this
# the edge simply never learns a deploy happened.
#
# The dangerous case is not stale text, it is stale CHUNK REFERENCES: `npm run
# build` above wiped .next and emitted freshly hashed filenames, so month-old
# cached HTML points at /_next/static/chunks/<old-hash>.js files that no longer
# exist on disk. A visitor served that HTML gets a white screen — the same
# stale-chunk crash the service worker was deliberately made non-caching to
# avoid. Edge TTL sets how long that window lasts, so raising the TTL without
# this purge scales the exposure directly.
#
# Runs before the warm passes on purpose: serving broken HTML is worse than
# serving a cold page, so correctness first, speed second.
#
# Needs CF_ZONE_ID + CF_API_TOKEN in the environment (token scope: Zone →
# Cache Purge). Non-fatal and skipped when unset, so a box without the
# credentials still deploys — it just keeps the old edge cache.
if [ -n "${CF_ZONE_ID:-}" ] && [ -n "${CF_API_TOKEN:-}" ]; then
  echo ">> Purging Cloudflare edge cache..."
  curl -sS -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data '{"purge_everything":true}' \
    | grep -q '"success":true' \
    && echo "   (purged)" \
    || echo "   (Cloudflare purge FAILED — edge may serve pre-deploy HTML for up to the edge TTL)"
else
  echo ">> Skipping Cloudflare purge (CF_ZONE_ID/CF_API_TOKEN not set)."
  echo "   WARNING: the edge will keep serving pre-deploy HTML, including dead"
  echo "   /_next/static chunk references, until the edge TTL expires."
fi

echo ">> Warming sitemap ISR cache..."
sleep 5  # let the reloaded cluster workers start accepting connections
bash deploy/warm-sitemap.sh || echo "   (sitemap warm failed — non-fatal; cron will retry)"

# The build also wiped every rendered PAGE, and nothing is prebuilt
# (generateStaticParams returns [] on all public SEO routes), so the whole
# content surface is cold too. Left alone, Googlebot is the one that pays for
# each cold render — which is what pinned average crawl response time at ~2.3s
# for HTML. Warm them ourselves instead.
#
# Detached, unlike the sitemap warm: ~665 sitemap URLs at concurrency 2 is a
# ~13 minute pass, and the deploy must not block on it. The site is already
# live and serving at this point — this only decides whether the first visitor
# to each page waits, or we did.
echo ">> Warming page ISR cache in the background..."
nohup bash deploy/warm-pages.sh >/dev/null 2>&1 &
echo "   (running detached — follow with: tail -f ~/warm-pages.log)"

echo ">> Done. Live."
