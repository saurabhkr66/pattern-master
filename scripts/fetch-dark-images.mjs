// Download every image flagged by scripts/audit-dark-images.mjs into a local
// folder for eyeballing, plus an index.html contact sheet.
//
// The audit can only say "this is N% black" — whether that's a destroyed scan,
// an inverted-but-readable figure, or a legitimately dark diagram is a judgement
// call that needs human eyes. This makes that pass cheap.
//
// Usage:  node scripts/fetch-dark-images.mjs [--out=dark-images-preview] [--width=600]
//
// Reads scripts/dark-images.json. Files are named by rank so a plain
// sort-by-name in any file browser shows the worst offenders first.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const OUT = argv.out ?? "dark-images-preview";
const WIDTH = Number(argv.width ?? 600);
const CONCURRENCY = 8;

const report = JSON.parse(readFileSync(path.join("scripts", "dark-images.json"), "utf8"));
const images = report.images ?? [];
if (images.length === 0) {
  console.error("No images in scripts/dark-images.json — run audit-dark-images.mjs first.");
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const safe = (s) => s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

const items = images.map((img, i) => ({
  ...img,
  rank: i + 1,
  file: `${String(i + 1).padStart(3, "0")}_${String(Math.round(img.ratio * 1000)).padStart(4, "0")}permille_${safe(img.ref)}.png`,
}));

async function runPool(list, worker, concurrency) {
  const queue = list.slice();
  let done = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      await worker(queue.shift());
      done++;
      if (done % 10 === 0) process.stdout.write(`\r  fetched ${done}/${list.length}...`);
    }
  }));
  process.stdout.write(`\r  fetched ${done}/${list.length}.    \n`);
}

console.log(`\nDownloading ${items.length} flagged images to ${OUT}/ ...`);

await runPool(items, async (it) => {
  // Ask for a viewable size, and PNG so transparency renders predictably.
  const url = `${it.url.split("?")[0]}?tr=w-${WIDTH},c-at_max,f-png`;
  try {
    const res = await fetch(url);
    if (!res.ok) { it.error = `HTTP ${res.status}`; return; }
    writeFileSync(path.join(OUT, it.file), Buffer.from(await res.arrayBuffer()));
  } catch (e) {
    it.error = e.message;
  }
}, CONCURRENCY);

const failed = items.filter((i) => i.error);

// Contact sheet — the actual review surface. Checkerboard behind each tile so a
// transparent background is visually distinct from a white one, which matters
// when the question is "is this image actually dark?".
const rows = items.map((it) => `
  <figure class="card${it.error ? " err" : ""}">
    <div class="thumb">${it.error
      ? `<div class="fail">${it.error}</div>`
      : `<img loading="lazy" src="./${it.file}" alt="">`}</div>
    <figcaption>
      <div class="pct">${(it.ratio * 100).toFixed(1)}% black</div>
      <div class="ref" title="${it.ref}">#${it.rank} · ${it.ref}</div>
      <div class="meta">${it.width}×${it.height} · ${it.rows.length} ref${it.rows.length > 1 ? "s" : ""} · ${[...new Set(it.rows.map((r) => r.model))].join(", ")}</div>
      <a href="${it.url}" target="_blank" rel="noopener">open original</a>
    </figcaption>
  </figure>`).join("");

writeFileSync(path.join(OUT, "index.html"), `<!doctype html>
<html><head><meta charset="utf-8"><title>Dark image review (${items.length})</title>
<style>
  :root { color-scheme: light dark; }
  body { font: 14px/1.4 system-ui, sans-serif; margin: 24px; background: #fafafa; color: #111; }
  @media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { opacity: .65; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
  .card { margin: 0; border: 1px solid #8883; border-radius: 10px; overflow: hidden; background: #fff2; }
  .card.err { opacity: .6; }
  .thumb {
    height: 220px; display: flex; align-items: center; justify-content: center; padding: 8px;
    /* checkerboard: transparent vs white is the difference between a bug and not */
    background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 16px 16px; background-position: 0 0, 0 8px, 8px -8px, -8px 0; background-color: #fff;
  }
  .thumb img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .fail { font-weight: 700; color: #c00; }
  figcaption { padding: 8px 10px 10px; font-size: 12px; }
  .pct { font-weight: 800; }
  .ref { opacity: .8; word-break: break-all; margin: 2px 0; }
  .meta { opacity: .55; font-size: 11px; }
  a { font-size: 11px; }
</style></head>
<body>
  <h1>Dark image review — ${items.length} flagged</h1>
  <div class="sub">
    Over ${(report.summary.minRatio * 100).toFixed(0)}% of pixels at luma ≤ ${report.summary.lumaCutoff},
    out of ${report.summary.distinctAnalysed.toLocaleString()} analysed. Sorted worst first.
    ${failed.length ? `${failed.length} failed to download.` : ""}
  </div>
  <div class="grid">${rows}</div>
</body></html>
`);

console.log(`\n  ${items.length - failed.length} downloaded, ${failed.length} failed.`);
console.log(`\nOpen ${path.join(OUT, "index.html")} in a browser to review them all at once.`);
