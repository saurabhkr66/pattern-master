import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Owner-facing analytics for the /coaching-admin/insights page: who is weak,
// who is improving, who is absent. Everything derives from existing TestAttempt
// rows — no schema change. Cached per coaching for 120s (time-based only, same
// rationale as the dashboard: stays warm during an exam-day submission spike).
//
// "Absent" has no enrollment model to lean on (every active student is eligible
// for every test), so it means: an active student who never submitted a test
// whose window has CLOSED (status "closed" OR end_at in the past).

export type InsightStudent = { id: string; name: string; avgPct: number; testsTaken: number };
export type TrendStudent = { id: string; name: string; delta: number; from: number; to: number };
export type AbsentStudent = { id: string; name: string; missed: number; lastMissedTitle: string };

export type InsightsData = {
  weak: InsightStudent[];
  improving: TrendStudent[];
  absent: AbsentStudent[];
};

const TOP_N = 10;
const ATTEMPT_WINDOW_DAYS = 90; // bound the weak/improving scan to recent activity
const CLOSED_TESTS_SCAN = 30; // how many recent closed tests feed the absent calc

function pctOf(score: number | null, max: number | null): number {
  if (max == null || max <= 0 || score == null) return 0;
  return Math.round((score / max) * 100);
}

export function getCoachingInsights(coachingId: string): Promise<InsightsData> {
  return unstable_cache(
    async (): Promise<InsightsData> => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      const [submitted, activeStudents, closedTests] = await Promise.all([
        // Submitted attempts (recent window), oldest → newest so per-student
        // first/last is just the array order.
        prisma.testAttempt.findMany({
          where: {
            coaching_id: coachingId,
            status: "submitted",
            submitted_at: { gte: windowStart },
          },
          select: {
            student_id: true,
            score: true,
            max_score: true,
            student: { select: { name: true } },
          },
          orderBy: { submitted_at: "asc" },
        }),
        prisma.student.findMany({
          where: { coaching_id: coachingId, active: true },
          select: { id: true, name: true },
        }),
        // Tests whose window has closed (explicitly closed OR end_at passed),
        // most-recent first so the first miss we record is the latest one.
        prisma.coachingTest.findMany({
          where: {
            coaching_id: coachingId,
            OR: [{ status: "closed" }, { end_at: { lt: now } }],
          },
          select: { id: true, title: true },
          orderBy: { created_at: "desc" },
          take: CLOSED_TESTS_SCAN,
        }),
      ]);

      // ── weak + improving: group attempts by student ──────────────────────
      const byStudent = new Map<
        string,
        { name: string; pcts: number[] }
      >();
      for (const a of submitted) {
        const e = byStudent.get(a.student_id) ?? { name: a.student.name, pcts: [] };
        e.pcts.push(pctOf(a.score, a.max_score));
        byStudent.set(a.student_id, e);
      }

      const weak: InsightStudent[] = [...byStudent.entries()]
        .map(([id, e]) => ({
          id,
          name: e.name,
          testsTaken: e.pcts.length,
          avgPct: Math.round(e.pcts.reduce((s, p) => s + p, 0) / e.pcts.length),
        }))
        .sort((a, b) => a.avgPct - b.avgPct)
        .slice(0, TOP_N);

      const improving: TrendStudent[] = [...byStudent.entries()]
        .filter(([, e]) => e.pcts.length >= 2)
        .map(([id, e]) => {
          const from = e.pcts[0];
          const to = e.pcts[e.pcts.length - 1];
          return { id, name: e.name, from, to, delta: to - from };
        })
        .filter((t) => t.delta > 0)
        .sort((a, b) => b.delta - a.delta)
        .slice(0, TOP_N);

      // ── absent: active students who missed closed tests ──────────────────
      let absent: AbsentStudent[] = [];
      if (closedTests.length > 0 && activeStudents.length > 0) {
        const closedIds = closedTests.map((t) => t.id);
        const submittedForClosed = await prisma.testAttempt.findMany({
          where: {
            coaching_id: coachingId,
            status: "submitted",
            test_id: { in: closedIds },
          },
          select: { test_id: true, student_id: true },
        });

        // test_id → set of students who submitted it.
        const tookByTest = new Map<string, Set<string>>();
        for (const r of submittedForClosed) {
          const set = tookByTest.get(r.test_id) ?? new Set<string>();
          set.add(r.student_id);
          tookByTest.set(r.test_id, set);
        }

        absent = activeStudents
          .map((s) => {
            let missed = 0;
            let lastMissedTitle = "";
            // closedTests is newest-first, so the first miss is the latest one.
            for (const t of closedTests) {
              if (!tookByTest.get(t.id)?.has(s.id)) {
                missed++;
                if (!lastMissedTitle) lastMissedTitle = t.title;
              }
            }
            return { id: s.id, name: s.name, missed, lastMissedTitle };
          })
          .filter((s) => s.missed > 0)
          .sort((a, b) => b.missed - a.missed)
          .slice(0, TOP_N);
      }

      return { weak, improving, absent };
    },
    // coachingId is a closure, not an arg — it MUST be in the key parts.
    ["coaching-insights", coachingId],
    { revalidate: 120, tags: [`coaching-insights:${coachingId}`] }
  )();
}
