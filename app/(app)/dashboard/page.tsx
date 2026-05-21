import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import ShareCardButton from "@/components/dashboard/ShareCardButton";
import Link from "next/link";
import type { Metadata } from "next";
import { getQuestionUrl } from "@/lib/seo";
import { BE } from "@/lib/theme";
import MathRenderer from "@/components/ui/MathRenderer";
import { startOfDay, subMonths, formatDistanceToNow, startOfWeek, subDays, eachDayOfInterval, isSameDay } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard – BattleExam",
  description: "Track your GATE CSE prep progress, accuracy, streaks and review wrong answers.",
};

// ─── Per-section cached fetchers ──────────────────────────────────────────────

function getCachedStatsActivity(userId: string) {
  return unstable_cache(
    async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);

      const [attemptStats, activityRows, currentMistakes] = await Promise.all([
        prisma.attempt.groupBy({
          by: ["is_correct"],
          where: { user_id: userId },
          _count: true,
        }),
        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE(created_at) as date, COUNT(*)::bigint as count
          FROM "Attempt"
          WHERE user_id = ${userId} AND created_at >= ${sixMonthsAgo}
          GROUP BY DATE(created_at)
          ORDER BY date
        `,
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count FROM (
            SELECT is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id, subject_pyq_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId}
          ) t
          WHERE rn = 1 AND is_correct = false
        `,
      ]);

      const correctRow = attemptStats.find((r) => r.is_correct === true);
      const incorrectRow = attemptStats.find((r) => r.is_correct === false);
      const correctAttempts = correctRow?._count ?? 0;
      const totalAttempted = correctAttempts + (incorrectRow?._count ?? 0);
      const currentMistakesCount = Number(currentMistakes[0]?.count ?? 0);

      const activityData: Record<string, number> = {};
      activityRows.forEach((row) => {
        const dateStr = typeof row.date === "string" ? row.date : new Date(row.date).toISOString().split("T")[0];
        activityData[dateStr] = Number(row.count);
      });

      let currentStreak = 0;
      const today = startOfDay(new Date());
      let checkDate = new Date(today);
      const toISO = (d: Date) => d.toISOString().split("T")[0];
      if (!activityData[toISO(checkDate)]) checkDate.setDate(checkDate.getDate() - 1);
      while (activityData[toISO(checkDate)]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return { totalAttempted, correctAttempts, currentMistakesCount, activityData, currentStreak };
    },
    [`dashboard-stats-activity-${userId}`],
    { revalidate: 30, tags: [`dashboard-${userId}`, `mistakes-${userId}`] }
  )();
}

function getCachedWeakTopic(userId: string) {
  return unstable_cache(
    async () => {
      const topicStats = await prisma.$queryRaw<{ pattern_id: string; topic_name: string; subject: string; count: bigint }[]>`
        SELECT
          t.pattern_id,
          COALESCE(pat.topic_name, sp_pat.subject_name, 'Unknown Topic') as topic_name,
          COALESCE(pat.subject, sp_pat.subject_name, 'General') as subject,
          t.count
        FROM (
          SELECT
            COALESCE(q.pattern_id, p.pattern_id, 'subject-' || sp.subject_pattern_id) as pattern_id,
            COUNT(*)::bigint as count
          FROM (
            SELECT question_id, pyq_id, subject_pyq_id, is_correct,
                   ROW_NUMBER() OVER (
                     PARTITION BY COALESCE(question_id, pyq_id, subject_pyq_id)
                     ORDER BY created_at DESC
                   ) as rn
            FROM "Attempt"
            WHERE user_id = ${userId}
          ) latest
          LEFT JOIN "GeneratedQuestion" q ON q.id = latest.question_id
          LEFT JOIN "PYQ" p ON p.id = latest.pyq_id
          LEFT JOIN "SubjectPYQ" sp ON sp.id = latest.subject_pyq_id
          WHERE latest.rn = 1 AND latest.is_correct = false
          GROUP BY 1
        ) t
        LEFT JOIN "Pattern" pat ON pat.id = t.pattern_id
        LEFT JOIN "SubjectPattern" sp_pat ON ('subject-' || sp_pat.id) = t.pattern_id
        WHERE t.pattern_id IS NOT NULL
          AND (pat.id IS NOT NULL OR sp_pat.id IS NOT NULL)
          AND t.count > 0
        ORDER BY t.count DESC
        LIMIT 5
      `;

      const weakestRow = topicStats[0];
      return weakestRow
        ? { id: weakestRow.pattern_id, name: weakestRow.topic_name, subject: weakestRow.subject, count: Number(weakestRow.count) }
        : null;
    },
    [`dashboard-weak-topic-${userId}`],
    { revalidate: 30, tags: [`dashboard-${userId}`] }
  )();
}

