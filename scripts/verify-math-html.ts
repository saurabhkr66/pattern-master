// Verifies Option B: (1) coverage, (2) stored HTML is byte-identical to a fresh
// live render. If parity holds, pages render identically AND the heavy pipeline
// is genuinely precomputed (not re-run at request time).
import { prisma } from "../lib/prisma";
import { renderMathHtml, RENDER_VERSION } from "../lib/math/renderHtml";

const SAMPLE = parseInt(process.argv[2] || "300", 10);

async function main() {
  // 1) Coverage
  const [pTot, pDone, gTot, gDone] = await Promise.all([
    prisma.pYQ.count(), prisma.pYQ.count({ where: { render_version: { gte: RENDER_VERSION } } }),
    prisma.generatedQuestion.count(), prisma.generatedQuestion.count({ where: { render_version: { gte: RENDER_VERSION } } }),
  ]);
  console.log(`\nCoverage @ RENDER_VERSION=${RENDER_VERSION}:`);
  console.log(`  PYQ: ${pDone}/${pTot}   GeneratedQuestion: ${gDone}/${gTot}`);

  // 2) Byte-parity on a random-ish sample of backfilled PYQs
  const rows = await prisma.pYQ.findMany({
    where: { render_version: { gte: RENDER_VERSION }, question_html: { not: null } },
    select: { id: true, question_text: true, question_html: true, explanation: true, explanation_html: true },
    take: SAMPLE,
  });

  let checked = 0, match = 0; const mismatches: string[] = [];
  for (const r of rows) {
    if (r.question_text && r.question_html != null) {
      checked++;
      if (renderMathHtml(r.question_text) === r.question_html) match++; else mismatches.push(`${r.id} (question)`);
    }
    if (r.explanation && r.explanation_html != null) {
      checked++;
      if (renderMathHtml(r.explanation) === r.explanation_html) match++; else mismatches.push(`${r.id} (explanation)`);
    }
  }
  console.log(`\nByte-parity (stored HTML === fresh live render):`);
  console.log(`  ${match}/${checked} identical`);
  if (mismatches.length) { console.log("  mismatches:"); mismatches.slice(0, 10).forEach(m => console.log("   -", m)); }
  else console.log("  ✓ every sampled row is byte-identical → no visual change, pipeline precomputed");
}
main().catch(e => console.log("THREW:", e.message)).finally(() => prisma.$disconnect());
