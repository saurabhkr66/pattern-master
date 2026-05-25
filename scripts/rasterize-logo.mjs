// Rasterize logo SVGs into the PNGs that @capacitor/assets + Next.js favicons expect.
// Run: node scripts/rasterize-logo.mjs
import sharp from 'sharp';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'assets');
const publicDir = join(root, 'public');
const appDir = join(root, 'app');

async function render(svgPath, outPath, size) {
  const svg = await readFile(svgPath);
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

async function renderTransparent(svgPath, outPath, size) {
  const svg = await readFile(svgPath);
  await mkdir(dirname(outPath), { recursive: true });
  await sharp(svg, { density: 384 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

// Capacitor assets sources
await render(join(assets, 'icon-only.svg'),       join(assets, 'icon-only.png'),       1024);
await renderTransparent(join(assets, 'icon-foreground.svg'), join(assets, 'icon-foreground.png'), 1024);
await render(join(assets, 'icon-background.svg'), join(assets, 'icon-background.png'), 1024);
await render(join(assets, 'splash.svg'),          join(assets, 'splash.png'),          2732);

// Next.js app-router favicons (in /app)
await render(join(assets, 'icon-only.svg'), join(appDir, 'icon.png'),       512);
await render(join(assets, 'icon-only.svg'), join(appDir, 'apple-icon.png'), 180);

// /public favicons — used by Google Search crawler + legacy browsers.
// Google requires multiples of 48px; we ship 48 and 192 for crawler, 512 for PWA.
await render(join(assets, 'icon-only.svg'), join(publicDir, 'favicon-48.png'),  48);
await render(join(assets, 'icon-only.svg'), join(publicDir, 'favicon-192.png'), 192);
await render(join(assets, 'icon-only.svg'), join(publicDir, 'favicon-512.png'), 512);

console.log('done');