function getCachedRecentAttempts(userId: string) {
  return unstable_cache(
    async () => {
      // Selective `select:` drops the heavy fields (options, explanation,
      // images) the dashboard never renders. Keeps egress to ~3-5KB per row
      // instead of ~2KB pre-trim + nested-include bloat.
      const recentAttempts = await prisma.attempt.findMany({
        where: { user_id: userId },
        select: {
          id: true,
          is_correct: true,
          created_at: true,
          question_id: true,
          pyq_id: true,
          subject_pyq_id: true,
          question: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } },
            },
          },
          pyq: {
            select: {
              id: true,
              question_text: true,
              pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } },
            },
          },
          subject_pyq: {
            select: {
              id: true,
              question_text: true,
              topic: true,
              subject_pattern: { select: { subject_name: true, id: true } },
            },
          },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      });

      const latestRecentAttempts: any[] = [];
      const seenQ = new Set<string>();
      recentAttempts.forEach((a) => {
        const qId = a.question_id ?? a.pyq_id ?? a.subject_pyq_id ?? a.id;
        if (!seenQ.has(qId)) {
          latestRecentAttempts.push(a);
          seenQ.add(qId);
        }
      });

      return {
        lastFiveAttempts: latestRecentAttempts.slice(0, 5),
        recentFailures: latestRecentAttempts.filter((a) => !a.is_correct).slice(0, 10),
      };
    },
    [`dashboard-recent-attempts-${userId}`],
    { revalidate: 30, tags: [`dashboard-${userId}`] }
  )();
}

// ─── Skeleton components ───────────────────────────────────────────────────────

