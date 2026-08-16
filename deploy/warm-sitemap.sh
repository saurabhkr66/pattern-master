#!/usr/bin/env bash
#
# Warm the sitemap ISR cache with a PATIENT request, so Googlebot never has to
# trigger a cold generation.
#
# Why this exists:
#   /sitemap/0.xml runs two full-table groupBy scans (per-topic lastmod + count
#   over the whole GeneratedQuestion and PYQ tables — see lib/sitemap-data.ts).
#   On the 2-vCPU box a cold generation is slow enough that Googlebot gives up
#   before it finishes — and because the response never completes, Next never
#   caches it. No human ever visits /sitemap/0.xml to warm it, so it stays cold
#   forever and Search Console is stuck on "Couldn't fetch" / 0 discovered pages.
#
#   A patient curl (long --max-time) waits for the cold build to finish, which
#   populates Next's on-disk ISR cache (shared across the pm2 cluster workers).
#   After that, stale-while-revalidate serves Googlebot instantly and refreshes
#   in the background — so this only has to succeed once per cold cache.
#
#   `npm run build` in update.sh wipes .next/cache every deploy, so update.sh
#   calls this at the end. It's also safe to run periodically from cron.
#
# Run by hand to test:
#   cd ~/pattern-master && bash deploy/warm-sitemap.sh
#
# Cron (as the 'battle' user). Use a login shell (-l) so curl/coreutils resolve
# the same as an interactive shell. Daily at 02:30 server time:
#   30 2 * * * /bin/bash -lc '/home/battle/pattern-master/deploy/warm-sitemap.sh'
#
set -euo pipefail
cd "$(dirname "$0")/.."

# Hit the origin directly (the pm2 Next server on :3000) rather than the public
# https URL: this bypasses Cloudflare + Caddy, guarantees the request reaches
# Next, and avoids any edge/proxy timeout cutting off a slow cold build.
ORIGIN="http://localhost:3000"
LOG="$HOME/warm-sitemap.log"
# Generous ceiling so a cold groupBy on a loaded box still finishes.
MAXTIME=240

log() { echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') $*" >> "$LOG"; }

warm() {
  local path="$1"
  local out
  if out=$(curl -sS --max-time "$MAXTIME" -o /dev/null \
      -w 'HTTP %{http_code} in %{time_total}s' "$ORIGIN$path" 2>&1); then
    log "warm $path -> $out"
  else
    log "warm $path FAILED -> $out"
  fi
}

log "warm-sitemap start"

# Warm the index first, then every child sitemap it lists. Parsing the index
# (rather than a hard-coded list) means the set of children can change — buckets
# added, split into numbered chunks, or retired, as the mock-N bucket was — and
# they still get warmed correctly without editing this script.
warm "/sitemap.xml"
children=$(curl -sS --max-time "$MAXTIME" "$ORIGIN/sitemap.xml" \
  | grep -oE '/sitemap/[^<]+\.xml' || true)

for c in $children; do
  warm "$c"
done

log "warm-sitemap done"
