#!/usr/bin/env bash
#
# Warm the PAGE ISR cache. Companion to warm-sitemap.sh, which warms only the
# sitemap XML documents and never touches a single content URL.
#
# Why this exists:
#   Three things combine so that Googlebot almost never hits a warm page:
#
#     1. generateStaticParams() returns [] on every public SEO route (it is
#        there only to flip the build classification to ●), so NOTHING is
#        prebuilt and every URL renders cold on its first request.
#     2. `npm run build` in update.sh wipes .next/cache on every deploy, which
#        holds both the rendered pages and the unstable_cache data entries.
#        Every deploy returns 100% of pages to cold.
#     3. Googlebot revisits any given deep topic page on a scale of weeks, not
#        hours, so it is nearly always the one paying for the cold render.
#
#   GSC crawl stats showed average response time at 1.2s blended across all
#   requests — and since ~48% of those were redirects returning in tens of ms,
#   real HTML pages were averaging ~2.3s. Response time governs Google's crawl
#   rate, so a slow origin throttles discovery of everything else.
#
#   Raising `revalidate` to 30 days (see the note in
#   app/[examType]/[subject]/[topic]/page.tsx) means a page stays warm once
#   rendered. This script is what does that first render, on our time rather
#   than Googlebot's.
#
# SIZE OF THE JOB (measured against prod 2026-09-03):
#   462 topic roots + 33 /notes + 55 subject hubs + 8 exam hubs + 107 pyq year
#   buckets = ~665 URLs in the sitemap. At the ~2.3s/page cold-render estimate
#   and concurrency 2 that is a ~13 minute pass. Cheap.
#
#   Separately: ~1,503 /page/N pagination URLs exist and are live and
#   `index, follow`, but are deliberately NOT in the sitemap (see the long note
#   in lib/sitemap-data.ts — submitting them buried the topic roots we actually
#   want ranked). That is a decision about what to ask Google to INDEX; it says
#   nothing about warming, and Googlebot still crawls the pagination chain from
#   page 1. Set WARM_PAGINATION=1 to warm those too — it walks /page/2.. per
#   topic until a non-200, adding roughly 29 minutes. Off by default so the
#   deploy's background job stays short; worth enabling from the weekly cron.
#
# Deliberately gentle. Warming is background work that must never degrade the
# site for real users, so it runs at low concurrency against the origin. Do not
# raise WARM_CONCURRENCY above the box's vCPU count — the render is CPU-bound
# and the pm2 cluster workers serving real traffic compete for the same cores.
#
# Run by hand:
#   cd ~/pattern-master && bash deploy/warm-pages.sh
#
# Test against a small slice first:
#   WARM_LIMIT=20 bash deploy/warm-pages.sh
#
# Cron (as the 'battle' user). Weekly is enough with a 30-day revalidate — this
# is a safety net for entries evicted or missed after a deploy. The weekly run
# is the right place for WARM_PAGINATION=1: it runs in a quiet window and has
# no deploy waiting on it. Sundays 03:30:
#   30 3 * * 0 /bin/bash -lc 'WARM_PAGINATION=1 bash /home/battle/pattern-master/deploy/warm-pages.sh'
#
# NOTE: this file must be executable on the server. A .sh committed from
# Windows checks out without +x and cron's direct invocation then fails
# silently — always invoke it via `bash <path>` as above.
set -euo pipefail
cd "$(dirname "$0")/.."

# Hit the origin directly (the pm2 Next server on :3000) rather than the public
# https URL: bypasses Cloudflare + Caddy, guarantees the request reaches Next,
# and avoids any edge timeout cutting off a slow cold render. Same reasoning as
# warm-sitemap.sh.
ORIGIN="http://localhost:3000"
LOG="$HOME/warm-pages.log"

# Per-URL ceiling. A cold PYQ paper page (full questions + solutions inline) is
# the heaviest thing here; 60s is generous headroom over the ~2-3s norm while
# still capping a pathological hang.
MAXTIME="${WARM_MAXTIME:-60}"
# Concurrency. 2 leaves headroom on a 2-4 vCPU box for real traffic.
CONCURRENCY="${WARM_CONCURRENCY:-2}"
# 0 = no limit. Set WARM_LIMIT to warm only the first N URLs (testing).
LIMIT="${WARM_LIMIT:-0}"
# 1 = also warm /page/N pagination URLs (not in the sitemap; see header).
WARM_PAGINATION="${WARM_PAGINATION:-0}"
# Safety stop for the pagination walk. Deepest real topic is 20 pages; this
# only has to bound a pathological case where 200s never stop.
PAGE_CAP="${WARM_PAGE_CAP:-30}"
# Timeout for fetching the sitemaps themselves. warm-sitemap.sh should have
# made these warm already, so this only needs to cover a cache miss.
SITEMAP_MAXTIME=240