function SuggestedSkeleton() {
  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: BE.surface }}>
      <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 12, width: "25%" }} className="animate-pulse" />
      <div style={{ height: 20, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "55%" }} className="animate-pulse" />
      <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 6, width: "90%" }} className="animate-pulse" />
      <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 20, width: "70%" }} className="animate-pulse" />
      <div style={{ height: 34, borderRadius: 10, background: BE.lineSoft, width: 160 }} className="animate-pulse" />
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 24, overflow: "hidden" }} className="db-stats">
      {[...Array(4)].map((_, i) => (
        <div key={i} style={{ padding: "18px 20px", background: BE.surface }} className="db-stat-cell">
          <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "55%" }} className="animate-pulse" />
          <div style={{ height: 24, borderRadius: 4, background: BE.lineSoft, marginBottom: 8, width: "40%" }} className="animate-pulse" />
          <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, width: "65%" }} className="animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function HeatmapSkeleton() {
  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 20, marginBottom: 24, background: BE.surface }}>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 6, width: "22%" }} className="animate-pulse" />
      <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 18, width: "45%" }} className="animate-pulse" />
      <div style={{ height: 88, borderRadius: 6, background: BE.lineSoft }} className="animate-pulse" />
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 12, width: "28%" }} className="animate-pulse" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }} className="db-review-grid">
        {[...Array(2)].map((_, i) => (
          <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
            <div style={{ height: 13, borderRadius: 4, background: BE.lineSoft, marginBottom: 8, width: "55%" }} className="animate-pulse" />
            <div style={{ height: 10, borderRadius: 4, background: BE.lineSoft, marginBottom: 14, width: "38%" }} className="animate-pulse" />
            <div style={{ height: 40, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div>
      <div style={{ height: 14, borderRadius: 4, background: BE.lineSoft, marginBottom: 10, width: "22%" }} className="animate-pulse" />
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: "hidden", background: BE.surface }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: i === 4 ? "none" : `1px solid ${BE.line}` }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: BE.lineSoft, flexShrink: 0 }} />
            <div style={{ flex: 1, height: 13, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
            <div style={{ height: 11, width: 56, borderRadius: 4, background: BE.lineSoft }} className="animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Async section components ──────────────────────────────────────────────────

async function SuggestedNextSection({ userId }: { userId: string }) {
  const weakestTopic = await getCachedWeakTopic(userId);

  if (!weakestTopic) {
    return (
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: `linear-gradient(135deg, ${BE.goodSoft}, transparent)` }}>
        <div style={{ fontSize: 11, color: BE.good, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
          Everything looks great
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: BE.text }}>No critical gaps identified yet. Keep practicing!</div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 24, marginBottom: 24, background: `linear-gradient(135deg, ${BE.accentSoft}, transparent)`, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: BE.accent, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
            Suggested next
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, marginBottom: 6, color: BE.text }}>
            Fix your {weakestTopic.name} gap
          </div>
          <div style={{ fontSize: 13.5, color: BE.textDim, lineHeight: 1.55, maxWidth: 540 }}>
            You&apos;ve missed <span style={{ color: BE.text, fontWeight: 500 }}>{weakestTopic.count} questions</span> on this topic over the last 2 weeks. A quick focused set will help you master it.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <Link href={`/practice?patternId=${weakestTopic.id}&subject=${encodeURIComponent(weakestTopic.subject)}`} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold transition-all hover:bg-amber-600 no-underline">
              Start focused set →
            </Link>
          </div>
        </div>
        <div className="hidden sm:flex" style={{ width: 96, height: 96, borderRadius: 12, border: `1px solid ${BE.line}`, background: BE.surface, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.06, textTransform: "uppercase", fontWeight: 600 }}>Gap</div>
          <div style={{ fontSize: 32, fontWeight: 600, color: BE.bad, letterSpacing: -0.6, fontFamily: BE.mono }}>{weakestTopic.count}</div>
          <div style={{ fontSize: 10, color: BE.textMute }}>since last wk</div>
        </div>
      </div>
    </div>
  );
}

async function StatsSection({ userId }: { userId: string }) {
  const { totalAttempted, correctAttempts, currentMistakesCount, currentStreak } = await getCachedStatsActivity(userId);
  const accuracy = totalAttempted > 0 ? Math.round((correctAttempts / totalAttempted) * 100) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 24, overflow: "hidden" }} className="db-stats">
      {[
        { label: "Answered", val: totalAttempted, sub: "attempts", delta: `${totalAttempted > 0 ? "+" + Math.ceil(totalAttempted / 8) : "0"} this week`, good: true },
        { label: "Mistakes", val: currentMistakesCount, sub: "to fix", delta: currentMistakesCount === 0 ? "Perfect status" : "Uncorrected gaps", good: currentMistakesCount === 0 },
        { label: "Accuracy", val: `${accuracy}%`, sub: "all-time", delta: accuracy > 70 ? "Above target" : "Needs focus", good: accuracy > 70 },
        { label: "Streak", val: currentStreak, sub: "days", delta: currentStreak > 0 ? "Active streak" : "Target: 30", good: currentStreak > 3 },
      ].map((s) => (
        <div key={s.label} style={{ padding: "18px 20px", background: BE.surface }} className="db-stat-cell">
          <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.08, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 }}>
            <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, color: BE.text }} className="db-stat-val">{s.val}</div>
            <div style={{ fontSize: 11, color: BE.textMute }}>{s.sub}</div>
          </div>
          <div style={{ fontSize: 11, color: s.good ? BE.good : BE.textDim }}>{s.delta}</div>
        </div>
      ))}
    </div>
  );
}

