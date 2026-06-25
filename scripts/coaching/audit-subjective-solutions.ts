// scripts/coaching/audit-subjective-solutions.ts
//
// READ-ONLY. Sizes the model-answer gap before the rubric backfill: a rubric can
// only be generated for a subjective question that HAS a model answer (solution).
// Reports how many subjective questions are missing one (so you can fill them) and
// how many already have a current rubric.
//
// Usage:
//   npx tsx --env-file=.env scripts/coaching/audit-subjective-solutions.ts
//
// NOTE the .env trap: the CLI reads .env — point it at the DB you want to audit
// (dev Neon branch vs the VPS Postgres).

import { prisma } from "../../lib/prisma";
import { RUBRIC_VERSION } from "../../lib/coachingRubric";

async function main() {
  const subjective = { question_type: "subjective" } as const;

  const hasSolution = { AND: [{ solution: { not: null } }, { solution: { not: "" } }] };

  const [total, missingSolution, withSolution, currentRubric, toProcess] = await Promise.all([
    prisma.coachingQuestion.count({ where: subjective }),
    prisma.coachingQuestion.count({
      where: { ...subjective, OR: [{ solution: null }, { solution: "" }] },
    }),
    prisma.coachingQuestion.count({ where: { ...subjective, ...hasSolution } }),
    prisma.coachingQuestion.count({
      where: { ...subjective, ...hasSolution, rubric_version: { gte: RUBRIC_VERSION } },
    }),
    prisma.coachingQuestion.count({
      where: { ...subjective, ...hasSolution, rubric_version: { lt: RUBRIC_VERSION } },
    }),
  ]);

  console.log("\n📋 Subjective question audit");
  console.log(`  total subjective questions : ${total}`);
  console.log(`  ✅ with model answer       : ${withSolution}`);
  console.log(`  ⚠️  missing model answer    : ${missingSolution}  (cannot get a rubric until filled)`);
  console.log(`  🏷️  rubric up-to-date (v${RUBRIC_VERSION}) : ${currentRubric}`);
  console.log(`  ↻ rubric backfill will process : ${toProcess}\n`);
}

main()
  .catch((e) => {
    console.error("❌ Audit failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
