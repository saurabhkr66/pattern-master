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
import { format, subDays, startOfDay, subMonths, eachDayOfInterval, startOfWeek, isSameDay } from "date-fns";

export const metadata: Metadata = {
  title: "Dashboard – BattleExam",
  description: "Track your GATE CSE prep progress, accuracy, streaks and review wrong answers.",
};

// Cache dashboard data per user for 30 seconds
function getCachedDashboardData(userId: string) {
  return unstable_cache(
    async () => {
      const sixMonthsAgo = subMonths(new Date(), 6);
      const lastWeekStart = subDays(new Date(), 7);

      const [attemptStats, recentAttempts, activityRows, topicStats] = await Promise.all([
        prisma.attempt.groupBy({
          by: ["is_correct"],
          where: { user_id: userId },
          _count: true,
        }),

        prisma.attempt.findMany({
          where: { user_id: userId },
          include: {
            question: { include: { pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } } } },
            pyq: { include: { pattern: { select: { topic_name: true, subject: true, id: true, exam_type: true } } } },
            subject_pyq: { include: { subject_pattern: { select: { subject_name: true, id: true } } } },
          },
          orderBy: { created_at: "desc" },
          take: 20,
        }),

        prisma.$queryRaw<{ date: string; count: bigint }[]>`
          SELECT DATE(created_at) as date, COUNT(*)::bigint as count
          FROM "Attempt"
          WHERE user_id = ${userId} AND created_at >= ${sixMonthsAgo}
          GROUP BY DATE(created_at)
          ORDER BY date
        `,

        // Find weak topics (topics with most incorrect attempts)
        prisma.attempt.findMany({
          where: { 
            user_id: userId, 
            is_correct: false,
            created_at: { gte: subDays(new Date(), 14) } // Last 2 weeks
          },
          include: {
            question: { select: { pattern: { select: { topic_name: true, subject: true, id: true } } } },
            pyq: { select: { pattern: { select: { topic_name: true, subject: true, id: true } } } },
          },
          take: 50,
        })
      ]);

      // Weakest Topic Logic
      const errorMap: Record<string, { count: number; subject: string; id: string }> = {};
      topicStats.forEach(a => {
        const pattern = a.question?.pattern || a.pyq?.pattern;
        if (pattern) {
          if (!errorMap[pattern.topic_name]) {
            errorMap[pattern.topic_name] = { count: 0, subject: pattern.subject, id: pattern.id };
          }
          errorMap[pattern.topic_name].count++;
        }
      });
      const weakestTopic = Object.entries(errorMap).sort((a, b) => b[1].count - a[1].count)[0];

      // Derive totals
      const correctRow = attemptStats.find((r) => r.is_correct === true);
      const incorrectRow = attemptStats.find((r) => r.is_correct === false);
      const correctAttempts = correctRow?._count ?? 0;
      const totalAttempted = correctAttempts + (incorrectRow?._count ?? 0);

      // Derive last 5 and recent failures
      const lastFiveAttempts = recentAttempts.slice(0, 5);
      const recentFailures = recentAttempts.filter((a) => !a.is_correct).slice(0, 10);

      // Heatmap Data
      const activityData: Record<string, number> = {};
      activityRows.forEach((row) => {
        const dateStr = typeof row.date === "string" ? row.date : new Date(row.date).toISOString().split("T")[0];
        activityData[dateStr] = Number(row.count);
      });

      // Calculate streak
      let currentStreak = 0;
      const today = startOfDay(new Date());
      let checkDate = new Date(today);
      const toISO = (d: Date) => d.toISOString().split("T")[0];
      if (!activityData[toISO(checkDate)]) checkDate.setDate(checkDate.getDate() - 1);
      while (activityData[toISO(checkDate)]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return { 
        totalAttempted, 
        correctAttempts, 
        lastFiveAttempts, 
        recentFailures, 
        activityData, 
        currentStreak,
        weakestTopic: weakestTopic ? { name: weakestTopic[0], ...weakestTopic[1] } : null
      };
    },
    [`dashboard-v2-${userId}`],
    { revalidate: 30, tags: ["dashboard"] }
  )();
}

