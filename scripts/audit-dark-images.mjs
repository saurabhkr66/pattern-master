// Flag question images that are mostly black — i.e. inverted / dark-mode scans
// that render as a black slab (and are near-invisible in dark theme).
//
// Covers the same three image sources as the other audits: PYQ.images,
// GeneratedQuestion.images, and MockTestTemplate.questions[].images. Read-only —
// it never writes to the DB. URL resolution is ported from lib/imageUtils.ts,
// same as scripts/audit-imagekit-images.js and scripts/audit-mock-images.mjs.
//
// Usage (through the SSH tunnel to the VPS, which is where prod data lives):
//   DB_DRIVER=standard node --env-file=.env scripts/audit-dark-images.mjs
//
// Flags:
//   --min=0.30      flag images whose black-pixel ratio exceeds this (default 0.30)
//   --luma=40       a pixel counts as "black" at or below this luma, 0-255 (default 40)
//   --sample=200    analyse at this max dimension; ImageKit downscales server-side
//   --limit=N       only check the first N distinct images (quick trial run)
//   --concurrency=8 parallel downloads
//   --all           write every image's ratio to the CSV, not just flagged ones
//
// Output: console list ranked by ratio + scripts/dark-images.csv / .json.

import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n✖ DATABASE_URL not set. Run with: node --env-file=.env ...\n");
  process.exit(1);
}

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const MIN_RATIO = Number(argv.min ?? 0.30);
const LUMA_CUTOFF = Number(argv.luma ?? 40);
const SAMPLE = Number(argv.sample ?? 200);
const CONCURRENCY = Number(argv.concurrency ?? 8);
const LIMIT = argv.limit ? Number(argv.limit) : Infinity;
const WRITE_ALL = Boolean(argv.all);

// Follow DB_DRIVER like lib/prisma.ts: "standard" = plain TCP (VPS via tunnel),
// otherwise the Neon HTTP adapter. Without this the audit reads the wrong DB.
const driver = process.env.DB_DRIVER ?? "neon-http";
const prisma = driver === "standard"
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}) });

const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const IMAGEKIT_TRANSFORMS = "f-auto,q-auto";

// --- resolution, ported from lib/imageUtils.ts -----------------------------
function sanitizeIkPath(p) {
  return p.split("/").map((seg) => seg.replace(/ /g, "_").replace(/%20/g, "_")).join("/");
}

function cloudinaryToImagekitPath(cloudinaryUrl) {
  const match = cloudinaryUrl.match(/\/image\/upload\/(.+)$/);
  if (!match) return null;
  const segments = decodeURIComponent(match[1]).split("/");
  let i = 0;
  while (i < segments.length - 1 && (/^v\d+$/.test(segments[i]) || segments[i].includes(","))) i++;
  return sanitizeIkPath(segments.slice(i).join("/"));
}

