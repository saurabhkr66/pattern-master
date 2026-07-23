/**
 * seo-index-audit.ts — read-only smoke test for "Crawled - currently not indexed".
 *
 * Fetches your LIVE site (no DB/tunnel needed) and, for a sample of real URLs
 * pulled from the live sitemap, reports the three signals that actually cause
 * Google to crawl-but-not-index:
 *   1. status / redirect   — is the URL a clean 200, or a redirect/4xx/5xx?
 *   2. canonical           — what <link rel="canonical"> does the page emit,
 *                            and does its host match the host we requested?
 *                            (this is the www-vs-apex trap the code can't show)
 *   3. robots noindex      — is a noindex meta / X-Robots-Tag leaking onto a
 *                            page that's supposed to be indexable?
 *
 * It also does a dedicated host-canonicalisation check: does www.<host>/ 301 to
 * the apex (or vice-versa)? A missing redirect there is a top suspect.
 *
 * Read-only. Hits public URLs only. Safe to run against production.
 *
 *   npx tsx scripts/seo-index-audit.ts                       # audits https://battleexam.com
 *   npx tsx scripts/seo-index-audit.ts https://www.battleexam.com
 *   npx tsx scripts/seo-index-audit.ts http://localhost:3000 --sample 40
 *
 * Output: grouped console summary + scripts/seo-index-audit.csv
 */
import fs from "fs";
import path from "path";

const argv = process.argv.slice(2);
const BASE = (argv.find((a) => a.startsWith("http")) ?? "https://battleexam.com").replace(/\/$/, "");
const sampleFlagIdx = argv.indexOf("--sample");
const SAMPLE = sampleFlagIdx !== -1 ? parseInt(argv[sampleFlagIdx + 1], 10) || 30 : 30;

const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html) seo-index-audit";

interface Row {
  url: string;
  status: number | string;
  finalUrl: string;
  redirect: string; // Location on a 3xx, else ""
  canonical: string;
  canonicalHostOk: boolean | "-";
  noindex: boolean | "-";
  note: string;
}

const rows: Row[] = [];

function hostOf(u: string): string {
  try {
    return new URL(u).host;
  } catch {
    return "";
  }
}

async function fetchRaw(url: string): Promise<Response | null> {
  try {
    return await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
    });
  } catch (e) {
    rows.push({
      url,
      status: "FETCH_ERR",
      finalUrl: url,
      redirect: "",
      canonical: "",
      canonicalHostOk: "-",
      noindex: "-",
      note: String((e as Error).message).slice(0, 80),
    });
    return null;
  }
}

// Pull <loc> values out of an XML sitemap / sitemap-index.
function extractLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function extractCanonical(html: string): string {
  // rel + href in either order
  const m =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
  return m ? m[1].trim() : "";
}

