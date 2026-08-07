/**
 * Diagnose a PDF that the bulk importer reads badly.
 *
 *   npx tsx scripts/inspect-import-pdf.ts "C:\path\to\paper.pdf"
 *
 * Answers the three questions that decide whether the import problem is the PDF
 * or the model:
 *   1. How big is it in the units Gemini charges? A PDF page costs ~258 input
 *      tokens, so page count — not file size — is what makes a model give up.
 *   2. Is there an extractable text layer, or is every page a scan? A scanned
 *      page still works (Gemini OCRs it) but is far more error-prone, and low-DPI
 *      scans are where "read only 1 question" comes from.
 *   3. What question numbering does the text layer actually show? Prints the
 *      detected sequence and where it restarts, so you can compare it against
 *      `[import] enumerate pass: …` in the server log.
 *
 * Read-only: opens the file, prints a report, writes nothing.
 */
import * as mupdf from "mupdf";
import { readFileSync, statSync } from "node:fs";

// Gemini bills a PDF page as an image tile; ~258 tokens/page is Google's figure.
const TOKENS_PER_PAGE = 258;
// Below this many characters a page has no usable text layer — i.e. it's a scan.
const SCANNED_TEXT_THRESHOLD = 40;

const file = process.argv[2];
if (!file) {
  console.error('Usage: npx tsx scripts/inspect-import-pdf.ts "path\\to\\paper.pdf"');
  process.exit(1);
}

const bytes = readFileSync(file);
const doc = mupdf.Document.openDocument(bytes, "application/pdf");
const pages = doc.countPages();
const sizeMb = statSync(file).size / 1e6;

console.log(`\nFile        : ${file}`);
console.log(`Size        : ${sizeMb.toFixed(2)} MB`);
console.log(`Pages       : ${pages}`);
console.log(`Est. tokens : ~${(pages * TOKENS_PER_PAGE).toLocaleString()} input tokens per model call`);
if (sizeMb > 15) {
  console.log(
    `  ⚠ On Vertex the whole PDF is inlined as base64 in EVERY call — past ~20MB the request fails outright.`
  );
}

// Per-page text layer + the question numbers it exposes.
const numbers: { page: number; n: number }[] = [];
let scanned = 0;
let totalChars = 0;
for (let i = 0; i < pages; i++) {
  let text = "";
  try {
    text = doc.loadPage(i).toStructuredText("preserve-whitespace").asText();
  } catch {
    text = "";
  }
  totalChars += text.length;
  if (text.trim().length < SCANNED_TEXT_THRESHOLD) scanned++;
  // "1." / "12)" / "Q3." at the start of a line — how printed papers number.
  for (const m of text.matchAll(/^[ \t]*(?:Q(?:ues(?:tion)?)?\.?\s*)?(\d{1,3})[.)]/gim)) {
    numbers.push({ page: i, n: Number(m[1]) });
  }
}

console.log(`\nText layer  : ${totalChars.toLocaleString()} chars across ${pages} page(s)`);
if (scanned === pages) {
  console.log(`  ⚠ NO text layer on any page — this is a pure scan. Gemini must OCR every`);
  console.log(`    page. This is the single most common cause of a short extraction.`);
} else if (scanned > 0) {
  console.log(`  ⚠ ${scanned} of ${pages} page(s) have no text layer (mixed scan/digital).`);
} else {
  console.log(`  ✓ Every page has a text layer.`);
}

// What the numbering looks like — the same restart detection the importer uses.
if (!numbers.length) {
  console.log(`\nNumbering   : no question numbers found in the text layer.`);
  if (scanned) console.log(`  (expected for a scan — the importer relies on the model instead)`);
} else {
  const seq = numbers.map((x) => x.n);
  const segments: number[][] = [];
  for (const n of seq) {
    if (!segments.length || n <= segments[segments.length - 1].at(-1)!) segments.push([n]);
    else segments[segments.length - 1].push(n);
  }
  const merged: number[][] = [];
  for (const s of segments) {
    const prev = merged[merged.length - 1];
    if (prev && s[0] === prev.at(-1)) prev.push(...s.slice(1));
    else merged.push([...s]);
  }
  // Ignore stray one-off matches (dates, list bullets) when reporting sections.
  const real = merged.filter((s) => s.length > 2);
  console.log(`\nNumbering   : ${seq.length} numbered line(s) found`);
  for (const s of real) {
    const firstPage = numbers.find((x) => x.n === s[0])?.page ?? 0;
    console.log(`  · ${s[0]}–${s.at(-1)} (${s.length} question(s), starts on page ${firstPage + 1})`);
  }
  if (real.length > 1) {
    console.log(`  → numbering RESTARTS ${real.length - 1} time(s): the importer needs its`);
    console.log(`    section-name pass to succeed, or it falls back to one un-batched call.`);
  }
  console.log(`\nExpected total: ${real.reduce((n, s) => n + s.length, 0)} question(s)`);
  console.log(`Compare against "[import] enumerate pass: N question number(s)" in the server log.`);
}
console.log();
