/**
 * Inspect PYQ.images and GeneratedQuestion.images fields to figure out:
 *   1. how many records still hold full Cloudinary URLs (vs short paths)
 *   2. how many image paths contain spaces (the chars that broke migration)
 *   3. a few samples of each variant
 *
 * Run: node scripts/inspect-db-images.js
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

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

function flatten(imagesJson) {
  // images can be: string, array of strings, array of {url}, object
  if (!imagesJson) return [];
  if (typeof imagesJson === 'string') return [imagesJson];
  if (Array.isArray(imagesJson)) {
    return imagesJson.flatMap((x) => {
      if (typeof x === 'string') return [x];
      if (x && typeof x === 'object') return Object.values(x).filter((v) => typeof v === 'string');
      return [];
    });
  }
  if (typeof imagesJson === 'object') {
    return Object.values(imagesJson).flatMap((v) => flatten(v));
  }
  return [];
}

async function inspectModel(model) {
  const rows = await prisma[model].findMany({
    select: { id: true, images: true },
    where: { images: { not: null } },
  });
  const stats = {
    total: rows.length,
    cloudinaryUrl: 0,
    httpsOther: 0,
    plainPath: 0,
    withSpaces: 0,
    samplesUrl: [],
    samplesPath: [],
    samplesSpaces: [],
  };
  for (const r of rows) {
    const urls = flatten(r.images);
    for (const u of urls) {
      if (!u || typeof u !== 'string') continue;
      const isCloudinary = u.includes('res.cloudinary.com');
      const isHttps = u.startsWith('http');
      const hasSpace = u.includes(' ') || u.includes('%20');
      if (isCloudinary) {
        stats.cloudinaryUrl++;
        if (stats.samplesUrl.length < 3) stats.samplesUrl.push(u);
      } else if (isHttps) {
        stats.httpsOther++;
      } else {
        stats.plainPath++;
        if (stats.samplesPath.length < 3) stats.samplesPath.push(u);
      }
      if (hasSpace) {
        stats.withSpaces++;
        if (stats.samplesSpaces.length < 5) stats.samplesSpaces.push(u);
      }
    }
  }
  return stats;
}

(async () => {
  for (const model of ['pYQ', 'generatedQuestion']) {
    console.log('\n====', model, '====');
    const s = await inspectModel(model);
    console.log('rows with images:        ', s.total);
    console.log('full Cloudinary URLs:    ', s.cloudinaryUrl);
    console.log('other https URLs:        ', s.httpsOther);
    console.log('plain DB paths:          ', s.plainPath);
    console.log('paths containing space:  ', s.withSpaces);
    console.log('sample Cloudinary URLs:');
    s.samplesUrl.forEach((u) => console.log('   ', u));
    console.log('sample plain paths:');
    s.samplesPath.forEach((u) => console.log('   ', u));
    console.log('sample space paths:');
    s.samplesSpaces.forEach((u) => console.log('   ', u));
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
