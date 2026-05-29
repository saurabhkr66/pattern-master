/**
 * Audit which DB image references actually resolve in ImageKit.
 *
 * Walks PYQ.images + GeneratedQuestion.images, resolves every distinct image
 * reference to its ImageKit delivery URL (using the SAME logic as
 * lib/imageUtils.ts), and HEAD-checks each one. Anything that 404s is reported
 * as "missing in ImageKit" together with the record IDs that reference it, so
 * the broken images can be traced.
 *
 * Run:  node scripts/audit-imagekit-images.js
 * Output: console summary + scripts/imagekit-missing.json (full detail)
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// --- load .env -------------------------------------------------------------
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1].trim()] = v;
  });
}

const prisma = new PrismaClient();
const ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
const CONCURRENCY = 12;
const OUT_FILE = path.join(__dirname, 'imagekit-missing.json');

// --- ported verbatim from lib/imageUtils.ts --------------------------------
const IMAGEKIT_TRANSFORMS = 'f-auto,q-auto';

function sanitizeIkPath(p) {
  return p.split('/').map((seg) => seg.replace(/ /g, '_').replace(/%20/g, '_')).join('/');
}

function cloudinaryToImagekitPath(cloudinaryUrl) {
  const match = cloudinaryUrl.match(/\/image\/upload\/(.+)$/);
  if (!match) return null;
  const decoded = decodeURIComponent(match[1]);
  const segments = decoded.split('/');
  let i = 0;
  while (i < segments.length - 1 && (/^v\d+$/.test(segments[i]) || segments[i].includes(','))) {
    i++;
  }
  return sanitizeIkPath(segments.slice(i).join('/'));
}

function getImageUrl(dbPath) {
  if (!dbPath) return '';
  if (dbPath.startsWith('data:')) return dbPath;
  if (dbPath.startsWith('http://') || dbPath.startsWith('https://')) {
    if (ENDPOINT && dbPath.includes('res.cloudinary.com')) {
      const p = cloudinaryToImagekitPath(dbPath);
      if (p) return `${ENDPOINT}/${p}?tr=${IMAGEKIT_TRANSFORMS}`;
    }
    return dbPath;
  }
  let cleanPath = dbPath.replace(/^\/+/, '');
  cleanPath = cleanPath.replace(/&/g, 'and');
  if (cleanPath.startsWith('images/questions/')) {
    cleanPath = cleanPath.replace('images/questions/', '');
  }
  cleanPath = sanitizeIkPath(cleanPath);
  if (!ENDPOINT) return `/${cleanPath}`;
  const ikPath = `pattern-master/${cleanPath}`;
  return `${ENDPOINT}/${ikPath}?tr=${IMAGEKIT_TRANSFORMS}`;
}

// Extract the actual image reference(s) from an images JSON value.
// Image objects are shaped { index, filename, type? } (see scripts/scrape-prepp.ts),
// so we take filename/url/src ONLY — never arbitrary string fields like `type`,
// which would otherwise surface "explanation"/"question" as fake paths.
function extractRefs(imagesJson) {
  if (!imagesJson) return [];
  if (typeof imagesJson === 'string') return [imagesJson];
  if (Array.isArray(imagesJson)) {
    return imagesJson.flatMap((x) => {
      if (typeof x === 'string') return [x];
      if (x && typeof x === 'object') {
        const ref = x.filename || x.url || x.src || x.path;
        return typeof ref === 'string' ? [ref] : [];
      }
      return [];
    });
  }
  if (typeof imagesJson === 'object') {
    const ref = imagesJson.filename || imagesJson.url || imagesJson.src || imagesJson.path;
    return typeof ref === 'string' ? [ref] : [];
  }
  return [];
}

// --- bounded-concurrency runner --------------------------------------------
async function runPool(items, worker, concurrency) {
  const queue = items.slice();
  let processed = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      await worker(item);
      processed++;
      if (processed % 50 === 0) process.stdout.write(`\r  checked ${processed}/${items.length}...`);
    }
  });
  await Promise.all(workers);
  process.stdout.write(`\r  checked ${processed}/${items.length}.    \n`);
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.status;
  } catch {
    return 0; // network error
  }
}

(async () => {
  if (!ENDPOINT) {
    console.error('NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT not set — cannot resolve ImageKit URLs.');
    process.exit(1);
  }

  // Dedup by RESOLVED ImageKit URL: a leading-slash and non-slash variant of the
  // same path resolve identically, so they are one asset. Each entry tracks the
  // raw refs and the record IDs that point at it, for tracing.
  // resolved url -> { count, refs: Set, ids: [{model,id}], url, kind }
  const assets = new Map();
  let totalRefs = 0;

  for (const model of ['pYQ', 'generatedQuestion']) {
    const rows = await prisma[model].findMany({
      select: { id: true, images: true },
      where: { images: { not: null } },
    });
    for (const r of rows) {
      for (const raw of extractRefs(r.images)) {
        if (!raw || typeof raw !== 'string') continue;
        totalRefs++;
        const url = getImageUrl(raw);
        let entry = assets.get(url);
        if (!entry) {
          const kind = raw.startsWith('data:')
            ? 'data'
            : url.includes(ENDPOINT)
              ? 'imagekit'
              : 'external'; // https URL that is NOT rewritten to ImageKit
          entry = { count: 0, refs: new Set(), ids: [], url, kind };
          assets.set(url, entry);
        }
        entry.count++;
        entry.refs.add(raw);
        if (entry.ids.length < 50) entry.ids.push({ model, id: r.id });
      }
    }
  }

  const all = [...assets.values()].map((e) => ({ ...e, refs: [...e.refs], ref: [...e.refs][0] }));
  const checkable = all.filter((e) => e.kind === 'imagekit');
  const dataUris = all.filter((e) => e.kind === 'data');
  const external = all.filter((e) => e.kind === 'external');

  console.log('\n=== DB image references ===');
  console.log('total references (incl. duplicates):', totalRefs);
  console.log('distinct assets (by resolved URL):  ', all.length);
  console.log('  -> resolve to ImageKit:           ', checkable.length);
  console.log('  -> inline data: URIs (skipped):   ', dataUris.length);
  console.log('  -> external URLs (not ImageKit):  ', external.length);

  console.log(`\nHEAD-checking ${checkable.length} distinct ImageKit URLs...`);
  await runPool(checkable, async (e) => { e.status = await checkUrl(e.url); }, CONCURRENCY);

  const missing = checkable.filter((e) => e.status === 404);
  const errored = checkable.filter((e) => e.status !== 200 && e.status !== 404);
  const ok = checkable.filter((e) => e.status === 200);

  console.log('\n=== ImageKit availability ===');
  console.log('available (200):     ', ok.length);
  console.log('MISSING (404):       ', missing.length);
  console.log('other/error status:  ', errored.length);

  if (missing.length) {
    const missingRefCount = missing.reduce((s, e) => s + e.count, 0);
    console.log(`\n${missing.length} distinct images missing, referenced by ${missingRefCount} record(s).`);
    console.log('First 20 missing:');
    missing.slice(0, 20).forEach((e) => {
      console.log(`  [${e.count}x] ${e.refs.join(' | ')}`);
    });
  }

  if (external.length) {
    console.log('\nExternal (non-ImageKit) URLs still in DB — sample:');
    external.slice(0, 10).forEach((e) => console.log('   ', e.ref));
  }

  const report = {
    summary: {
      totalRefs,
      distinct: all.length,
      imagekitResolvable: checkable.length,
      dataUris: dataUris.length,
      external: external.length,
      available: ok.length,
      missing: missing.length,
      errored: errored.length,
    },
    missing: missing.map((e) => ({ refs: e.refs, url: e.url, count: e.count, ids: e.ids })),
    errored: errored.map((e) => ({ refs: e.refs, url: e.url, status: e.status, count: e.count })),
    external: external.map((e) => ({ refs: e.refs, count: e.count })),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));
  console.log(`\nFull detail (with record IDs to trace) written to ${path.relative(process.cwd(), OUT_FILE)}`);

  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