function getImageUrl(dbPath) {
  if (!dbPath) return "";
  if (dbPath.startsWith("data:")) return dbPath;
  if (dbPath.startsWith("http://") || dbPath.startsWith("https://")) {
    if (ENDPOINT && dbPath.includes("res.cloudinary.com")) {
      const p = cloudinaryToImagekitPath(dbPath);
      if (p) return `${ENDPOINT}/${p}?tr=${IMAGEKIT_TRANSFORMS}`;
    }
    return dbPath;
  }
  let cleanPath = dbPath.replace(/^\/+/, "").replace(/&/g, "and");
  if (cleanPath.startsWith("images/questions/")) {
    cleanPath = cleanPath.replace("images/questions/", "");
  }
  cleanPath = sanitizeIkPath(cleanPath);
  if (!ENDPOINT) return `/${cleanPath}`;
  return `${ENDPOINT}/pattern-master/${cleanPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}

/**
 * Ask ImageKit for a small PNG instead of the original. Analysing a downscaled
 * copy costs a fraction of the bandwidth and decode time, and a black-pixel
 * RATIO is unaffected by resolution. Non-ImageKit URLs are fetched as-is.
 */
function analysisUrl(resolved) {
  if (!ENDPOINT || !resolved.startsWith(ENDPOINT)) return resolved;
  const base = resolved.split("?")[0];
  return `${base}?tr=w-${SAMPLE},h-${SAMPLE},c-at_max,f-png`;
}

// Mock/PYQ/Generated all store images as [{ index, filename, type? }]. Take
// filename/url/src/path ONLY — never arbitrary fields like `type`, which would
// surface "explanation"/"question" as fake paths.
function extractRefs(imagesJson) {
  if (!imagesJson) return [];
  if (typeof imagesJson === "string") return [imagesJson];
  const pick = (x) => {
    if (typeof x === "string") return [x];
    if (x && typeof x === "object") {
      const ref = x.filename || x.url || x.src || x.path;
      return typeof ref === "string" ? [ref] : [];
    }
    return [];
  };
  return Array.isArray(imagesJson) ? imagesJson.flatMap(pick) : pick(imagesJson);
}

async function runPool(items, worker, concurrency) {
  const queue = items.slice();
  let processed = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      await worker(queue.shift());
      processed++;
      if (processed % 25 === 0) process.stdout.write(`\r  analysed ${processed}/${items.length}...`);
    }
  }));
  process.stdout.write(`\r  analysed ${processed}/${items.length}.    \n`);
}

/**
 * Fraction of pixels that are near-black.
 *
 * Transparency is flattened onto WHITE first. Diagram PNGs are routinely
 * transparent-background line art, and a transparent pixel decodes as RGB
 * (0,0,0) — without flattening, every one of them would score as a 100% black
 * image. Flattening reproduces what the reader actually sees on the light card.
 */
async function blackRatio(buf) {
  const { data, info } = await sharp(buf, { animated: false })
    .flatten({ background: "#ffffff" })
    .resize(SAMPLE, SAMPLE, { fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const total = info.width * info.height;
  let black = 0;
  for (let i = 0; i < data.length; i += channels) {
    // Rec. 709 luma — matches perceived brightness better than a flat average,
    // so a saturated-blue background isn't mistaken for black.
    const luma = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (luma <= LUMA_CUTOFF) black++;
  }
  return { ratio: black / total, width: info.width, height: info.height };
}

async function fetchBytes(u) {
  const res = await fetch(u, { cache: "no-store" });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return { buf: Buffer.from(await res.arrayBuffer()) };
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

(async () => {
  if (!ENDPOINT) {
    console.error("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT not set — cannot resolve ImageKit URLs.");
    process.exit(1);
  }

  console.log(`\nReading image refs (DB_DRIVER=${driver})...`);

  // Dedup by resolved URL — the same file is referenced from many rows, and
  // downloading it once per reference would multiply the run time for nothing.
  const assets = new Map(); // url -> { url, ref, rows: [{ model, id, label }] }
  let totalRefs = 0;

  const addRef = (ref, row) => {
    if (!ref || typeof ref !== "string") return;
    totalRefs++;
    const resolved = getImageUrl(ref);
    if (!resolved.startsWith(ENDPOINT)) return; // data: URI or external — not ours
    if (!assets.has(resolved)) assets.set(resolved, { url: resolved, ref, rows: [] });
    assets.get(resolved).rows.push(row);
  };

  for (const model of ["pYQ", "generatedQuestion"]) {
    const rows = await prisma[model].findMany({
      select: { id: true, images: true },
      where: { images: { not: null } },
    });
    for (const r of rows) {
      for (const ref of extractRefs(r.images)) {
        addRef(ref, { model, id: r.id, label: model });
      }
    }
    console.log(`  ${model}: ${rows.length} rows with images.`);
  }

  const mocks = await prisma.mockTestTemplate.findMany({
    select: { id: true, title: true, questions: true },
  });
  for (const m of mocks) {
    const questions = Array.isArray(m.questions) ? m.questions : [];
    questions.forEach((q, qIndex) => {
      for (const ref of extractRefs(q?.images)) {
        addRef(ref, { model: "MockTestTemplate", id: m.id, label: `${m.title} #${qIndex}` });
      }
    });
  }
  console.log(`  MockTestTemplate: ${mocks.length} templates.`);

  let checkable = [...assets.values()];
  if (Number.isFinite(LIMIT)) checkable = checkable.slice(0, LIMIT);

  console.log(`\ntotal image refs: ${totalRefs}`);
  console.log(`distinct images to analyse: ${checkable.length}`);
  console.log(`flagging ratio > ${(MIN_RATIO * 100).toFixed(0)}% at luma <= ${LUMA_CUTOFF}\n`);

  await runPool(checkable, async (e) => {
    const { buf, error } = await fetchBytes(analysisUrl(e.url));
    if (error) { e.error = error; return; }
    try {
      const { ratio, width, height } = await blackRatio(buf);
      e.ratio = ratio;
      e.width = width;
      e.height = height;
    } catch (err) {
      e.error = `decode: ${err.message}`;
    }
  }, CONCURRENCY);

  const analysed = checkable.filter((e) => e.ratio !== undefined);
  const errored = checkable.filter((e) => e.error);
  const flagged = analysed
    .filter((e) => e.ratio > MIN_RATIO)
    .sort((a, b) => b.ratio - a.ratio);

  console.log(`\n=== Images over ${(MIN_RATIO * 100).toFixed(0)}% black ===`);
  console.log(`${flagged.length} flagged of ${analysed.length} analysed (${errored.length} unreadable)\n`);
  flagged.forEach((e, i) => {
    const pct = `${(e.ratio * 100).toFixed(1)}%`.padStart(6);
    const refs = e.rows.length > 1 ? ` (${e.rows.length} refs)` : "";
    console.log(`${String(i + 1).padStart(3)}. [${pct}] ${e.ref}${refs}`);
  });

  if (errored.length) {
    console.log(`\n--- unreadable (${errored.length}) ---`);
    // 404s are expected here: see memory project_mock_missing_images.
    const byError = errored.reduce((m, e) => (m[e.error] = (m[e.error] || 0) + 1, m), {});
    Object.entries(byError).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
  }

  const rowsOut = (WRITE_ALL ? analysed.slice().sort((a, b) => b.ratio - a.ratio) : flagged);
  const outCsv = path.join("scripts", "dark-images.csv");
  const outJson = path.join("scripts", "dark-images.json");
  // Slim copy in data/ ships with the app — /admin/reports reads it as the
  // worklist for the "Dark Image" report category. Always the FLAGGED set, even
  // under --all, so the admin page never fills up with healthy images.
  const outData = path.join("data", "dark-images.json");
  const header = "black_ratio,image_ref,width,height,ref_count,models,url\n";
  const lines = rowsOut.map((e) => [
    e.ratio.toFixed(4),
    e.ref,
    e.width,
    e.height,
    e.rows.length,
    [...new Set(e.rows.map((r) => r.model))].join(" "),
    e.url,
  ].map(csvCell).join(","));
  writeFileSync(outCsv, header + lines.join("\n") + "\n");
  writeFileSync(outJson, JSON.stringify({
    summary: {
      totalRefs,
      distinctAnalysed: analysed.length,
      flagged: flagged.length,
      errored: errored.length,
      minRatio: MIN_RATIO,
      lumaCutoff: LUMA_CUTOFF,
    },
    images: rowsOut.map((e) => ({
      ref: e.ref,
      ratio: Number(e.ratio.toFixed(4)),
      width: e.width,
      height: e.height,
      url: e.url,
      rows: e.rows,
    })),
  }, null, 2));

  writeFileSync(outData, JSON.stringify({
    generatedAt: new Date().toISOString(),
    minRatio: MIN_RATIO,
    lumaCutoff: LUMA_CUTOFF,
    images: flagged.map((e) => ({
      ref: e.ref,
      ratio: Number(e.ratio.toFixed(4)),
      rows: e.rows.map(({ model, id }) => ({ model, id })),
    })),
  }, null, 2));

  console.log(`\nWrote ${outCsv}, ${outJson} and ${outData}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
