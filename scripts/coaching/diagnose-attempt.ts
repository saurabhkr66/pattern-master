/**
 * READ-ONLY diagnostic. Dumps the most recent submitted coaching TestAttempt
 * per-question: stored answer vs correct answer vs recomputed score — so we can
 * see exactly where the analysis "wrong shows correct" divergence comes from.
 *
 * Run:  npx tsx scripts/coaching/diagnose-attempt.ts [attemptId]
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── minimal copies of the real scorer / option helpers (the originals are
//    "server-only" and can't be imported into a plain node script) ──
function scoreMcq(answer: string, correct: string, marks: number, neg: number): number {
  if (answer.trim() === "") return 0;
  // mirrors the fixed scoreQuestion: penalty is abs(neg), never a positive award
  return answer.trim().toUpperCase() === correct.trim().toUpperCase() ? marks : -Math.abs(neg);
}

function normalizeCoachingOptions(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  return [...raw]
    .filter((o) => o && typeof o.text === "string")
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .map((o) => o.text);
}

async function main() {
  const attemptId = process.argv[2];
  const attempt = attemptId
    ? await prisma.testAttempt.findUnique({ where: { id: attemptId } })
    : await prisma.testAttempt.findFirst({
        where: { status: "submitted" },
        orderBy: { submitted_at: "desc" },
      });

  if (!attempt) {
    console.log("No submitted attempt found.");
    return;
  }

  const test = await prisma.coachingTest.findUnique({
    where: { id: attempt.test_id },
    select: { id: true, title: true, shuffle: true, pool_size: true, questions: true },
  });
  if (!test) {
    console.log("Test not found for attempt", attempt.id);
    return;
  }

  const refs = (Array.isArray(test.questions) ? test.questions : []) as Array<{
    id: string;
    source?: string;
    marks?: number;
    neg_marks?: number;
  }>;
  const answers = (attempt.answers ?? {}) as Record<string, string>;

  console.log("─".repeat(78));
  console.log(`Attempt:  ${attempt.id}`);
  console.log(`Test:     ${test.title}  (shuffle=${test.shuffle}, pool=${test.pool_size})`);
  console.log(`Stored:   score=${attempt.score} / max=${attempt.max_score}`);
  console.log(`Answers stored:`, JSON.stringify(answers));
  console.log("─".repeat(78));

  let recomputed = 0;
  for (const ref of refs) {
    const src = ref.source ?? "coaching";
    let q: any = null;
    if (src === "coaching") {
      q = await prisma.coachingQuestion.findUnique({ where: { id: ref.id } });
    } else if (src === "pyq") {
      q = await prisma.pYQ.findUnique({ where: { id: ref.id } });
    } else if (src === "generated") {
      q = await prisma.generatedQuestion.findUnique({ where: { id: ref.id } });
    }
    if (!q) {
      console.log(`  [${ref.id}]  (${src})  — NOT FOUND`);
      continue;
    }

    const type = String(q.question_type).toUpperCase();
    const correct = String(q.correct_answer ?? "");
    const stored = String(answers[ref.id] ?? "");
    const marks = ref.marks ?? q.max_marks ?? q.marks ?? 1;
    const neg = ref.neg_marks ?? 0;
    const opts =
      src === "coaching" ? normalizeCoachingOptions(q.options) : (q.options as string[]);

    let awarded = 0;
    if (type === "MCQ") awarded = scoreMcq(stored, correct, marks, neg);
    const verdict =
      stored === "" ? "SKIPPED" : awarded > 0 ? "✅ CORRECT" : "❌ WRONG";

    recomputed += awarded > 0 ? awarded : 0;
    const eq = stored.trim().toUpperCase() === correct.trim().toUpperCase();
    console.log(
      `  [${ref.id.slice(0, 8)}] ${type}  stored=${JSON.stringify(stored)} (len${stored.length})  correct=${JSON.stringify(correct)} (len${correct.length})  eq=${eq}  -> ${verdict} (${awarded})`
    );
    if (Array.isArray(opts)) console.log(`       options: ${JSON.stringify(opts)}`);
  }

  console.log("─".repeat(78));
  console.log(`Recomputed positive total: ${recomputed}  (stored score: ${attempt.score})`);
  console.log("─".repeat(78));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
