import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getResolvedTestQuestions } from "@/lib/coachingQuestionCache";
import { scoreQuestion } from "@/lib/resolveQuestions";
import { subjectiveEntryMarks, type StoredAnswers, type SectionScore } from "@/lib/coachingScore";
import { isSubjectiveEntry } from "@/lib/subjectiveTypes";

// Whole-class report for ONE test, shown on the admin results page's Analytics
// tab. Everything derives from data already stored — no schema change:
//   • per-question / per-topic correctness is recomputed from TestAttempt.answers
//     using the SAME primitives finalize uses (scoreQuestion + subjectiveEntryMarks),
//     so the analytics can never disagree with the displayed scores.
//   • section tallies reuse the pre-computed TestAttempt.section_scores.
// Cached per test for 120s (time-based, same rationale as getCoachingInsights:
// stays warm during an exam-day submission spike; freshness within 2 min is fine).

const QUESTION_TEXT_MAX = 90;
const UNTAGGED = "Untagged";

export type ClassParticipation = {
  active: number;
  submitted: number;
  inProgress: number;
  absent: number;
  completionPct: number;
};
export type DistBand = { label: string; count: number };
export type SectionStat = {
  name: string;
  avgPct: number;
  correct: number;
  wrong: number;
  skipped: number;
};
export type TopicStat = {
  topic: string;
  questions: number;
  seen: number;
  correct: number;
  wrong: number;
  skipped: number;
  correctPct: number;
};
export type ItemStat = {
  id: string;
  index: number; // 1-based position in the paper
  text: string;
  topic: string | null;
  type: string;
  seen: number; // students who were served this question
  correct: number;
  wrong: number;
  skipped: number;
  pending: number; // subjective answers awaiting grading (excluded from %)
  correctPct: number;
  // Subjective-only: average marks awarded (null for objective questions).
  avgMarks: number | null;
  maxMarks: number | null;
};
export type TestClassAnalytics = {
  participation: ClassParticipation;
  avgScorePct: number;
  distribution: DistBand[];
  sections: SectionStat[];
  topics: TopicStat[]; // weakest first
  items: ItemStat[]; // hardest first
};

type Tally = { correct: number; wrong: number; skipped: number; pending: number; seen: number; marksSum: number; maxMarksSum: number };
const newTally = (): Tally => ({ correct: 0, wrong: 0, skipped: 0, pending: 0, seen: 0, marksSum: 0, maxMarksSum: 0 });

const DIST_BANDS = ["0–20%", "20–40%", "40–60%", "60–80%", "80–100%"];

function truncate(s: string): string {
  const t = s.trim();
  return t.length > QUESTION_TEXT_MAX ? `${t.slice(0, QUESTION_TEXT_MAX)}…` : t;
}

// % correct over students who actually saw the question (excludes pending).
function correctPct(t: Tally): number {
  const decided = t.seen - t.pending;
  return decided > 0 ? Math.round((t.correct / decided) * 100) : 0;
}

