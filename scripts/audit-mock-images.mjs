// Audit which MockTestTemplate image references still 404 in ImageKit, grouped by mock.
//
// This regenerates the per-mock list from the 2026-06-14 audit, whose CSV was never
// committed (see memory: project_mock_missing_images). Read-only — it never writes to
// the DB. Resolution logic is ported from scripts/audit-imagekit-images.js, which in
// turn mirrors lib/imageUtils.ts; that script covers PYQ + GeneratedQuestion, this one
// covers the mock templates it skips.
//
// Usage (through the SSH tunnel to the VPS, which is where prod data lives):
//   DB_DRIVER=standard node --env-file=.env scripts/audit-mock-images.mjs
//
// Output: console summary (mocks ranked by missing count) + scripts/mock-missing-images.csv
//         and .json with the per-row detail.

import { writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeonHTTP } from "@prisma/adapter-neon";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("\n✖ DATABASE_URL not set. Run with: node --env-file=.env ...\n");
  process.exit(1);
}

// Follow DB_DRIVER like lib/prisma.ts: "standard" = plain TCP (VPS via tunnel),
// otherwise the Neon HTTP adapter. Without this the audit reads the wrong DB.
const driver = process.env.DB_DRIVER ?? "neon-http";
const prisma = driver === "standard"
  ? new PrismaClient()
  : new PrismaClient({ adapter: new PrismaNeonHTTP(url, {}) });

const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const CONCURRENCY = 12;
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

// Mock questions store images as [{ index, filename, type? }] (prisma/seed_mock_from_json.ts:58).
// Take filename/url/src/path ONLY — never arbitrary fields like `type`, which would
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
      if (processed % 50 === 0) process.stdout.write(`\r  checked ${processed}/${items.length}...`);
    }
  }));
  process.stdout.write(`\r  checked ${processed}/${items.length}.    \n`);
}

async function checkUrl(url) {
  try {
    return (await fetch(url, { method: "HEAD" })).status;
  } catch {
    return 0; // network error
  }
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

(async () => {
  if (!ENDPOINT) {
    console.error("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT not set — cannot resolve ImageKit URLs.");
    process.exit(1);
  }

  console.log(`\nReading mock templates (DB_DRIVER=${driver})...`);
  const mocks = await prisma.mockTestTemplate.findMany({
    select: { id: true, title: true, exam_type: true, branch: true, questions: true },
  });
  console.log(`  ${mocks.length} mock templates.`);

  // Dedup HEAD checks by resolved URL, but keep every (mock, question) row that
  // points at it so the per-mock breakdown is exact.
  const assets = new Map(); // url -> { url, rows: [{mockId, title, exam_type, branch, qIndex, qId, ref}] }
  let totalRefs = 0;

  for (const m of mocks) {
    const questions = Array.isArray(m.questions) ? m.questions : [];
    questions.forEach((q, qIndex) => {
      for (const ref of extractRefs(q?.images)) {
        if (!ref || typeof ref !== "string") continue;
        totalRefs++;
        const url = getImageUrl(ref);
        if (!url.includes(ENDPOINT)) continue; // data: URI or external — not ours to check
        if (!assets.has(url)) assets.set(url, { url, rows: [] });
        assets.get(url).rows.push({
          mockId: m.id,
          title: m.title,
          exam_type: m.exam_type,
          branch: m.branch,
          qIndex,
          qId: q?.id ?? q?.question_id ?? null,
          ref,
        });
      }
    });
  }

  const checkable = [...assets.values()];
  console.log(`\ntotal image refs: ${totalRefs}`);
  console.log(`distinct ImageKit URLs to check: ${checkable.length}\n`);

  await runPool(checkable, async (e) => { e.status = await checkUrl(e.url); }, CONCURRENCY);

  const missing = checkable.filter((e) => e.status === 404);
  const errored = checkable.filter((e) => e.status !== 200 && e.status !== 404);

  // Group missing refs by mock.
  const byMock = new Map();
  for (const e of missing) {
    for (const r of e.rows) {
      if (!byMock.has(r.mockId)) {
        byMock.set(r.mockId, { ...r, count: 0, refs: [] });
      }
      const g = byMock.get(r.mockId);
      g.count++;
      g.refs.push(r.ref);
    }
  }
  const ranked = [...byMock.values()].sort((a, b) => b.count - a.count);
  const missingRows = missing.reduce((s, e) => s + e.rows.length, 0);

  console.log("\n=== Mocks with missing images ===");
  console.log(`${missingRows} broken refs across ${ranked.length} mocks `
    + `(${missing.length} distinct files, ${errored.length} non-404 errors)\n`);
  ranked.forEach((g, i) => {
    const scope = [g.exam_type, g.branch].filter(Boolean).join(" / ");
    console.log(`${String(i + 1).padStart(3)}. [${String(g.count).padStart(3)}] ${g.title}  (${scope})`);
  });

  // JSON goes to data/ so it ships with the app — /admin/mock-images reads it as
  // the worklist. CSV stays in scripts/ as the human-readable export.
  const outCsv = path.join("scripts", "mock-missing-images.csv");
  const outJson = path.join("data", "mock-missing-images.json");
  const header = "mock_title,exam_type,branch,mock_id,question_index,question_id,image_ref,url\n";
  const lines = missing.flatMap((e) => e.rows.map((r) => [
    r.title, r.exam_type, r.branch, r.mockId, r.qIndex, r.qId, r.ref, e.url,
  ].map(csvCell).join(",")));
  writeFileSync(outCsv, header + lines.join("\n") + "\n");
  writeFileSync(outJson, JSON.stringify({
    summary: {
      mockTemplates: mocks.length,
      totalRefs,
      distinctChecked: checkable.length,
      distinctMissing: missing.length,
      missingRefs: missingRows,
      mocksAffected: ranked.length,
      errored: errored.length,
    },
    mocks: ranked.map(({ mockId, title, exam_type, branch, count, refs }) => ({
      mockId, title, exam_type, branch, count, refs,
    })),
  }, null, 2));

  console.log(`\nWrote ${outCsv} and ${outJson}`);
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
