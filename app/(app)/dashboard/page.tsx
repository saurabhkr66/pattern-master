import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard – PatternMaster",
  description: "Track your GATE CSE prep progress, accuracy, streaks and review wrong answers.",
};

// Cache dashboard data per user for 30 seconds
function getCachedDashboardData(userId: string) {
  return unstable_cache(
    async () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [totalAttempted, correctAttempts, lastFiveAttempts, recentFailures, rawActivity] = await Promise.all([
        prisma.attempt.count({ where: { user_id: userId } }),
        prisma.attempt.count({ where: { user_id: userId, is_correct: true } }),
        prisma.attempt.findMany({
          where: { user_id: userId },
          include: {
            question: { include: { pattern: true } },
            pyq: { include: { pattern: true } }
          },
          orderBy: { created_at: "desc" },
          take: 5,
        }),
        prisma.attempt.findMany({
          where: { user_id: userId, is_correct: false },
          include: {
            question: { include: { pattern: true } },
            pyq: { include: { pattern: true } }
          },
          orderBy: { created_at: "desc" },
          take: 15,
        }),
        prisma.attempt.findMany({
          where: { user_id: userId, created_at: { gte: sixMonthsAgo } },
          select: { created_at: true },
        }),
      ]);

      const activityData: Record<string, number> = {};
      rawActivity.forEach((attempt) => {
        const date = new Date(attempt.created_at).toISOString().split("T")[0];
        activityData[date] = (activityData[date] || 0) + 1;
      });

      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);
      const toISO = (d: Date) => d.toISOString().split("T")[0];
      if (!activityData[toISO(checkDate)]) checkDate.setDate(checkDate.getDate() - 1);
      while (activityData[toISO(checkDate)]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return { totalAttempted, correctAttempts, lastFiveAttempts, recentFailures, activityData, currentStreak };
    },
    [`dashboard-${userId}`],
    { revalidate: 30, tags: ["dashboard"] }
  )();
}

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { totalAttempted, correctAttempts, lastFiveAttempts, recentFailures, activityData, currentStreak } =
    await getCachedDashboardData(userId);

  const accuracy = totalAttempted > 0 ? Math.round((correctAttempts / totalAttempted) * 100) : 0;

  const reviewItems = recentFailures.map((a: any) => {
    const q = a.question ?? a.pyq;
    const pattern = q?.pattern;
    return {
      id: a.id,
      question_text: q?.question_text,
      correct_answer: q?.correct_answer,
      explanation: q?.explanation,
      topic_name: pattern?.topic_name,
      subject: pattern?.subject,
      pattern_id: pattern?.id,
    };
  }).filter((r: any) => r.question_text);

  const wrongCount = recentFailures.length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase" style={{ color: "var(--text-primary)" }}>
          Progress Dashboard
        </h1>
        <p className="text-sm mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>
          Your preparation snapshot at a glance.
        </p>
      </div>

      {/* Stat Cards — 1 col on smallest phones, 3 col from sm up */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-5 mb-10">

        <div className="rounded-2xl p-4 md:p-6 border flex sm:flex-col flex-row sm:gap-1 gap-4 items-center sm:items-start" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Answered</span>
          <span className="text-3xl md:text-4xl font-black" style={{ color: "var(--text-primary)" }}>{totalAttempted}</span>
          <span className="text-xs font-bold hidden sm:inline" style={{ color: "var(--text-muted)" }}>questions total</span>
        </div>

        <div className="rounded-2xl p-4 md:p-6 border flex sm:flex-col flex-row sm:gap-1 gap-4 items-center sm:items-start" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Accuracy</span>
          <span className={`text-3xl md:text-4xl font-black ${accuracy >= 70 ? "text-emerald-500" : "text-amber-500"}`}>{accuracy}%</span>
          <span className="text-xs font-bold hidden sm:inline" style={{ color: "var(--text-muted)" }}>{correctAttempts} correct</span>
        </div>

        <div className="rounded-2xl p-4 md:p-6 border flex sm:flex-col flex-row sm:gap-1 gap-4 items-center sm:items-start" style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}>
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Streak</span>
          <span className="text-3xl md:text-4xl font-black text-orange-500">{currentStreak}</span>
          <span className="text-xs font-bold hidden sm:inline" style={{ color: "var(--text-muted)" }}>day{currentStreak !== 1 ? "s" : ""} in a row</span>
        </div>

      </div>

      {/* Heatmap */}
      <ActivityHeatmap data={activityData} currentStreak={currentStreak} />

      {/* Feed + Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">

        {/* Recent Feed */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest mb-4" style={{ color: "var(--text-secondary)" }}>
            Recent Activity
          </h2>
          {totalAttempted === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium italic" style={{ color: "var(--text-muted)" }}>No activity yet. Solve some questions first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lastFiveAttempts.map((attempt: any) => {
                const topicName = attempt.question?.pattern?.topic_name ?? attempt.pyq?.pattern?.topic_name ?? "—";
                const subject = attempt.question?.pattern?.subject ?? attempt.pyq?.pattern?.subject ?? "";
                const dateStr = new Date(attempt.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between rounded-xl px-4 py-3 border"
                    style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: "var(--text-primary)" }}>{topicName}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{subject} · {dateStr}</p>
                    </div>
                    {attempt.is_correct ? (
                      <span className="shrink-0 ml-3 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 uppercase tracking-wide">✓ Correct</span>
                    ) : (
                      <span className="shrink-0 ml-3 text-[10px] font-black px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 uppercase tracking-wide">✕ Wrong</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Critical Review */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
              Critical Review
            </h2>
            {wrongCount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 uppercase">
                {wrongCount} wrong
              </span>
            )}
          </div>
          {reviewItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed p-8 text-center" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium italic text-emerald-600">All clear! No topics need review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewItems.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: "var(--bg-surface-2)", borderColor: "var(--border)" }}>
                    <div className="min-w-0">
                      <p className="font-black text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.topic_name}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">{item.subject}</p>
                    </div>
                    <a
                      href={`/practice?patternId=${item.pattern_id}`}
                      className="shrink-0 ml-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wide"
                    >
                      Solve Again
                    </a>
                  </div>
                  {/* Card Body */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold leading-relaxed line-clamp-2" style={{ color: "var(--text-secondary)" }}>{item.question_text}</p>
                    <p className="text-[11px] font-black text-emerald-600">Answer: {item.correct_answer}</p>
                    {item.explanation && (
                      <p className="text-[11px] leading-relaxed line-clamp-2 italic" style={{ color: "var(--text-muted)" }}>{item.explanation}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
