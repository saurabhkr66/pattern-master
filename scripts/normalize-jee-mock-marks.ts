/**
 * Normalize EVERY JEE Main mock template to a uniform marking scheme:
 *   - every question = 4 marks, and counts (no optional best-N-of-M)
 *   - max_score = (#questions) × 4
 *   - per-section maxScore = (#questions in section) × 4, optional rule removed
 *   - negativePerMark = 0.25  (→ −1 on a wrong 4-mark MCQ; NAT/MSQ no negative)
 *
 * Run:  npx tsx scripts/normalize-jee-mock-marks.ts --dry   (preview)
 *       npx tsx scripts/normalize-jee-mock-marks.ts         (apply)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");
const MARK = 4;
const NEG = 0.25;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 4; i++) {
    try { return await fn(); }
    catch (e: any) {
      if (i === 3) throw e;
      console.log("  (retrying after:", e.message.split("\n")[0], ")");
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("unreachable");
}

async function main() {
  const rows = await withRetry(() =>
    prisma.mockTestTemplate.findMany({
      where: { exam_type: "JEE_MAIN" },
      select: { id: true, title: true, total_questions: true, max_score: true, questions: true, sections: true },
    })
  );
  console.log(`${rows.length} JEE_MAIN templates${DRY ? " (DRY RUN)" : ""}\n`);

  let changed = 0;
  for (const t of rows) {
    const qs = (Array.isArray(t.questions) ? t.questions : []) as any[];
    if (qs.length === 0) continue;

    // 1) every question: 4 marks, counts.
    for (const q of qs) {
      q.marks = MARK;
      q.isOptional = false;
    }
    const newMax = qs.length * MARK;

    // 2) sections: recompute counts/marks from the questions, drop optional rule.
    let sections = (Array.isArray(t.sections) ? t.sections : null) as any[] | null;
    if (sections) {
      sections = sections.map((sec: any) => {
        const secQs = qs.filter((q) => (q.sectionName ?? "") === sec.name);
        const byType: Record<string, number> = {};
        for (const q of secQs) byType[q.question_type] = (byType[q.question_type] ?? 0) + 1;
        const { optional, ...rest } = sec; // strip best-N-of-M rule
        void optional;
        return {
          ...rest,
          totalQuestions: secQs.length,
          maxScore: secQs.length * MARK,
          negativePerMark: NEG,
          markDistribution: Object.entries(byType).map(([type, count]) => ({ type, count, marks: MARK })),
        };
      });
    }

    console.log(`${t.title.padEnd(34)}  ${t.total_questions}Q  ${t.max_score} -> ${newMax}`);
    changed++;
    if (!DRY) {
      await withRetry(() =>
        prisma.mockTestTemplate.update({
          where: { id: t.id },
          data: { max_score: newMax, questions: qs, ...(sections ? { sections } : {}) },
        })
      );
    }
  }
  console.log(`\n${DRY ? "Would update" : "Updated"} ${changed} template(s).`);
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
