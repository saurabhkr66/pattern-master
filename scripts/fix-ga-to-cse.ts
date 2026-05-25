/**
 * One-off: moves the 11th General Aptitude question in GATE CSE 2026 Shift 1
 * to subject "CSE" so it gets picked up by topic generation.
 *
 * Usage:
 *   npx tsx scripts/fix-ga-to-cse.ts
 *   npx tsx scripts/fix-ga-to-cse.ts --dry
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

const mockIdx = process.argv.indexOf("--mock");
const MOCK_ID = mockIdx !== -1 ? process.argv[mockIdx + 1] : "5a8202d6-0add-4280-a9cd-f4d60f8703cb";

const prisma = new PrismaClient();

async function main() {
  const isDry = process.argv.includes("--dry");

  const template = await prisma.mockTestTemplate.findUnique({
    where: { id: MOCK_ID },
    select: { title: true, questions: true },
  });

  if (!template) throw new Error(`Mock not found: ${MOCK_ID}`);

  const questions = template.questions as any[];

  // Collect GA questions in order, tracking their original array index.
  const gaQuestions = questions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.subject === "General Aptitude");

  console.log(`"${template.title}"`);
  console.log(`Total GA questions: ${gaQuestions.length}`);

  if (gaQuestions.length < 11) {
    console.error("Less than 11 GA questions found — nothing to move.");
    process.exit(1);
  }

  const { q, idx } = gaQuestions[10]; // 11th (0-based index 10)
  console.log(`\n11th GA question (array index ${idx}):`);
  console.log(`  Text   : ${q.question_text?.substring(0, 80)}...`);
  console.log(`  Subject: ${q.subject} → CSE`);
  console.log(`  Topic  : ${q.topic}`);

  if (isDry) {
    console.log("\n[DRY RUN] No changes written.");
    return;
  }

  await prisma.$executeRaw`
    UPDATE "MockTestTemplate"
    SET questions = jsonb_set(questions, ${`{${idx},subject}`}::text[], to_jsonb('CSE'::text))
    WHERE id = ${MOCK_ID}
  `;

  console.log("\nDone — subject patched to CSE.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
