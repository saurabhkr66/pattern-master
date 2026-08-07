// scripts/diag-grading.ts — READ-ONLY diagnostic for the subjective grading sweeper.
//
// Usage: npx tsx --env-file=.env.local scripts/diag-grading.ts

import { prisma } from "@/lib/prisma";

async function main() {
  const batches = await prisma.gradingBatch.findMany({
    orderBy: { created_at: "desc" },
    take: 10,
  });
  console.log(`GradingBatch rows: ${batches.length}`);
  for (const b of batches) {
    console.log(
      `  ${b.status.padEnd(8)} ${b.job_name}  attempts=${b.attempt_ids.length}  created=${b.created_at.toISOString()}`
    );
  }

  const pending = await prisma.testAttempt.findMany({
    where: { status: "submitted", grading_status: { not: "done" } },
    select: {
      id: true,
      grading_status: true,
      grading_batch: true,
      submitted_at: true,
    },
    orderBy: { submitted_at: "desc" },
    take: 10,
  });
  console.log(`\nNot-done attempts: ${pending.length}`);
  for (const a of pending) {
    console.log(
      `  ${a.id}  status=${a.grading_status}  batch=${a.grading_batch ?? "-"}  submitted=${a.submitted_at?.toISOString() ?? "-"}`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
