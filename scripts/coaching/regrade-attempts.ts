/**
 * Re-grade submitted coaching attempts with the FIXED scorer (neg_marks treated
 * as a positive magnitude). Recomputes score + max_score from the answers already
 * stored on each attempt (answers are stored in original-option space, so no
 * de-shuffle is needed here) and updates the row.
 *
 * Run:  npx tsx scripts/coaching/regrade-attempts.ts            (all submitted)
 *       npx tsx scripts/coaching/regrade-attempts.ts <attemptId>
 *       add --dry to preview without writing.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DRY = process.argv.includes("--dry");

function normType(t: string): "mcq" | "msq" | "nat" | "subjective" {
  const u = String(t).toUpperCase();
  if (u === "MSQ") return "msq";
  if (u === "NAT") return "nat";
  if (u === "SUBJECTIVE") return "subjective";
  return "mcq";
}

// Mirrors lib/resolveQuestions.scoreQuestion (with the neg_marks abs() fix).
function scoreQuestion(
  q: { type: string; correct: string; marks: number; neg: number; tol: number | null },
  userAnswer: string
): number | null {
  const answer = (userAnswer ?? "").trim();
  const type = normType(q.type);
  if (type === "subjective") return null;
  if (type === "nat") {
    if (answer === "") return 0;
    const got = parseFloat(answer);
    const want = parseFloat(q.correct);
    if (!Number.isFinite(got) || !Number.isFinite(want)) return 0;
    return Math.abs(got - want) <= (q.tol ?? 0) ? q.marks : 0;
  }
  if (type === "msq") {
    if (answer === "") return 0;
    const sel = new Set(answer.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean));
    const correct = q.correct.split(/[;,]/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const correctSet = new Set(correct);
    const anyWrong = [...sel].some((l) => !correctSet.has(l));
    const allRight = correct.every((l) => sel.has(l)) && sel.size === correct.length;
    return !anyWrong && allRight ? q.marks : 0;
  }
  if (answer === "") return 0;
  return answer.toUpperCase() === q.correct.trim().toUpperCase() ? q.marks : -Math.abs(q.neg);
}

async function loadQ(id: string, source: string) {
  if (source === "pyq") {
    const r = await prisma.pYQ.findUnique({ where: { id }, select: { correct_answer: true, question_type: true, marks: true } });
    return r && { correct: r.correct_answer ?? "", type: r.question_type, marks: r.marks ?? 1, tol: null as number | null };
  }
  if (source === "generated") {
    const r = await prisma.generatedQuestion.findUnique({ where: { id }, select: { correct_answer: true, question_type: true, marks: true } });
    return r && { correct: r.correct_answer ?? "", type: r.question_type, marks: r.marks ?? 1, tol: null as number | null };
  }
  const r = await prisma.coachingQuestion.findUnique({ where: { id }, select: { correct_answer: true, question_type: true, max_marks: true, nat_tolerance: true } });
  return r && { correct: r.correct_answer ?? "", type: r.question_type, marks: r.max_marks ?? 1, tol: r.nat_tolerance ?? 0 };
}

async function main() {
  const arg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
  const attempts = await prisma.testAttempt.findMany({
    where: { status: "submitted", ...(arg ? { id: arg } : {}) },
    select: { id: true, test_id: true, answers: true, score: true, max_score: true },
  });
  console.log(`Re-grading ${attempts.length} attempt(s)${DRY ? " (DRY RUN)" : ""}\n`);

  for (const a of attempts) {
    const test = await prisma.coachingTest.findUnique({
      where: { id: a.test_id },
      select: { title: true, questions: true },
    });
    if (!test) continue;
    const refs = (Array.isArray(test.questions) ? test.questions : []) as Array<{
      id: string; source?: string; marks?: number; neg_marks?: number;
    }>;
    const refById = new Map(refs.map((r) => [r.id, r]));
    const answers = (a.answers ?? {}) as Record<string, string>;

    let score = 0;
    let maxScore = 0;
    for (const [qid, ans] of Object.entries(answers)) {
      const ref = refById.get(qid);
      if (!ref) continue;
      const q = await loadQ(qid, ref.source ?? "coaching");
      if (!q) continue;
      const marks = Number.isFinite(Number(ref.marks)) ? Number(ref.marks) : q.marks;
      const neg = Number(ref.neg_marks) || 0;
      maxScore += marks;
      const s = scoreQuestion({ type: q.type, correct: q.correct, marks, neg, tol: q.tol }, ans);
      if (s != null) score += s;
    }
    score = Math.max(0, score); // floor at 0, matching gradeAndWrite

    const changed = score !== a.score || maxScore !== a.max_score;
    console.log(
      `${a.id}  "${test.title}"  ${a.score}/${a.max_score} -> ${score}/${maxScore}  ${changed ? "(updated)" : "(unchanged)"}`
    );
    if (changed && !DRY) {
      await prisma.testAttempt.update({ where: { id: a.id }, data: { score, max_score: maxScore } });
    }
  }
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