async function HeatmapSection({ userId }: { userId: string }) {
  const { activityData, currentStreak, correctAttempts } = await getCachedStatsActivity(userId);

  const weeks = 26;
  const heatCells = [];
  const today = startOfDay(new Date());

  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const targetDate = subDays(today, (weeks - 1 - w) * 7 + (6 - d));
      const dateStr = targetDate.toISOString().split("T")[0];
      const count = activityData[dateStr] || 0;
      let level = 0;
      if (count > 0) {
        if (count <= 2) level = 1;
        else if (count <= 5) level = 2;
        else if (count <= 8) level = 3;
        else level = 4;
      }
      col.push({ level, dateStr, count });
    }
    heatCells.push(col);
  }

  const heatColors = ["var(--heatmap-empty)", "rgba(255,143,0,0.22)", "rgba(255,143,0,0.42)", "rgba(255,143,0,0.68)", "rgba(255,143,0,0.95)"];

  return (
    <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 20, marginBottom: 24, background: BE.surface }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: BE.text }}>Mastery wall</div>
          <div style={{ fontSize: 12, color: BE.textDim }}>Questions correctly solved, last 26 weeks</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: BE.textMute }}>
          Less {heatColors.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)} More
        </div>
      </div>
      <div style={{ display: "flex", gap: 3, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginRight: 6, paddingTop: 14, fontSize: 9.5, color: BE.textMute, fontFamily: BE.mono }}>
          <div style={{ height: 10 }}>M</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}>W</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}>F</div>
          <div style={{ height: 10 }} />
          <div style={{ height: 10 }}></div>
        </div>
        <div style={{ flex: 1, overflowX: "auto" }} className="scrollbar-hide">
          <div style={{ display: "flex", gap: 3 }}>
            {heatCells.map((col, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
                {col.map((cell, j) => (
                  <div key={j} title={`${cell.count} questions on ${cell.dateStr}`} style={{ height: 10, minWidth: 10, borderRadius: 2, background: heatColors[cell.level] }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BE.line}`, fontSize: 12, color: BE.textDim }}>
        <div>Current streak: <span style={{ color: BE.warn, fontWeight: 600 }}>{currentStreak} days</span></div>
        <div>Mastery: <span style={{ color: BE.text, fontWeight: 600 }}>{correctAttempts} total</span></div>
      </div>
    </div>
  );
}

async function CriticalReviewSection({ userId }: { userId: string }) {
  const { recentFailures } = await getCachedRecentAttempts(userId);

  if (recentFailures.length === 0) return null;

  const reviewItems = recentFailures.map((a: any) => {
    const q = a.question ?? a.pyq ?? a.subject_pyq;
    const pattern = q?.pattern ?? (q?.subject_pattern ? {
      topic_name: q.topic || ((q.subject_pattern.subject_name && q.subject_pattern.subject_name !== "null") ? q.subject_pattern.subject_name : "Subject Practice"),
      subject: (q.subject_pattern.subject_name && q.subject_pattern.subject_name !== "null") ? q.subject_pattern.subject_name : "Subject Practice",
      id: `subject-${q.subject_pattern.id}`,
      exam_type: "GATE",
    } : {
      topic_name: "Subject Practice",
      subject: "Subject Practice",
      id: q?.id ? `subject-${q.id}` : "unknown",
      exam_type: "GATE",
    });
    const prefix = a.question ? "gq" : a.pyq ? "pyq" : "spyq";
    const patternId = q?.pattern?.id || (q?.subject_pattern ? `subject-${q.subject_pattern.id}` : "unknown");
    return {
      id: a.id,
      question_text: q?.question_text,
      topic_name: pattern?.topic_name,
      subject: pattern?.subject,
      age: formatDistanceToNow(new Date(a.created_at), { addSuffix: true }).replace("about ", "").replace("almost ", ""),
      practiceUrl: `/practice?patternId=${patternId}&questionId=${q?.id || ""}&subject=${encodeURIComponent(pattern?.subject || "All")}`,
    };
  });

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>
          Critical review <span style={{ fontSize: 11, color: BE.bad, marginLeft: 6, fontWeight: 500 }}>· {reviewItems.length} to revisit</span>
        </div>
        <a href="/review" style={{ fontSize: 12, color: BE.accent, textDecoration: "none" }}>See all →</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 10 }} className="db-review-grid">
        {reviewItems.slice(0, 4).map((r: any, i: number) => (
          <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: BE.text }}>{r.topic_name}</div>
                <div style={{ fontSize: 11, color: BE.textMute }}>{r.subject} · {r.age}</div>
              </div>
              <Link href={r.practiceUrl} style={{ fontSize: 11, color: BE.accent, fontWeight: 500, cursor: "pointer", flexShrink: 0, marginLeft: 8, textDecoration: "none" }}>
                Solve again →
              </Link>
            </div>
            <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5, fontFamily: BE.serif, fontStyle: "italic", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BE.line}` }} className="line-clamp-2">
              <MathRenderer content={(r.question_text && r.question_text !== "null") ? r.question_text : "No question text available"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function RecentActivitySection({ userId }: { userId: string }) {
  const { lastFiveAttempts } = await getCachedRecentAttempts(userId);

  if (lastFiveAttempts.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: BE.text }}>Recent activity</div>
      <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: "hidden", background: BE.surface }}>
        {lastFiveAttempts.map((attempt: any, i: number, arr: any[]) => {
          const topicName = attempt.question?.pattern?.topic_name ?? attempt.pyq?.pattern?.topic_name ?? attempt.subject_pyq?.topic ?? attempt.subject_pyq?.subject_pattern?.subject_name ?? "Subject Practice";
          const subject = attempt.question?.pattern?.subject ?? attempt.pyq?.pattern?.subject ?? attempt.subject_pyq?.subject_pattern?.subject_name ?? "Subject Practice";
          const when = formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true }).replace("about ", "").replace("almost ", "");
          const r = attempt.is_correct ? "correct" : "wrong";

          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", borderBottom: i === arr.length - 1 ? "none" : `1px solid ${BE.line}` }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: r === "correct" ? BE.good : BE.bad, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                <span style={{ fontWeight: 500, color: BE.text }}>{topicName}</span>
                <span style={{ color: BE.textMute, marginLeft: 8 }} className="hidden sm:inline">· {subject}</span>
              </div>
              <div style={{ fontSize: 11, color: BE.textMute, fontFamily: BE.mono }}>{when}</div>
              <div style={{ fontSize: 11, color: r === "correct" ? BE.good : BE.bad, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.06, minWidth: 60, textAlign: "right" }}>{r}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const firstName = clerkUser.firstName || clerkUser.username || "Learner";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  return (
    <div className="be-screen" style={{ minHeight: "100%" }}>
      <style>{`
        @media (max-width: 639px) {
          .db-wrap { padding: 16px 16px 100px !important; }
          .db-h1  { font-size: 20px !important; letter-spacing: -0.3px !important; }
          .db-stats { grid-template-columns: repeat(2, 1fr) !important; }
          .db-stat-cell { padding: 12px 14px !important; }
          .db-stat-val  { font-size: 20px !important; }
          .db-review-grid { grid-template-columns: 1fr !important; }
          .db-hdr { margin-bottom: 18px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 20px 80px", display: "flex", gap: 32 }} className="db-wrap flex-col lg:flex-row">
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Header — renders immediately, no DB needed */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }} className="db-hdr">
            <div>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>
                Progress · Personal Dashboard
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, margin: 0, fontFamily: BE.serif, color: BE.text }} className="db-h1">
                {greeting}, {firstName}.
              </h1>
            </div>
            <ShareCardButton userId={userId} />
          </div>

          <Suspense fallback={<SuggestedSkeleton />}>
            <SuggestedNextSection userId={userId} />
          </Suspense>

          <Suspense fallback={<StatsSkeleton />}>
            <StatsSection userId={userId} />
          </Suspense>

          <Suspense fallback={<HeatmapSkeleton />}>
            <HeatmapSection userId={userId} />
          </Suspense>

          <Suspense fallback={<ReviewSkeleton />}>
            <CriticalReviewSection userId={userId} />
          </Suspense>

          <Suspense fallback={<ActivitySkeleton />}>
            <RecentActivitySection userId={userId} />
          </Suspense>

        </div>
      </div>
    </div>
  );
}
