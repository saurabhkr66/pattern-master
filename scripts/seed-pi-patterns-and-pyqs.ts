/**
 * seed-pi-patterns-and-pyqs.ts
 *
 * Step 1: Creates 8 Pattern rows for GATE PI (one per section).
 * Step 2: Inserts all GATE PI mock questions as PYQ rows under their section pattern.
 *
 * Usage:
 *   npx tsx scripts/seed-pi-patterns-and-pyqs.ts
 */

import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const EXAM_TYPE = "GATE";
const BRANCH = "PI";

// 8 official GATE PI sections → subject label
const SECTIONS: { topic_name: string; subject: string }[] = [
  { topic_name: "Engineering Mathematics",                     subject: "Engineering Mathematics" },
  { topic_name: "General Aptitude",                           subject: "General Aptitude" },
  { topic_name: "General Engineering",                        subject: "General Engineering" },
  { topic_name: "Manufacturing Processes I",                  subject: "Manufacturing Engineering" },
  { topic_name: "Manufacturing Processes II",                 subject: "Manufacturing Engineering" },
  { topic_name: "Quality and Reliability",                    subject: "Quality and Reliability" },
  { topic_name: "Industrial Engineering",                     subject: "Industrial Engineering" },
  { topic_name: "Operations Research and Operations Management", subject: "Operations Research" },
];

function md5(s: string) {
  return crypto.createHash("md5").update(s).digest("hex");
}

async function main() {
  // ── Step 1: Create Pattern rows ──────────────────────────────────────────
  console.log("\nStep 1: Creating Pattern rows for GATE PI...");

  const patternMap: Record<string, string> = {}; // topic_name → pattern.id

  for (const sec of SECTIONS) {
    const existing = await prisma.pattern.findUnique({
      where: { pattern_identifier: { exam_type: EXAM_TYPE, branch: BRANCH, topic_name: sec.topic_name } },
    });

    if (existing) {
      console.log(`  [skip] "${sec.topic_name}" already exists`);
      patternMap[sec.topic_name] = existing.id;
      continue;
    }

    const created = await prisma.pattern.create({
      data: {
        exam_type: EXAM_TYPE,
        branch: BRANCH,
        subject: sec.subject,
        topic_name: sec.topic_name,
        atomic_logic: `GATE PI section: ${sec.topic_name}.`,
      },
    });

    patternMap[sec.topic_name] = created.id;
    console.log(`  [created] "${sec.topic_name}" → ${created.id}`);
  }

  // ── Step 2: Insert mock questions as PYQs ────────────────────────────────
  console.log("\nStep 2: Inserting mock questions as PYQs...");

  const mocks = await prisma.mockTestTemplate.findMany({
    where: { exam_type: EXAM_TYPE, branch: BRANCH },
    select: { title: true, questions: true },
  });

  let inserted = 0, skipped = 0, noPattern = 0;

  for (const mock of mocks) {
    const questions = mock.questions as any[];
    process.stdout.write(`  ${mock.title}: `);
    let mockInserted = 0;

    for (const q of questions) {
      const patternId = patternMap[q.topic];
      if (!patternId) {
        noPattern++;
        continue;
      }

      const questionText: string = q.question_text ?? "";
      const hash = md5(questionText.trim().toLowerCase());

      // Check duplicate by pattern_id + question_hash
      const existing = await prisma.pYQ.findUnique({
        where: { pyq_hash_identifier: { pattern_id: patternId, question_hash: hash } },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.pYQ.create({
        data: {
          pattern_id: patternId,
          question_text: questionText,
          question_text_hindi: q.question_text_hindi ?? null,
          options: q.options ?? [],
          options_hindi: q.options_hindi ?? null,
          correct_answer: q.correct_answer ?? "",
          explanation: q.explanation ?? "",
          explanation_hindi: q.explanation_hindi ?? null,
          year: q.year ?? 0,
          exam_type: EXAM_TYPE,
          question_type: q.question_type ?? "MCQ",
          marks: q.marks ?? 1,
          images: q.images ?? [],
          question_hash: hash,
          topic: q.topic ?? null,
        },
      });

      inserted++;
      mockInserted++;
    }

    console.log(`${mockInserted} inserted`);
  }

  console.log(`\nDone!`);
  console.log(`  Inserted:   ${inserted}`);
  console.log(`  Skipped:    ${skipped} (duplicates)`);
  console.log(`  No pattern: ${noPattern}`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