function extractNoindex(html: string, headers: Headers): boolean {
  const xr = headers.get("x-robots-tag");
  if (xr && /noindex/i.test(xr)) return true;
  // <meta name="robots" ... content="...noindex...">
  const metas = [...html.matchAll(/<meta[^>]+name=["']robots["'][^>]*>/gi)].map((m) => m[0]);
  return metas.some((tag) => /content=["'][^"']*noindex/i.test(tag));
}

async function auditUrl(url: string): Promise<void> {
  const res = await fetchRaw(url);
  if (!res) return;

  const status = res.status;
  const location = res.headers.get("location") ?? "";

  if (status >= 300 && status < 400) {
    const reqHost = hostOf(url);
    const locHost = hostOf(new URL(location, url).href);
    rows.push({
      url,
      status,
      finalUrl: location,
      redirect: location,
      canonical: "",
      canonicalHostOk: "-",
      noindex: "-",
      note:
        reqHost && locHost && reqHost !== locHost
          ? `host redirect ${reqHost} → ${locHost}`
          : "redirect",
    });
    return;
  }

  if (status !== 200) {
    rows.push({
      url,
      status,
      finalUrl: url,
      redirect: "",
      canonical: "",
      canonicalHostOk: "-",
      noindex: "-",
      note: "non-200",
    });
    return;
  }

  const html = await res.text();
  const canonical = extractCanonical(html);
  const noindex = extractNoindex(html, res.headers);
  const canonicalHostOk = canonical ? hostOf(canonical) === hostOf(url) : false;

  const notes: string[] = [];
  if (!canonical) notes.push("NO canonical tag");
  else if (!canonicalHostOk) notes.push(`canonical host ${hostOf(canonical)} ≠ requested ${hostOf(url)}`);
  if (noindex) notes.push("NOINDEX present");
  if (html.length < 2000) notes.push(`thin HTML (${html.length}b)`);

  rows.push({
    url,
    status,
    finalUrl: url,
    redirect: "",
    canonical,
    canonicalHostOk,
    noindex,
    note: notes.join("; "),
  });
}

// Sample URLs from the live sitemap: index → children → topic URLs.
async function collectSampleUrls(): Promise<string[]> {
  const out = new Set<string>([BASE + "/"]);

  const idxRes = await fetchRaw(`${BASE}/sitemap.xml`);
  if (!idxRes || idxRes.status !== 200) {
    console.warn(`  ! /sitemap.xml returned ${idxRes?.status ?? "error"} — falling back to homepage only`);
    return [...out];
  }
  const idxXml = await idxRes.text();
  const childSitemaps = extractLocs(idxXml);
  console.log(`  sitemap index lists ${childSitemaps.length} child sitemap(s)`);

  // Prefer the "topics" child (the pages with indexing trouble); fall back to "0".
  const preferred =
    childSitemaps.find((s) => /\/topics\.xml$/.test(s)) ??
    childSitemaps.find((s) => /\/0\.xml$/.test(s)) ??
    childSitemaps[0];

  for (const child of [preferred, ...childSitemaps.filter((c) => c !== preferred)]) {
    if (out.size >= SAMPLE) break;
    if (!child) continue;
    const cRes = await fetchRaw(child);
    if (!cRes || cRes.status !== 200) continue;
    const locs = extractLocs(await cRes.text());
    // Evenly sample across the child so we don't only test the first N.
    const step = Math.max(1, Math.floor(locs.length / SAMPLE));
    for (let i = 0; i < locs.length && out.size < SAMPLE; i += step) out.add(locs[i]);
  }

  return [...out];
}

async function hostCanonicalisationCheck(): Promise<void> {
  const u = new URL(BASE);
  const isWww = u.host.startsWith("www.");
  const other = isWww
    ? `${u.protocol}//${u.host.replace(/^www\./, "")}/`
    : `${u.protocol}//www.${u.host}/`;

  console.log(`\n── Host canonicalisation ─────────────────────────────`);
  console.log(`  Checking that the non-canonical host 301s to the canonical one.`);
  const res = await fetchRaw(other);
  if (!res) {
    console.log(`  ${other}  →  FETCH ERROR`);
    return;
  }
  const loc = res.headers.get("location") ?? "";
  const is301 = res.status === 301 || res.status === 308;
  const landsOnBase = loc && hostOf(new URL(loc, other).href) === u.host;
  const verdict = is301 && landsOnBase ? "✅ OK" : "⚠️  PROBLEM";
  console.log(`  ${other}  →  ${res.status} ${loc || "(no Location)"}   ${verdict}`);
  if (!(is301 && landsOnBase)) {
    console.log(
      `  ↳ ${other} does not permanently redirect to ${u.host}. If both hosts serve\n` +
        `    200s, Google sees duplicate content and may defer indexing. Add a\n` +
        `    host-level 301 (Netlify redirect / DNS) to your canonical host.`,
    );
  }
}

async function main() {
  console.log(`\nSEO index audit → ${BASE}  (sample ${SAMPLE})\n`);
  console.log(`── Collecting sample URLs from live sitemap ──────────`);
  const urls = await collectSampleUrls();
  console.log(`  auditing ${urls.length} URL(s)\n`);

  console.log(`── Per-URL results ───────────────────────────────────`);
  // Small concurrency so we don't hammer the origin.
  const CONC = 5;
  for (let i = 0; i < urls.length; i += CONC) {
    await Promise.all(urls.slice(i, i + CONC).map(auditUrl));
  }

  // Sort: problems first.
  const problems = rows.filter((r) => r.note && !/^redirect$/.test(r.note));
  const clean = rows.filter((r) => !r.note || /^redirect$/.test(r.note));

  for (const r of [...problems, ...clean]) {
    const flag = problems.includes(r) ? "⚠️ " : "   ";
    console.log(`${flag}[${r.status}] ${r.url}`);
    if (r.note) console.log(`      ${r.note}`);
    if (r.canonical && r.status === 200) console.log(`      canonical: ${r.canonical}`);
  }

  await hostCanonicalisationCheck();

  // CSV
  const csvPath = path.join(process.cwd(), "scripts", "seo-index-audit.csv");
  const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
  const header = "url,status,redirect,canonical,canonicalHostOk,noindex,note";
  const body = rows
    .map((r) =>
      [r.url, r.status, r.redirect, r.canonical, r.canonicalHostOk, r.noindex, r.note].map(esc).join(","),
    )
    .join("\n");
  fs.writeFileSync(csvPath, `${header}\n${body}\n`, "utf8");

  console.log(`\n── Summary ───────────────────────────────────────────`);
  console.log(`  total audited : ${rows.length}`);
  console.log(`  clean 200s    : ${rows.filter((r) => r.status === 200 && !r.note).length}`);
  console.log(`  redirects     : ${rows.filter((r) => typeof r.status === "number" && r.status >= 300 && r.status < 400).length}`);
  console.log(`  noindex leaks : ${rows.filter((r) => r.noindex === true).length}`);
  console.log(`  canonical host mismatch : ${rows.filter((r) => r.canonicalHostOk === false && r.status === 200).length}`);
  console.log(`  missing canonical       : ${rows.filter((r) => r.status === 200 && !r.canonical).length}`);
  console.log(`\n  CSV → ${csvPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
