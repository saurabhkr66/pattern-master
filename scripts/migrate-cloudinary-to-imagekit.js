/**
 * Cloudinary -> ImageKit bulk migration.
 *
 * Lists every asset in Cloudinary under the `pattern-master/` folder
 * (paginated), downloads each one via its secure_url, then uploads it
 * to ImageKit at the SAME folder path so existing DB paths keep resolving
 * through lib/imageUtils.ts without any rewrite.
 *
 * Run:  node scripts/migrate-cloudinary-to-imagekit.js
 * Safe to re-run: skips files already recorded in migration_mapping.json.
 */

const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { default: ImageKit, toFile } = require('@imagekit/nodejs');

// --- load .env (same trick your upload_public_images.js uses) -------------
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

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ik = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
});

const ROOT_FOLDER = 'pattern-master';
const MAPPING_FILE = path.join(__dirname, '..', 'migration_mapping.json');
const ASSET_LIST_FILE = path.join(__dirname, '..', 'cloudinary_assets.json');
const CONCURRENCY = 8;

let mapping = {};
if (fs.existsSync(MAPPING_FILE)) {
  mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf-8'));
}
const save = () => fs.writeFileSync(MAPPING_FILE, JSON.stringify(mapping, null, 2));

// --- list every Cloudinary asset under ROOT_FOLDER ------------------------
async function listAllAssets() {
  const all = [];
  let next = null;
  do {
    const resp = await cloudinary.api.resources({
      type: 'upload',
      prefix: ROOT_FOLDER,
      max_results: 500,
      next_cursor: next,
    });
    all.push(...resp.resources);
    next = resp.next_cursor;
    console.log(`  listed ${all.length} so far...`);
  } while (next);
  return all;
}

// --- download a URL into a Buffer -----------------------------------------
async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

// ImageKit folder/file names cannot contain spaces. We normalize them to
// underscores here AND in lib/imageUtils.ts so DB paths still resolve.
function sanitize(seg) {
  return seg.replace(/ /g, '_');
}

// --- migrate a single asset -----------------------------------------------
async function migrateOne(asset) {
  // public_id looks like "pattern-master/physics/wave" (no extension)
  // We want fileName="wave.png" and folder="/pattern-master/physics"
  const fullId = asset.public_id;            // pattern-master/physics/wave
  const ext = asset.format;                  // png
  const parts = fullId.split('/').map(sanitize);
  const fileName = parts.pop() + '.' + ext;  // wave.png
  const folder = '/' + parts.join('/');      // /pattern-master/physics

  const key = `${fullId}.${ext}`;
  if (mapping[key]) return { skipped: true, key };

  const buffer = await fetchBuffer(asset.secure_url);
  const fileForUpload = await toFile(buffer, fileName);

  const result = await ik.files.upload({
    file: fileForUpload,
    fileName,
    folder,
    useUniqueFileName: false,
    overwrite: true,
  });

  mapping[key] = { ikUrl: result.url, ikFileId: result.fileId };
  return { uploaded: true, key, url: result.url };
}

// --- simple bounded-concurrency runner ------------------------------------
async function runPool(items, worker, concurrency) {
  const queue = items.slice();
  let done = 0, failed = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        const r = await worker(item);
        done++;
        if (r.skipped)   console.log(`[${done}/${items.length}] skip  ${r.key}`);
        else             console.log(`[${done}/${items.length}] up    ${r.key}`);
        if (done % 25 === 0) save();
      } catch (e) {
        failed++;
        console.error(`FAIL ${item.public_id}: ${e.message}`);
      }
    }
  });
  await Promise.all(workers);
  return { done, failed };
}

(async () => {
  let assets;
  if (fs.existsSync(ASSET_LIST_FILE)) {
    assets = JSON.parse(fs.readFileSync(ASSET_LIST_FILE, 'utf-8'));
    console.log(`Loaded ${assets.length} cached assets from ${path.basename(ASSET_LIST_FILE)}.`);
    console.log('(Delete that file to force a fresh listing from Cloudinary.)');
  } else {
    console.log('Listing Cloudinary assets under', ROOT_FOLDER, '...');
    assets = await listAllAssets();
    fs.writeFileSync(ASSET_LIST_FILE, JSON.stringify(assets));
    console.log(`Found ${assets.length} assets. Cached to ${path.basename(ASSET_LIST_FILE)}.`);
  }

  const { done, failed } = await runPool(assets, migrateOne, CONCURRENCY);
  save();
  console.log(`\nDone. uploaded/skipped=${done}  failed=${failed}`);
  console.log(`Mapping written to ${MAPPING_FILE}`);
})().catch((e) => {
  console.error('Fatal:', e);
  save();
  process.exit(1);
});