log() { echo "$(date -u +'%Y-%m-%dT%H:%M:%SZ') $*" >> "$LOG"; }

log "warm-pages start (concurrency=$CONCURRENCY limit=$LIMIT)"
echo ">> Collecting URLs from sitemaps..."

# Parse the index for its children rather than hard-coding the bucket list, so
# buckets can be added, split or retired without editing this script — same
# approach as warm-sitemap.sh.
children=$(curl -sS --max-time "$SITEMAP_MAXTIME" "$ORIGIN/sitemap.xml" \
  | grep -oE '/sitemap/[^<]+\.xml' || true)

if [ -z "$children" ]; then
  log "warm-pages ABORT — sitemap index returned no children"
  echo "   sitemap index returned no children; is the app up on $ORIGIN?" >&2
  exit 1
fi

# Collect every <loc> from every child sitemap, rewrite the public origin to
# localhost, and de-duplicate. The homepage entry has no path once the host is
# stripped, so map the empty string back to "/".
paths=$(
  for c in $children; do
    curl -sS --max-time "$SITEMAP_MAXTIME" "$ORIGIN$c" || true
  done \
    | grep -oE '<loc>[^<]+</loc>' \
    | sed -E 's|</?loc>||g' \
    | sed -E 's|^https://(www\.)?battleexam\.com||' \
    | sed -E 's|^$|/|' \
    | grep -E '^/' \
    | sort -u
)

total=$(printf '%s\n' "$paths" | grep -c . || true)
if [ "$total" -eq 0 ]; then
  log "warm-pages ABORT — no page URLs found in child sitemaps"
  echo "   no page URLs found in child sitemaps" >&2
  exit 1
fi

if [ "$LIMIT" -gt 0 ]; then
  paths=$(printf '%s\n' "$paths" | head -n "$LIMIT")
  total=$(printf '%s\n' "$paths" | grep -c . || true)
fi

log "collected $total URLs"
echo ">> Warming $total pages at concurrency $CONCURRENCY (this takes a while)..."

export ORIGIN MAXTIME LOG

# xargs rather than a serial loop so the box stays busy without us hand-rolling
# job control. -I{} implies -L1, so each worker takes exactly one URL.
# `|| true` on the whole pipeline: an individual URL failing (a 404 from a
# stale sitemap entry, a timeout under load) must not abort the run, and
# set -e would otherwise kill it on the first non-zero exit.
printf '%s\n' "$paths" | xargs -P "$CONCURRENCY" -I{} bash -c '
  path="$1"
  if out=$(curl -sS --max-time "$MAXTIME" -o /dev/null \
      -w "%{http_code} %{time_total}s" "$ORIGIN$path" 2>&1); then
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") warm $path -> $out" >> "$LOG"
  else
    echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") warm $path FAILED -> $out" >> "$LOG"
  fi
' _ {} || true

# Optional second pass: the /page/N chain, which the sitemap does not list.
# Walk upward per topic until a non-200 rather than querying the DB for
# question counts — the script stays a pure HTTP client with no Prisma
# dependency, and a topic that gains or loses questions needs no change here.
if [ "$WARM_PAGINATION" = "1" ]; then
  # Topic roots are exactly three path segments. `/exam/pyq/2024` also has
  # three, so exclude anything whose second segment is "pyq"; /notes and the
  # hubs are filtered out by the segment count itself.
  roots=$(printf '%s\n' "$paths" \
    | grep -E '^/[^/]+/[^/]+/[^/]+$' \
    | grep -vE '^/[^/]+/pyq/' || true)
  rootcount=$(printf '%s\n' "$roots" | grep -c . || true)

  log "pagination pass over $rootcount topic roots (cap $PAGE_CAP)"
  echo ">> Warming /page/N chains for $rootcount topics..."

  export PAGE_CAP
  printf '%s\n' "$roots" | xargs -P "$CONCURRENCY" -I{} bash -c '
    root="$1"
    n=2
    while [ "$n" -le "$PAGE_CAP" ]; do
      code=$(curl -sS --max-time "$MAXTIME" -o /dev/null \
        -w "%{http_code}" "$ORIGIN$root/page/$n" 2>/dev/null || echo 000)
      echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") warm $root/page/$n -> $code" >> "$LOG"
      # Stop at the first non-200: that is the end of this topic pagination
      # (the route notFound()s past the last page), not an error.
      [ "$code" = "200" ] || break
      n=$((n + 1))
    done
  ' _ {} || true
fi

# `grep -c` prints "0" and exits 1 when there are no matches, so `|| true` —
# NOT `|| echo 0`, which would append a second line and print "0 0".
failed=0
if [ -f "$LOG" ]; then
  failed=$(grep -c "FAILED" "$LOG" 2>/dev/null || true)
fi

log "warm-pages done ($total URLs attempted)"
echo ">> Done. $total URLs warmed. Log: $LOG"
echo "   (cumulative FAILED lines in log: $failed)"
