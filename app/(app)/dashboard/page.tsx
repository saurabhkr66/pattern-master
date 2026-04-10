import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import ActivityHeatmap from "@/components/dashboard/ActivityHeatmap";

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
          where: {
            user_id: userId,
            created_at: { gte: sixMonthsAgo }
          },
          select: { created_at: true },
        }),
      ]);

      // Aggregate activity data by date (YYYY-MM-DD)
      const activityData: Record<string, number> = {};
      rawActivity.forEach((attempt) => {
        const date = new Date(attempt.created_at).toISOString().split("T")[0];
        activityData[date] = (activityData[date] || 0) + 1;
      });

      // Calculate Current Streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);
      const toISO = (d: Date) => d.toISOString().split("T")[0];

      // If no activity today, check if yesterday was the end of a streak
      if (!activityData[toISO(checkDate)]) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

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

  if (!userId) {
    redirect("/sign-in");
  }

  const { totalAttempted, correctAttempts, lastFiveAttempts, recentFailures, activityData, currentStreak } = 
    await getCachedDashboardData(userId);

  const accuracy = totalAttempted > 0 ? Math.round((correctAttempts / totalAttempted) * 100) : 0;

  // Build review items from recent wrong attempts
  const reviewItems = recentFailures.map((a: any) => {
    const isGenerated = !!a.question;
    const q = isGenerated ? a.question : a.pyq;
    const pattern = q?.pattern;
    return { id: a.id, question_text: q?.question_text, correct_answer: q?.correct_answer, explanation: q?.explanation, topic_name: pattern?.topic_name, subject: pattern?.subject, pattern_id: pattern?.id };
  }).filter((r: any) => r.question_text);

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Progress Dashboard</h1>
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Questions Answered</h3>
          <p className="text-4xl font-bold text-gray-900">{totalAttempted}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Overall Accuracy</h3>
          <p className={`text-4xl font-bold ${accuracy >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
            {accuracy}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Current Streak</h3>
          <p className="text-4xl font-bold text-blue-600">{currentStreak} {currentStreak === 1 ? 'Day' : 'Days'} 🔥</p>
        </div>
      </div>
      
      {/* Activity Heatmap */}
      <ActivityHeatmap data={activityData} currentStreak={currentStreak} />

      {/* Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
        
        {/* RECENT FEED (Left Wall) */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>🕘</span> Recent Feed
          </h2>
          {totalAttempted === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
              <p className="text-gray-400 text-sm font-medium italic">Empty feed. Solve some questions first!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lastFiveAttempts.map((attempt: any) => (
                <div key={attempt.id} className="flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {attempt.question ? attempt.question.pattern.topic_name : attempt.pyq?.pattern.topic_name}
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(attempt.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt.is_correct ? (
                      <span className="bg-green-100 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">✓ Correct</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">✕ Wrong</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEEDS REVIEW (Right Wall) */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>🔥</span> Critical Review
          </h2>
          {reviewItems.length === 0 ? (
            <div className="bg-green-50 border-2 border-dashed border-green-200 rounded-2xl p-8 text-center">
              <p className="text-green-600 text-sm font-medium italic">Perfect score! No topics need review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewItems.map((item: any) => (
                <div key={item.id} className="bg-white border-2 border-red-50 p-5 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-black text-gray-900 leading-tight mb-1">{item.topic_name}</h4>
                      <p className="text-[10px] bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded-md inline-block uppercase">{item.subject}</p>
                    </div>
                    <a
                      href={`/practice?patternId=${item.pattern_id}`}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2 rounded-lg transition-transform active:scale-95 shadow-lg shadow-blue-200 uppercase"
                    >
                      Solve Again →
                    </a>
                  </div>
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100 space-y-2">
                    <p className="text-[11px] text-gray-800 font-semibold leading-relaxed">{item.question_text}</p>
                    <p className="text-[11px] text-green-700 font-bold">Correct Answer: {item.correct_answer}</p>
                    {item.explanation && (
                      <p className="text-[11px] text-red-600 italic leading-relaxed">{item.explanation}</p>
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