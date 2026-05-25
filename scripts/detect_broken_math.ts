
import { prisma } from "../lib/prisma";
import katex from "katex";

function checkMath(text: string | null): { isBroken: boolean; errors: string[] } {
  if (!text) return { isBroken: false, errors: [] };
  
  const errors: string[] = [];
  let isBroken = false;

  // Normalization logic similar to lib/renderMath.ts
  let t = text
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...');

  // Match common LaTeX delimiters
  const patterns = [
    /\\\[([\s\S]*?)\\\]/g,
    /\\\(([\s\S]*?)\\\)/g,
    /\$\$([^$]+?)\$\$/g,
    /\$([^$\n]+?)\$/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(t)) !== null) {
      const math = match[1].trim();
      try {
        katex.renderToString(math, { throwOnError: true });
      } catch (e: any) {
        isBroken = true;
        errors.push(`Error in "${math}": ${e.message}`);
      }
    }
  }

  return { isBroken, errors };
}

async function main() {
  console.log("🔍 Scanning database for broken LaTeX...");

  const pyqs = await prisma.pYQ.findMany({
    select: { id: true, question_text: true, explanation: true, options: true }
  });
  const generated = await prisma.generatedQuestion.findMany({
    select: { id: true, question_text: true, explanation: true, options: true }
  });

  const allQuestions = [
    ...pyqs.map(q => ({ ...q, type: "PYQ" })),
    ...generated.map(q => ({ ...q, type: "Generated" }))
  ];

  let brokenCount = 0;
  const results: any[] = [];

  for (const q of allQuestions) {
    const qCheck = checkMath(q.question_text);
    const eCheck = checkMath(q.explanation);
    
    let optionsBroken = false;
    const optionErrors: string[] = [];
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        const oCheck = checkMath(typeof opt === "string" ? opt : String(opt));
        if (oCheck.isBroken) {
          optionsBroken = true;
          optionErrors.push(...oCheck.errors);
        }
      }
    }

    if (qCheck.isBroken || eCheck.isBroken || optionsBroken) {
      brokenCount++;
      results.push({
        id: q.id,
        type: q.type,
        errors: [
          ...(qCheck.isBroken ? ["Question: " + qCheck.errors.join(", ")] : []),
          ...(eCheck.isBroken ? ["Explanation: " + eCheck.errors.join(", ")] : []),
          ...(optionsBroken ? ["Options: " + optionErrors.join(", ")] : [])
        ]
      });
    }
  }

  if (results.length > 0) {
    console.log(`\n❌ Found ${brokenCount} questions with broken LaTeX:`);
    results.forEach(r => {
      console.log(`\n[${r.type}] ID: ${r.id}`);
      r.errors.forEach((err: string) => console.log(`  - ${err}`));
    });
  } else {
    console.log("\n✅ No broken LaTeX found in the sampled questions!");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