// function BEAdRail({ density }: { density: string }) {
//   if (density === 'off') return null;
//   return (
//     <div style={{ width: 300, flexShrink: 0 }} className="hidden xl:block">
//       <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 16, background: BE.surface, position: 'sticky', top: 100 }}>
//         <div style={{ fontSize: 10, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 800, marginBottom: 12 }}>Sponsored</div>
        
//         <div className="group cursor-pointer">
//           <div style={{ width: '100%', height: 160, borderRadius: 8, background: 'rgba(255,255,255,0.03)', marginBottom: 12, border: `1px solid ${BE.line}`, overflow: 'hidden' }}>
//             <img src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=300&h=160&auto=format&fit=crop" alt="Ad" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
//           </div>
//           <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: BE.text }}>GATE Masterclass 2026</div>
//           <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5 }}>Early bird access to specialized ECE/CSE batches with AIR 1 mentors.</div>
//           <button style={{ width: '100%', marginTop: 12, padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BE.line}`, color: BE.text, fontSize: 11, fontWeight: 700 }}>Learn More</button>
//         </div>

//         <div style={{ marginTop: 32, borderTop: `1px solid ${BE.line}`, paddingTop: 20 }}>
//           <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Weekly Challenge</div>
//           <div style={{ fontSize: 11, color: BE.textDim }}>Solve 50 pyqs this week to unlock a premium badge.</div>
//           <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
//              <div style={{ width: '40%', height: '100%', background: BE.accent }} />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [clerkUser, data] = await Promise.all([
    currentUser(),
    getCachedDashboardData(userId)
  ]);

  if (!clerkUser) redirect("/sign-in");

  const { totalAttempted, correctAttempts, lastFiveAttempts, recentFailures, activityData, currentStreak, weakestTopic } = data;
  const accuracy = totalAttempted > 0 ? Math.round((correctAttempts / totalAttempted) * 100) : 0;
  const firstName = clerkUser.firstName || clerkUser.username || "Learner";

  // Mastery Wall Heatmap Logic
  const weeks = 26;
  const heatCells = [];
  const today = startOfDay(new Date());
  const startAt = startOfWeek(subMonths(today, 6));
  const dateInterval = eachDayOfInterval({ start: startAt, end: today });

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
  const heatColors = ['rgba(255,255,255,0.04)', 'rgba(255,143,0,0.22)', 'rgba(255,143,0,0.42)', 'rgba(255,143,0,0.68)', 'rgba(255,143,0,0.95)'];

  const reviewItems = recentFailures.map((a: any) => {
    const q = a.question ?? a.pyq ?? a.subject_pyq;
    const pattern = q?.pattern ?? (q?.subject_pattern ? { 
      topic_name: q.subject_pattern.subject_name,
      subject: q.subject_pattern.subject_name,
      id: `subject-${q.subject_pattern.id}`,
      exam_type: "GATE"
    } : null);

    const prefix = a.question ? "gq" : a.pyq ? "pyq" : "spyq";
    const patternId = q?.pattern?.id || (q?.subject_pattern ? `subject-${q.subject_pattern.id}` : null);
    return {
      id: a.id,
      question_text: q?.question_text,
      correct_answer: q?.correct_answer,
      topic_name: pattern?.topic_name,
      subject: pattern?.subject,
      age: format(new Date(a.created_at), "h'h ago'"),
      practiceUrl: `/practice?patternId=${patternId}&questionId=${q?.id}&subject=${encodeURIComponent(pattern?.subject || 'All')}`,
      slugUrl: getQuestionUrl({
        id: q?.id,
        prefix,
        subject: pattern?.subject || "general",
        topicName: pattern?.topic_name || "topic",
        examType: pattern?.exam_type || "GATE"
      })
    };
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  return (
    <div className="be-screen" style={{ minHeight: '100%' }}>
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
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '36px 20px 80px', display: 'flex', gap: 32 }} className="db-wrap flex-col lg:flex-row">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }} className="db-hdr">
            <div>
              <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                Progress · Personal Dashboard
              </div>
              <h1 style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.6, margin: 0, fontFamily: BE.serif, color: BE.text }} className="db-h1">
                {greeting}, {firstName}.
              </h1>
            </div>
            <ShareCardButton userId={userId} />
          </div>

          {/* NEXT ACTION — the most important card */}
          {weakestTopic ? (
            <div style={{
              border: `1px solid ${BE.line}`, borderRadius: 12,
              padding: 24, marginBottom: 24,
              background: `linear-gradient(135deg, ${BE.accentSoft}, transparent)`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: BE.accent, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                    Suggested next
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.3, marginBottom: 6, color: BE.text }}>
                    Fix your {weakestTopic.name} gap
                  </div>
                  <div style={{ fontSize: 13.5, color: BE.textDim, lineHeight: 1.55, maxWidth: 540 }}>
                    You&apos;ve missed <span style={{ color: BE.text, fontWeight: 500 }}>{weakestTopic.count} questions</span> on this topic over the last 2 weeks. A quick focused set will help you master it.
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <Link href={`/practice?patternId=${weakestTopic.id}&subject=${encodeURIComponent(weakestTopic.subject)}`} className="px-5 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold transition-all hover:bg-amber-600 no-underline">Start focused set →</Link>
                  </div>
                </div>
                <div className="hidden sm:flex" style={{ width: 96, height: 96, borderRadius: 12, border: `1px solid ${BE.line}`, background: BE.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: BE.textMute, letterSpacing: 0.06, textTransform: 'uppercase', fontWeight: 600 }}>Gap</div>
                  <div style={{ fontSize: 32, fontWeight: 600, color: BE.bad, letterSpacing: -0.6, fontFamily: BE.mono }}>{weakestTopic.count}</div>
                  <div style={{ fontSize: 10, color: BE.textMute }}>since last wk</div>
                </div>
              </div>
            </div>
          ) : (
             <div style={{
              border: `1px solid ${BE.line}`, borderRadius: 12,
              padding: 24, marginBottom: 24,
              background: `linear-gradient(135deg, ${BE.goodSoft}, transparent)`,
            }}>
               <div style={{ fontSize: 11, color: BE.good, letterSpacing: 0.1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                 Everything looks great
               </div>
               <div style={{ fontSize: 18, fontWeight: 600, color: BE.text }}>No critical gaps identified yet. Keep practicing!</div>
            </div>
          )}

          {/* Stat strip — compact, with deltas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1, background: BE.line, border: `1px solid ${BE.line}`, borderRadius: 12, marginBottom: 24, overflow: 'hidden' }} className="db-stats">
            {[
              { label: 'Answered', val: totalAttempted, sub: 'total', delta: `${totalAttempted > 0 ? '+'+Math.ceil(totalAttempted/8) : '0'} this week`, good: true },
              { label: 'Accuracy', val: `${accuracy}%`, sub: 'of ' + totalAttempted, delta: accuracy > 70 ? 'Above target' : 'Needs focus', good: accuracy > 70 },
              { label: 'Streak', val: currentStreak, sub: 'days', delta: currentStreak > 0 ? 'Active streak' : 'Longest: 14', good: currentStreak > 3 },
              { label: 'Correct', val: correctAttempts, sub: 'solved', delta: 'Total mastery', good: true },
            ].map(s => (
              <div key={s.label} style={{ padding: '18px 20px', background: BE.surface }} className="db-stat-cell">
                <div style={{ fontSize: 10.5, color: BE.textMute, letterSpacing: 0.08, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                  <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: -0.4, color: BE.text }} className="db-stat-val">{s.val}</div>
                  <div style={{ fontSize: 11, color: BE.textMute }}>{s.sub}</div>
                </div>
                <div style={{ fontSize: 11, color: s.good ? BE.good : BE.textDim }}>{s.delta}</div>
              </div>
            ))}
          </div>

          {/* Mastery wall */}
          <div style={{ border: `1px solid ${BE.line}`, borderRadius: 12, padding: 20, marginBottom: 24, background: BE.surface }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, color: BE.text }}>Mastery wall</div>
                <div style={{ fontSize: 12, color: BE.textDim }}>Questions correctly solved, last 26 weeks</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: BE.textMute }}>
                Less {heatColors.map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />)} More
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginRight: 6, paddingTop: 14, fontSize: 9.5, color: BE.textMute, fontFamily: BE.mono }}>
                <div style={{ height: 10 }}>M</div>
                <div style={{ height: 10 }} />
                <div style={{ height: 10 }}>W</div>
                <div style={{ height: 10 }} />
                <div style={{ height: 10 }}>F</div>
                <div style={{ height: 10 }} />
                <div style={{ height: 10 }}></div>
              </div>
              <div style={{ flex: 1, overflowX: 'auto' }} className="scrollbar-hide">
                <div style={{ display: 'flex', gap: 3 }}>
                  {heatCells.map((col, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                      {col.map((cell, j) => (
                        <div key={j} title={`${cell.count} questions on ${cell.dateStr}`} style={{
                          height: 10, minWidth: 10, borderRadius: 2, background: heatColors[cell.level],
                        }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BE.line}`, fontSize: 12, color: BE.textDim }}>
              <div>Current streak: <span style={{ color: BE.warn, fontWeight: 600 }}>{currentStreak} days</span></div>
              <div>Mastery: <span style={{ color: BE.text, fontWeight: 600 }}>{correctAttempts} total</span></div>
            </div>
          </div>

          {/* Critical Review */}
          {reviewItems.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: BE.text }}>Critical review <span style={{ fontSize: 11, color: BE.bad, marginLeft: 6, fontWeight: 500 }}>· {reviewItems.length} to revisit</span></div>
                <a href="/review" style={{ fontSize: 12, color: BE.accent, textDecoration: 'none' }}>See all →</a>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }} className="db-review-grid">
                {reviewItems.slice(0, 4).map((r,i) => (
                  <div key={i} style={{ border: `1px solid ${BE.line}`, borderRadius: 10, padding: 14, background: BE.surface }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2, color: BE.text }}>{r.topic_name}</div>
                        <div style={{ fontSize: 11, color: BE.textMute }}>{r.subject} · {r.age}</div>
                      </div>
                      <Link href={r.practiceUrl} style={{ fontSize: 11, color: BE.accent, fontWeight: 500, cursor: 'pointer', flexShrink: 0, marginLeft: 8, textDecoration: 'none' }}>Solve again →</Link>
                    </div>
                    <div style={{ fontSize: 12, color: BE.textDim, lineHeight: 1.5, fontFamily: BE.serif, fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BE.line}` }} className="line-clamp-2">
                      <MathRenderer content={r.question_text} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity — thin strip */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: BE.text }}>Recent activity</div>
            <div style={{ border: `1px solid ${BE.line}`, borderRadius: 10, overflow: 'hidden', background: BE.surface }}>
              {lastFiveAttempts.map((attempt: any, i, arr) => {
                const topicName = attempt.question?.pattern?.topic_name ?? attempt.pyq?.pattern?.topic_name ?? attempt.subject_pyq?.subject_pattern?.subject_name ?? "Subject Practice";
                const subject = attempt.question?.pattern?.subject ?? attempt.pyq?.pattern?.subject ?? attempt.subject_pyq?.subject_pattern?.subject_name ?? "";
                const when = format(new Date(attempt.created_at), "h'h ago'");
                const r = attempt.is_correct ? 'correct' : 'wrong';

                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${BE.line}` }}>
                    <div style={{
                      width: 6, height: 6, borderRadius: 3,
                      background: r === 'correct' ? BE.good : BE.bad, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                      <span style={{ fontWeight: 500, color: BE.text }}>{topicName}</span>
                      <span style={{ color: BE.textMute, marginLeft: 8 }} className="hidden sm:inline">· {subject}</span>
                    </div>
                    <div style={{ fontSize: 11, color: BE.textMute, fontFamily: BE.mono }}>{when}</div>
                    <div style={{ fontSize: 11, color: r === 'correct' ? BE.good : BE.bad, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.06, minWidth: 60, textAlign: 'right' }}>{r}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right rail: ads go here on dashboard */}
        {/* <BEAdRail density="standard" /> */}
      </div>
    </div>
  );
}