export function getTestClassAnalytics(
  testId: string,
  coachingId: string
): Promise<TestClassAnalytics | null> {
  return unstable_cache(
    async (): Promise<TestClassAnalytics | null> => {
      const [test, activeCount] = await Promise.all([
        prisma.coachingTest.findFirst({
          where: { id: testId, coaching_id: coachingId },
          select: { id: true, questions: true, pool_size: true },
        }),
        prisma.student.count({ where: { coaching_id: coachingId, active: true } }),
      ]);
      if (!test) return null;

      const [resolved, attempts] = await Promise.all([
        getResolvedTestQuestions(test, coachingId),
        prisma.testAttempt.findMany({
          where: { test_id: testId, coaching_id: coachingId },
          select: {
            status: true,
            student_id: true,
            answers: true,
            score: true,
            max_score: true,
            section_scores: true,
            question_times: true,
          },
        }),
      ]);

      const submitted = attempts.filter((a) => a.status === "submitted");
      const inProgress = attempts.length - submitted.length;
      const submittedStudents = new Set(submitted.map((a) => a.student_id)).size;
      const participation: ClassParticipation = {
        active: activeCount,
        submitted: submitted.length,
        inProgress,
        absent: Math.max(0, activeCount - submittedStudents - inProgress),
        completionPct: activeCount > 0 ? Math.round((submittedStudents / activeCount) * 100) : 0,
      };

      // Pooled tests serve each student a random subset, so a question's
      // denominator is "students who saw it" (present in question_times/answers),
      // not the whole class. Fixed papers → everyone saw everything.
      const pooled = test.pool_size != null && test.pool_size > 0;

      const itemTally = new Map<string, Tally>();
      const topicTally = new Map<string, Tally>();
      const topicQuestionCount = new Map<string, number>();
      for (const q of resolved) {
        itemTally.set(q.id, newTally());
        const topic = q.topic || UNTAGGED;
        topicQuestionCount.set(topic, (topicQuestionCount.get(topic) ?? 0) + 1);
      }

      // Score distribution + per-question/topic outcomes across submitted attempts.
      const distCounts = [0, 0, 0, 0, 0];
      let scorePctSum = 0;
      for (const a of submitted) {
        const max = a.max_score ?? 0;
        const pct = max > 0 ? ((a.score ?? 0) / max) * 100 : 0;
        scorePctSum += pct;
        distCounts[Math.min(4, Math.max(0, Math.floor(pct / 20)))]++;

        const answers = (a.answers ?? {}) as StoredAnswers;
        const times = (a.question_times ?? {}) as Record<string, number>;

        for (const q of resolved) {
          const seen = pooled ? q.id in times || q.id in answers : true;
          if (!seen) continue;

          const item = itemTally.get(q.id)!;
          const topic = topicTally.get(q.topic || UNTAGGED) ?? newTally();
          topicTally.set(q.topic || UNTAGGED, topic);
          item.seen++;
          topic.seen++;

          const v = answers[q.id];
          let outcome: "correct" | "wrong" | "skipped" | "pending";
          if (q.question_type === "subjective") {
            if (!isSubjectiveEntry(v) || v.image_keys.length === 0) {
              outcome = "skipped";
            } else {
              const { marks, pending } = subjectiveEntryMarks(v, q.marks);
              outcome = pending ? "pending" : marks > 0 ? "correct" : "wrong";
              // Track actual marks for subjective depth (avg marks per question).
              if (!pending) {
                item.marksSum += marks;
                item.maxMarksSum += q.marks;
                topic.marksSum += marks;
                topic.maxMarksSum += q.marks;
              }
            }
          } else {
            const ua = typeof v === "string" ? v : "";
            if (ua.trim() === "") outcome = "skipped";
            else outcome = (scoreQuestion(q, ua) ?? 0) > 0 ? "correct" : "wrong";
          }
          item[outcome]++;
          topic[outcome]++;
        }
      }

      // Section performance — fold the pre-computed per-attempt section_scores.
      const secAcc = new Map<
        string,
        { score: number; maxScore: number; correct: number; wrong: number; skipped: number }
      >();
      for (const a of submitted) {
        const secs = (a.section_scores ?? null) as SectionScore[] | null;
        if (!secs) continue;
        for (const s of secs) {
          const acc = secAcc.get(s.name) ?? { score: 0, maxScore: 0, correct: 0, wrong: 0, skipped: 0 };
          acc.score += s.score;
          acc.maxScore += s.maxScore;
          acc.correct += s.correct;
          acc.wrong += s.wrong;
          acc.skipped += s.skipped;
          secAcc.set(s.name, acc);
        }
      }
      const sections: SectionStat[] = [...secAcc.entries()].map(([name, a]) => ({
        name,
        avgPct: a.maxScore > 0 ? Math.round((a.score / a.maxScore) * 100) : 0,
        correct: a.correct,
        wrong: a.wrong,
        skipped: a.skipped,
      }));

      const topics: TopicStat[] = [...topicTally.entries()]
        .map(([topic, t]) => ({
          topic,
          questions: topicQuestionCount.get(topic) ?? 0,
          seen: t.seen,
          correct: t.correct,
          wrong: t.wrong,
          skipped: t.skipped,
          correctPct: correctPct(t),
        }))
        .sort((a, b) => a.correctPct - b.correctPct); // weakest first

      const items: ItemStat[] = resolved
        .map((q, i) => {
          const t = itemTally.get(q.id)!;
          const isSubj = q.question_type === "subjective";
          const gradedCount = t.maxMarksSum > 0 ? Math.round(t.maxMarksSum / q.marks) : 0;
          return {
            id: q.id,
            index: i + 1,
            text: truncate(q.question_text),
            topic: q.topic,
            type: q.question_type,
            seen: t.seen,
            correct: t.correct,
            wrong: t.wrong,
            skipped: t.skipped,
            pending: t.pending,
            correctPct: correctPct(t),
            avgMarks: isSubj && gradedCount > 0 ? Math.round((t.marksSum / gradedCount) * 10) / 10 : null,
            maxMarks: isSubj ? q.marks : null,
          };
        })
        .sort((a, b) => a.correctPct - b.correctPct); // hardest first

      return {
        participation,
        avgScorePct: submitted.length > 0 ? Math.round(scorePctSum / submitted.length) : 0,
        distribution: DIST_BANDS.map((label, i) => ({ label, count: distCounts[i] })),
        sections,
        topics,
        items,
      };
    },
    // testId/coachingId are closures, not args — they MUST be in the key parts.
    ["test-class-analytics", testId, coachingId],
    { revalidate: 120, tags: [`test-analytics:${testId}`] }
  )();
}
